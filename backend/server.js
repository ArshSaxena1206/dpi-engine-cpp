// ═══════════════════════════════════════════════════════════════════════════════
//  DPI Engine — Backend Server v2.0
//  Express + Socket.io + Bull + SQLite + Zod + Winston + Swagger
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Imports ─────────────────────────────────────────────────────────────────
const express      = require('express');
const http         = require('http');
const { Server: SocketServer } = require('socket.io');
const multer       = require('multer');
const cors         = require('cors');
const { exec }     = require('child_process');
const path         = require('path');
const fs           = require('fs');
const os           = require('os');
const Queue        = require('bull');
const { z }        = require('zod');
const sanitize     = require('sanitize-filename');
const rateLimit    = require('express-rate-limit');
const winston      = require('winston');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi    = require('swagger-ui-express');
const { stmts, formatRule } = require('./db');
const { createPacketJob, handleOutput, generateReport } = require('./jobs/packetJob');

// ─── Winston Logger ──────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} ${level}: ${message}${extra}`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'server.log'),
      format: winston.format.json(),
    }),
  ],
});

// ─── Ensure Directories ──────────────────────────────────────────────────────
['uploads', 'output'].forEach((d) => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ─── Express + HTTP + Socket.io ──────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new SocketServer(server, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'], methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'] }));
app.use(express.json());

// ─── Multer (file filter + size limit) ───────────────────────────────────────
const ALLOWED_EXTS = ['.pcap', '.pcapng'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.includes(ext)) return cb(null, true);
    cb(new Error('Only .pcap and .pcapng files are accepted'));
  },
});

// ─── Rate Limiter (upload route only) ────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many upload requests. Max 20 per minute.', details: null },
  },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many generate requests. Max 5 per minute.', details: null },
  },
});

// ─── Swagger / OpenAPI ───────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'DPI Engine API', version: '2.0.0', description: 'Deep Packet Inspection Engine REST API' },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      schemas: {
        Rule: {
          type: 'object',
          properties: {
            id:         { type: 'integer', example: 1 },
            type:       { type: 'string', enum: ['app', 'domain', 'ip'], example: 'app' },
            value:      { type: 'string', example: 'YouTube' },
            enabled:    { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        RuleInput: {
          type: 'object',
          required: ['type', 'value', 'enabled'],
          properties: {
            type:    { type: 'string', enum: ['app', 'domain', 'ip'] },
            value:   { type: 'string', minLength: 1 },
            enabled: { type: 'boolean' },
          },
        },
        Stats: {
          type: 'object',
          properties: {
            metrics: {
              type: 'object',
              properties: {
                totalPackets: { type: 'integer' },
                forwarded:    { type: 'integer' },
                dropped:      { type: 'integer' },
                activeFlows:  { type: 'integer' },
              },
            },
            apps:    { type: 'array', items: { type: 'object' } },
            domains: { type: 'array', items: { type: 'object' } },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code:    { type: 'string' },
                message: { type: 'string' },
                details: {},
              },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, 'server.js')],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Bull Job Queue ──────────────────────────────────────────────────────────
const pcapQueue = new Queue('pcap-processing', {
  redis: { host: '127.0.0.1', port: 6379 },
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 50 },
});

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const ruleSchema = z.object({
  type:    z.enum(['app', 'domain', 'ip']),
  value:   z.string().min(1, 'Value must not be empty'),
  enabled: z.boolean(),
});

const generateSchema = z.object({
  packetCount: z.number().int().min(100).max(10000).default(500),
  protocols: z.array(
    z.enum(['http', 'https', 'dns', 'quic'])
  ).min(1, 'Select at least one protocol'),
  domains: z.array(z.string()).optional().default([
    'youtube.com', 'google.com', 'github.com'
  ]),
  ipRange: z.string().optional().default('192.168.1.0/24')
});

// Validation middleware factory
function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next({ status: 400, code: 'VALIDATION_ERROR', message: 'Invalid request body', details });
    }
    req.validated = result.data;
    next();
  };
}

// ─── In-Memory Latest Stats (also persisted to SQLite periodically) ──────────
let latestStats = {
  metrics: { totalPackets: 0, forwarded: 0, dropped: 0, activeFlows: 0 },
  apps: [],
  domains: [],
};

// ─── Extracted logic to backend/jobs/packetJob.js ─────────────────────────

// ─── Bull Queue Processor ────────────────────────────────────────────────────
pcapQueue.process(async (job) => {
  const { inputPath, outputPath, outputFilename } = job.data;
  logger.info('Job started', { jobId: job.id, outputFilename });

  // Emit initial progress
  io.emit('job:progress', { jobId: job.id, progress: 10, stage: 'Starting DPI engine' });

  // Build CLI args from enabled rules in SQLite
  const rules = stmts.getEnabledRules.all();
  const enginePath = path.resolve(__dirname, '../dpi_engine.exe');
  let cmdArgs = `"${enginePath}" "${inputPath}" "${outputPath}"`;

  rules.forEach((r) => {
    const flag = r.type === 'ip' ? '--block-ip' : r.type === 'app' ? '--block-app' : '--block-domain';
    cmdArgs += ` ${flag} "${r.value}"`;
  });

  logger.debug('Executing engine', { cmd: cmdArgs });
  io.emit('job:progress', { jobId: job.id, progress: 30, stage: 'Processing packets' });

  return new Promise((resolve, reject) => {
    exec(cmdArgs, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Clean up uploaded temp file
      fs.unlink(inputPath, (err) => { if (err) logger.warn('Temp file cleanup failed', { inputPath, err: err.message }); });

      if (error) {
        logger.error('Engine execution failed', { jobId: job.id, error: error.message, stderr });
        io.emit('job:progress', { jobId: job.id, progress: 100, stage: 'Failed' });
        return reject(new Error(stderr || error.message));
      }

      io.emit('job:progress', { jobId: job.id, progress: 80, stage: 'Parsing results' });

      const parsed = handleOutput(stdout);
      generateReport(parsed);
      parsed.rawOutput = stdout;
      latestStats = parsed;

      // Persist stats snapshot
      stmts.insertStats.run(parsed.metrics.forwarded, parsed.metrics.dropped, parsed.metrics.totalPackets);

      io.emit('job:progress', { jobId: job.id, progress: 100, stage: 'Complete' });
      io.emit('job:done', { jobId: job.id, stats: latestStats, outputFile: outputFilename });
      logger.info('Job completed', { jobId: job.id, total: parsed.metrics.totalPackets });

      resolve({ stats: parsed, outputFile: outputFilename });
    });
  });
});

pcapQueue.on('failed', (job, err) => {
  logger.error('Queue job failed', { jobId: job.id, error: err.message });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });
  // Send current stats immediately on connect
  socket.emit('stats:update', latestStats);
  socket.on('disconnect', () => logger.debug('WebSocket client disconnected', { socketId: socket.id }));
});

// Broadcast latest stats every 2 seconds
setInterval(() => { io.emit('stats:update', latestStats); }, 2000);

// Persist stats snapshot to SQLite every 10 seconds
setInterval(() => {
  const m = latestStats.metrics;
  if (m.totalPackets > 0) {
    stmts.insertStats.run(m.forwarded, m.dropped, m.totalPackets);
    logger.debug('Stats snapshot persisted');
  }
}, 10000);

// ═════════════════════════════════════════════════════════════════════════════
//  API Routes  (prefix: /api/v1)
// ═════════════════════════════════════════════════════════════════════════════
const router = express.Router();

// ──────────────── Rules CRUD ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/rules:
 *   get:
 *     tags: [Rules]
 *     summary: List all blocking rules
 *     responses:
 *       200:
 *         description: Array of rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rule'
 */
router.get('/rules', (_req, res) => {
  const rows = stmts.getAllRules.all().map(formatRule);
  res.json({ success: true, data: rows });
});

/**
 * @swagger
 * /api/v1/rules:
 *   post:
 *     tags: [Rules]
 *     summary: Create a new blocking rule
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleInput'
 *     responses:
 *       201:
 *         description: Rule created
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/rules', validate(ruleSchema), (req, res) => {
  const { type, value, enabled } = req.validated;
  const info = stmts.insertRule.run(type, value, enabled ? 1 : 0);
  const created = formatRule(stmts.getRuleById.get(info.lastInsertRowid));
  logger.info('Rule created', { rule: created });
  res.status(201).json({ success: true, data: created });
});

/**
 * @swagger
 * /api/v1/rules/{id}:
 *   put:
 *     tags: [Rules]
 *     summary: Update an existing rule
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleInput'
 *     responses:
 *       200:
 *         description: Rule updated
 *       404:
 *         description: Rule not found
 */
router.put('/rules/:id', validate(ruleSchema), (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const existing = stmts.getRuleById.get(id);
  if (!existing) return next({ status: 404, code: 'NOT_FOUND', message: `Rule ${id} not found` });

  const { type, value, enabled } = req.validated;
  stmts.updateRule.run(type, value, enabled ? 1 : 0, id);
  const updated = formatRule(stmts.getRuleById.get(id));
  logger.info('Rule updated', { rule: updated });
  res.json({ success: true, data: updated });
});

/**
 * @swagger
 * /api/v1/rules/{id}:
 *   delete:
 *     tags: [Rules]
 *     summary: Delete a rule
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rule deleted
 *       404:
 *         description: Rule not found
 */
router.delete('/rules/:id', (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const existing = stmts.getRuleById.get(id);
  if (!existing) return next({ status: 404, code: 'NOT_FOUND', message: `Rule ${id} not found` });

  stmts.deleteRule.run(id);
  logger.info('Rule deleted', { ruleId: id });
  res.json({ success: true, data: { id } });
});

// ──────────────── Stats ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/stats:
 *   get:
 *     tags: [Stats]
 *     summary: Get latest engine stats
 *     responses:
 *       200:
 *         description: Current stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Stats'
 */
router.get('/stats', (_req, res) => {
  res.json({ success: true, data: latestStats });
});

/**
 * @swagger
 * /api/v1/stats/history:
 *   get:
 *     tags: [Stats]
 *     summary: Get historical stats snapshots
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Array of stats snapshots
 */
router.get('/stats/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const rows = stmts.getStatsHistory.all(limit);
  res.json({ success: true, data: rows });
});

// ──────────────── Upload (PCAP Processing) ───────────────────────────────────

/**
 * DATA FLOW ARCHITECTURE:
 * 
 * [Frontend (Upload.tsx)]
 *           │
 *           ▼ POST /api/v1/upload
 *           │
 * [Backend (server.js - Express)]
 *           │
 *           ▼ spawn process
 *           │
 * [C++ Engine (dpi_engine.exe)]
 * 
 * @swagger
 * /api/v1/upload:
 *   post:
 *     tags: [Processing]
 *     summary: Upload a PCAP file for DPI processing
 *     description: Queues the file for processing. Returns a jobId to track via WebSocket.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pcapFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       202:
 *         description: Job queued
 *       400:
 *         description: No file or invalid file type
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/upload', uploadLimiter, upload.single('pcapFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next({ status: 400, code: 'NO_FILE', message: 'No PCAP file uploaded' });
    }

    const safeName = sanitize(req.file.originalname) || 'upload';
    const outputFilename = `filtered_${Date.now()}_${safeName}`;
    const outputPath = path.join(__dirname, 'output', outputFilename);

    const job = await createPacketJob(
      pcapQueue,
      req.file.path,
      outputPath,
      outputFilename,
      safeName
    );

    logger.info('PCAP upload queued', { jobId: job.id, originalName: safeName });

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        message: 'PCAP file queued for processing. Track progress via WebSocket job:progress event.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────── Download ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/download/{filename}:
 *   get:
 *     tags: [Processing]
 *     summary: Download a filtered PCAP file
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File download
 *       404:
 *         description: File not found
 */
router.get('/download/:filename', (req, res, next) => {
  const safeName = sanitize(req.params.filename);
  if (!safeName) return next({ status: 400, code: 'INVALID_FILENAME', message: 'Invalid filename' });

  const outputFilePath = path.join(__dirname, 'output', safeName);
  const uploadsFilePath = path.join(__dirname, 'uploads', safeName);

  if (fs.existsSync(outputFilePath)) {
    return res.download(outputFilePath);
  } else if (fs.existsSync(uploadsFilePath)) {
    return res.download(uploadsFilePath);
  } else {
    return next({ status: 404, code: 'FILE_NOT_FOUND', message: 'Output file not found' });
  }
});

// ──────────────── Generate (PCAP Synthesis) ──────────────────────────────────

/**
 * DATA FLOW ARCHITECTURE:
 * 
 * [Frontend (Generate.tsx)]
 *           │
 *           ▼ POST /api/v1/generate
 *           │
 * [Backend (server.js - Express)]
 *           │
 *           ▼ spawn python
 *           │
 * [generate_test_pcap.py]
 * 
 * @swagger
 * /api/v1/generate:
 *   post:
 *     tags: [Processing]
 *     summary: Generate a synthetic PCAP file
 *     description: Runs a Python script to generate a PCAP file and queues it for processing. Returns a jobId to track via WebSocket.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packetCount:
 *                 type: integer
 *               protocols:
 *                 type: array
 *                 items:
 *                   type: string
 *               domains:
 *                 type: array
 *                 items:
 *                   type: string
 *               ipRange:
 *                 type: string
 *     responses:
 *       202:
 *         description: Job queued
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Generation failed
 */
router.post('/generate', generateLimiter, validate(generateSchema), (req, res, next) => {
  const { packetCount, protocols, domains, ipRange } = req.validated;
  const filename = `generated_${Date.now()}.pcap`;
  const outputPath = path.join(__dirname, 'uploads', filename);

  const genJobId = 'gen_' + Date.now();
  io.emit('job:progress', { jobId: genJobId, progress: 0, stage: 'Initializing generator...' });

  setTimeout(() => {
    io.emit('job:progress', { jobId: genJobId, progress: 40, stage: 'Generating packets...' });
  }, 500);

  setTimeout(() => {
    io.emit('job:progress', { jobId: genJobId, progress: 80, stage: 'Writing PCAP file...' });
  }, 1500);

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const args = [
    path.join(__dirname, '..', 'generate_test_pcap.py'),
    '--output', outputPath,
    '--count', packetCount.toString(),
    '--protocols', protocols.join(','),
    '--domains', domains.join(','),
    '--ip-range', ipRange
  ];

  const { spawn } = require('child_process');
  const pyProcess = spawn(pythonCmd, args);

  pyProcess.on('error', (err) => {
    logger.error('Failed to start python process', { error: err.message });
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { code: 'GENERATION_FAILED', message: 'Failed to start generator', details: err.message } });
    }
  });

  let stderr = '';
  pyProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  pyProcess.on('close', async (code) => {
    if (code === 0) {
      try {
        const safeName = 'generated_pcap';
        const finalOutputFilename = `filtered_${Date.now()}_${safeName}.pcap`;
        const finalOutputPath = path.join(__dirname, 'output', finalOutputFilename);

        let jobId = genJobId;

        if (pcapQueue.client.status === 'ready') {
          const job = await createPacketJob(
            pcapQueue,
            outputPath,
            finalOutputPath,
            finalOutputFilename,
            safeName
          );
          jobId = job.id;
          logger.info('PCAP generation queued', { jobId, originalName: safeName });
        } else {
          logger.warn('Redis is down, skipping queue. Returning generated file path.');
          setTimeout(() => {
             io.emit('job:done', { jobId: genJobId, stats: latestStats, outputFile: filename });
          }, 1000);
        }

        res.status(202).json({
          success: true,
          data: {
            jobId,
            filename
          }
        });
      } catch (err) {
        next(err);
      }
    } else {
      logger.error('Generation failed', { code: 'GENERATION_FAILED', stderr });
      res.status(500).json({
        success: false,
        error: { code: 'GENERATION_FAILED', message: 'Failed to generate PCAP', details: stderr }
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LIVE CAPTURE — Infrastructure
// ─────────────────────────────────────────────────────────────────────────────

/** Map of active capture sessions: sessionId → session metadata */
const activeSessions = new Map();

/** 30-second cache for the interface list to avoid repeated Python spawns */
let interfaceCache = null;
let interfaceCacheTime = 0;
const INTERFACE_CACHE_TTL = 30_000;

/** Rate limiter: POST /api/v1/capture/start — max 3/min (captures are expensive) */
const captureLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many capture requests. Max 3 per minute.', details: null },
  },
});

/** Rate limiter: GET /api/v1/capture/interfaces — max 10/min */
const interfacesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many interface queries. Max 10 per minute.', details: null },
  },
});

/** Zod schema for POST /api/v1/capture/start */
const captureSchema = z.object({
  interface:   z.string().min(1, 'Interface required'),
  duration:    z.number().int().refine(v => [30, 60, 300].includes(v), {
    message: 'Duration must be 30, 60, or 300 seconds',
  }),
  filter:      z.string().optional().default(''),
  autoAnalyze: z.boolean().default(true),
});

/**
 * Internal helper — check npcap installation.
 * Returns { installed: boolean, path: string|null }
 */
function checkNpcapInstalled() {
  const npcapDir   = 'C:\\Windows\\System32\\Npcap';
  const wpcapDll   = 'C:\\Windows\\SysWOW64\\wpcap.dll';
  const wpcapSys32 = 'C:\\Windows\\System32\\wpcap.dll';
  if (fs.existsSync(npcapDir)) {
    return { installed: true, path: npcapDir };
  }
  if (fs.existsSync(wpcapDll) || fs.existsSync(wpcapSys32)) {
    return { installed: true, path: wpcapDll };
  }
  return { installed: false, path: null };
}

/**
 * Internal helper — resolve python command ('python' → 'python3' fallback).
 * Returns the command string that works, or 'python' if both fail.
 */
async function resolvePythonCmd() {
  return new Promise((resolve) => {
    exec('python --version', (err) => {
      if (!err) return resolve('python');
      exec('python3 --version', (err2) => {
        resolve(err2 ? 'python' : 'python3');
      });
    });
  });
}

/**
 * Internal helper — handle a completed capture (natural end or manual stop).
 * Feeds output into Bull if autoAnalyze; emits capture:complete either way.
 */
async function handleCaptureCompletion(sessionId, doneData) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const { outputPath, outputFilename, autoAnalyze } = session;

  if (autoAnalyze) {
    try {
      const finalOutputFilename = `filtered_${Date.now()}_captured.pcap`;
      const finalOutputPath     = path.join(__dirname, 'output', finalOutputFilename);
      const job = await createPacketJob(pcapQueue, outputPath, finalOutputPath, finalOutputFilename, 'live_capture');
      io.emit('capture:complete', { sessionId, autoAnalyze: true, jobId: job.id });
      logger.info('Capture queued for analysis', { sessionId, jobId: job.id });
    } catch (err) {
      logger.error('Failed to queue captured PCAP', { sessionId, error: err.message });
      io.emit('capture:error', { sessionId, message: 'Failed to queue for analysis: ' + err.message });
    }
  } else {
    io.emit('capture:complete', {
      sessionId,
      autoAnalyze: false,
      downloadPath: outputFilename,
    });
  }

  activeSessions.delete(sessionId);
}

// ─── Capture Routes ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/capture/check-npcap:
 *   get:
 *     tags: [Capture]
 *     summary: Check if npcap is installed on the host
 *     responses:
 *       200:
 *         description: npcap installation status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     installed:
 *                       type: boolean
 *                     path:
 *                       type: string
 *                       nullable: true
 */
router.get('/capture/check-npcap', (_req, res) => {
  const result = checkNpcapInstalled();
  res.json({ success: true, data: result });
});

/**
 * @swagger
 * /api/v1/capture/interfaces:
 *   get:
 *     tags: [Capture]
 *     summary: List available network interfaces
 *     responses:
 *       200:
 *         description: Array of network interfaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:          { type: string }
 *                       name:        { type: string }
 *                       description: { type: string }
 *                       ipAddress:   { type: string }
 *                       isUp:        { type: boolean }
 *       503:
 *         description: Could not enumerate interfaces
 */
router.get('/capture/interfaces', interfacesLimiter, async (_req, res, next) => {
  // Serve from cache if fresh
  if (interfaceCache && Date.now() - interfaceCacheTime < INTERFACE_CACHE_TTL) {
    return res.json({ success: true, data: interfaceCache });
  }

  try {
    const pythonCmd = await resolvePythonCmd();

    // Use python to map NPF GUIDs to friendly Windows names (e.g., Wi-Fi, Ethernet)
    const cmd = `${pythonCmd} -c "from scapy.all import get_if_list; from scapy.arch.windows import get_windows_if_list; import json; win_ifs=get_windows_if_list(); g2n={i.get('guid','').lower(): i.get('name','') for i in win_ifs}; res=[{'id':s, 'name': 'Loopback (Localhost)' if 'Loopback' in s else g2n.get(s[s.find('{'):s.find('}')+1].lower(), s)} for s in get_if_list()]; print(json.dumps(res))"`;

    const mappedInterfaces = await new Promise((resolve) => {
      exec(cmd, { timeout: 10_000 }, (err, stdout) => {
        if (err) return resolve([]);
        try { resolve(JSON.parse(stdout.trim())); } catch { resolve([]); }
      });
    });

    // Node os.networkInterfaces() gives IPs and Up/Down status mapped by friendly name
    const nodeIfaces = os.networkInterfaces();
    const friendlyMap = {};
    for (const [name, addrs] of Object.entries(nodeIfaces)) {
      if (!addrs) continue;
      const ipv4 = addrs.find(a => a.family === 'IPv4');
      friendlyMap[name.toLowerCase()] = {
        name,
        ipAddress: ipv4 ? ipv4.address : '',
        isUp:      addrs.some(a => !a.internal),
      };
    }

    // Merge Python's GUID mapping with Node.js IP/Status info
    const merged = mappedInterfaces.map(iface => {
      const nodeInfo = friendlyMap[iface.name.toLowerCase()];
      return {
        id:          iface.id,
        name:        iface.name,
        description: iface.id,
        ipAddress:   nodeInfo ? nodeInfo.ipAddress : '',
        isUp:        nodeInfo ? nodeInfo.isUp : true,
      };
    });

    interfaceCache     = merged;
    interfaceCacheTime = Date.now();
    res.json({ success: true, data: merged });
  } catch (err) {
    next({ status: 503, code: 'INTERFACE_ERROR', message: 'Failed to enumerate interfaces', details: err.message });
  }
});

/**
 * @swagger
 * /api/v1/capture/start:
 *   post:
 *     tags: [Capture]
 *     summary: Start a live packet capture session
 *     description: >
 *       Spawns capture_live.py. Returns immediately with a sessionId.
 *       Track progress via WebSocket events capture:stats / capture:complete / capture:error.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [interface, duration]
 *             properties:
 *               interface:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 enum: [30, 60, 300]
 *               filter:
 *                 type: string
 *               autoAnalyze:
 *                 type: boolean
 *     responses:
 *       202:
 *         description: Capture started
 *       400:
 *         description: Validation error or npcap not installed
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/capture/start', captureLimiter, validate(captureSchema), async (req, res, next) => {
  const { interface: iface, duration, filter: bpfFilter, autoAnalyze } = req.validated;

  // Check npcap
  const npcap = checkNpcapInstalled();
  if (!npcap.installed) {
    return next({ status: 400, code: 'NPCAP_NOT_FOUND', message: 'npcap is not installed on this machine' });
  }

  const sessionId      = `capture_${Date.now()}`;
  const outputFilename = `capture_${Date.now()}.pcap`;
  const outputPath     = path.join(__dirname, 'uploads', outputFilename);
  const scriptPath     = path.join(__dirname, '..', 'capture_live.py');

  let pythonCmd;
  try {
    pythonCmd = await resolvePythonCmd();
  } catch {
    pythonCmd = 'python';
  }

  const args = [
    scriptPath,
    '--output',    outputPath,
    '--duration',  String(duration),
    '--interface', iface,
    '--stats-interval', '1',
  ];
  if (bpfFilter) args.push('--filter', bpfFilter);

  const { spawn } = require('child_process');
  const pyProcess = spawn(pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  // Store session immediately so stop can find it
  activeSessions.set(sessionId, {
    process:        pyProcess,
    startTime:      Date.now(),
    interface:      iface,
    duration,
    outputPath,
    outputFilename,
    autoAnalyze,
    completed:      false,
  });

  logger.info('Capture session started', { sessionId, iface, duration, autoAnalyze });

  // ── Parse stdout lines ──────────────────────────────────────────────────────
  let stdoutBuf = '';
  pyProcess.stdout.on('data', (chunk) => {
    stdoutBuf += chunk.toString();
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop(); // keep incomplete last line in buffer
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let msg;
      try { msg = JSON.parse(trimmed); } catch { continue; }

      if (msg.type === 'stats') {
        const elapsed = msg.elapsed || 0;
        const prevPkt  = msg.packets - (msg.pps || 0);
        io.emit('capture:stats', {
          sessionId,
          packets: msg.packets,
          bytes:   msg.bytes,
          elapsed,
          pps:     msg.pps || 0,
        });
      } else if (msg.type === 'done') {
        const session = activeSessions.get(sessionId);
        if (session && !session.completed) {
          session.completed = true;
          handleCaptureCompletion(sessionId, msg).catch(err => {
            logger.error('Completion handler failed', { sessionId, error: err.message });
          });
        }
      } else if (msg.type === 'error') {
        logger.error('Capture process error', { sessionId, message: msg.message });
        io.emit('capture:error', { sessionId, message: msg.message });
        activeSessions.delete(sessionId);
      }
    }
  });

  let stderrBuf = '';
  pyProcess.stderr.on('data', (d) => { stderrBuf += d.toString(); });

  pyProcess.on('error', (err) => {
    logger.error('Failed to start capture process', { sessionId, error: err.message });
    io.emit('capture:error', { sessionId, message: `Failed to start capture: ${err.message}` });
    activeSessions.delete(sessionId);
  });

  pyProcess.on('close', (code) => {
    const session = activeSessions.get(sessionId);
    if (session && !session.completed) {
      // Process exited without printing 'done' — treat as error
      if (code !== 0) {
        logger.error('Capture process exited with error', { sessionId, code, stderr: stderrBuf });
        io.emit('capture:error', { sessionId, message: stderrBuf || `Capture exited with code ${code}` });
        activeSessions.delete(sessionId);
      }
    }
  });

  // Respond immediately
  res.status(202).json({
    success: true,
    data: { sessionId, outputPath },
  });
});

/**
 * @swagger
 * /api/v1/capture/stop:
 *   post:
 *     tags: [Capture]
 *     summary: Manually stop an active capture session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId]
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Capture stopped
 *       404:
 *         description: Session not found
 */
router.post('/capture/stop', async (req, res, next) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return next({ status: 400, code: 'MISSING_SESSION_ID', message: 'sessionId is required' });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return next({ status: 404, code: 'SESSION_NOT_FOUND', message: `Capture session ${sessionId} not found` });
  }

  logger.info('Manually stopping capture session', { sessionId });

  // Mark completed before killing so the close handler doesn't emit error
  session.completed = true;

  try {
    session.process.kill();
  } catch (e) {
    logger.warn('Could not kill capture process', { sessionId, error: e.message });
  }

  // Trigger completion logic (write whatever was captured so far)
  await handleCaptureCompletion(sessionId, {}).catch(err => {
    logger.error('Stop completion handler failed', { sessionId, error: err.message });
  });

  res.json({ success: true, data: { sessionId, stopped: true } });
});

// ─── Session cleanup on client disconnect ─────────────────────────────────────
io.on('connection', (socket) => {
  // (existing connect logic is already wired above — this adds cleanup)
  socket.on('disconnect', () => {
    logger.info('WebSocket disconnected — cleaning up active captures', { socketId: socket.id });
    for (const [sessionId, session] of activeSessions.entries()) {
      try {
        session.process.kill();
        logger.info('Killed capture session on disconnect', { sessionId });
      } catch (e) { /* already dead */ }
    }
    activeSessions.clear();
  });
});

// Mount router
app.use('/api/v1', router);

// ═════════════════════════════════════════════════════════════════════════════
//  Global Error Handling Middleware
// ═════════════════════════════════════════════════════════════════════════════
app.use((err, _req, res, _next) => {
  // Multer-specific errors (file too large, wrong type)
  if (err.code === 'LIMIT_FILE_SIZE') {
    err = { status: 400, code: 'FILE_TOO_LARGE', message: `Max file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, details: null };
  }

  const status  = err.status || 500;
  const code    = err.code   || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || null;

  if (status >= 500) logger.error(message, { code, details, stack: err.stack });
  else               logger.warn(message, { code, details });

  res.status(status).json({
    success: false,
    error: { code, message, details },
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  Start Server
// ═════════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`DPI Engine backend running on http://localhost:${PORT}`);
    logger.info(`Swagger docs available at http://localhost:${PORT}/api/docs`);
    logger.info(`WebSocket server attached on port ${PORT}`);
  });
}

module.exports = { app, server, io };

// Graceful shutdown — kill all active capture sessions first
function gracefulShutdown(signal) {
  logger.info(`Shutting down (${signal})…`);
  for (const [sessionId, session] of activeSessions.entries()) {
    try {
      session.process.kill();
      logger.info('Killed capture session', { sessionId });
    } catch (e) { /* already dead */ }
  }
  activeSessions.clear();
  pcapQueue.close().then(() => {
    server.close(() => process.exit(0));
  });
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
