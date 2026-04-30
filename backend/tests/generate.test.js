/**
 * Automated tests for POST /api/v1/generate endpoint.
 *
 * Mocks:
 * - child_process.spawn: prevents actual Python execution
 * - Bull queue: prevents Redis dependency
 * - Socket.io: prevents WebSocket dependency
 *
 * Run: cd backend && npm test
 */

const request = require('supertest');
const express = require('express');
const path = require('path');

// ─── Mock express-rate-limit ──────────────────────────────────────────────────
jest.mock('express-rate-limit', () => {
  const mw = (req, res, next) => next();
  const factory = () => mw;
  factory.default = factory;
  factory.rateLimit = factory;
  return factory;
});

// ─── Mock child_process.spawn ─────────────────────────────────────────────────
const mockSpawn = jest.fn();
jest.mock('child_process', () => {
  const original = jest.requireActual('child_process');
  return {
    ...original,
    spawn: (...args) => mockSpawn(...args),
    exec: original.exec,
  };
});

// ─── Mock Bull Queue ──────────────────────────────────────────────────────────
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-123' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(),
    client: { status: 'ready' },
  }));
});

// ─── Mock better-sqlite3 (via db.js) ─────────────────────────────────────────
jest.mock('../db', () => ({
  stmts: {
    getAllRules: { all: jest.fn().mockReturnValue([]) },
    insertRule: { run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }) },
    getRuleById: { get: jest.fn().mockReturnValue({ id: 1, type: 'app', value: 'test', enabled: 1, created_at: '2026-01-01' }) },
    updateRule: { run: jest.fn() },
    deleteRule: { run: jest.fn() },
    getEnabledRules: { all: jest.fn().mockReturnValue([]) },
    insertStats: { run: jest.fn() },
    getStatsHistory: { all: jest.fn().mockReturnValue([]) },
  },
  formatRule: jest.fn((r) => ({ ...r, enabled: !!r.enabled })),
}));

// ─── Mock Socket.io ───────────────────────────────────────────────────────────
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      emit: jest.fn(),
    })),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a mock spawn process that exits with the given code.
 * @param {number} exitCode
 * @param {string} stderrOutput
 */
function createMockProcess(exitCode = 0, stderrOutput = '') {
  const EventEmitter = require('events');
  const proc = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stdin = { write: jest.fn(), end: jest.fn() };

  // Schedule exit on next tick so route handler can set up listeners
  process.nextTick(() => {
    if (stderrOutput) {
      proc.stderr.emit('data', Buffer.from(stderrOutput));
    }
    proc.emit('close', exitCode);
  });

  return proc;
}

// ─── Load server (after all mocks are in place) ──────────────────────────────
// We need a reference to the express app, but server.js calls server.listen().
// To avoid binding the port, we'll extract the app from the module.

let app;

beforeAll(() => {
  // Suppress console output from Winston during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  // Prevent server.listen from actually binding
  const http = require('http');
  const originalCreateServer = http.createServer;
  jest.spyOn(http, 'createServer').mockImplementation((a) => {
    app = a;
    const mockServer = {
      listen: jest.fn((port, cb) => cb && cb()),
      close: jest.fn((cb) => cb && cb()),
      on: jest.fn(),
      address: jest.fn().mockReturnValue({ port: 3001 }),
    };
    // Socket.io needs to attach to something
    mockServer._events = {};
    return mockServer;
  });

  // Now require the server module
  require('../server');

  // Restore createServer so Supertest can create ephemeral servers
  http.createServer.mockRestore();
});

beforeEach(() => {
  mockSpawn.mockReset();
});

// ═════════════════════════════════════════════════════════════════════════════
//  Test Suites
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/generate', () => {

  // ── Happy Path Tests ────────────────────────────────────────────────────

  describe('Happy Path', () => {
    
    test('1. valid full body → 202 with jobId and filename', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({
          packetCount: 200,
          protocols: ['http', 'https', 'dns'],
          domains: ['youtube.com', 'google.com'],
          ipRange: '192.168.1.0/24',
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('jobId');
      expect(res.body.data).toHaveProperty('filename');
    });

    test('2. only required fields (protocols) → 202 with defaults applied', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: ['dns'] });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('jobId');
      expect(res.body.data).toHaveProperty('filename');
    });

    test('3. minimum packet count (100) → 202', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ packetCount: 100, protocols: ['http'] });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    });

    test('4. maximum packet count (10000) → 202', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ packetCount: 10000, protocols: ['https'] });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    });
  });

  // ── Validation Error Tests ──────────────────────────────────────────────

  describe('Validation Errors', () => {

    test('5. empty protocols array → 400', async () => {
      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('6. invalid protocol value "ftp" → 400', async () => {
      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: ['ftp'] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('7. packetCount below minimum (50) → 400', async () => {
      const res = await request(app)
        .post('/api/v1/generate')
        .send({ packetCount: 50, protocols: ['http'] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('8. packetCount above maximum (99999) → 400', async () => {
      const res = await request(app)
        .post('/api/v1/generate')
        .send({ packetCount: 99999, protocols: ['http'] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('9. missing body entirely → 400', async () => {
      const res = await request(app)
        .post('/api/v1/generate')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('10. invalid ipRange format → passes Zod (no server-side CIDR regex) but spawns Python', async () => {
      // Note: The backend Zod schema uses z.string().optional() for ipRange, 
      // so any string is accepted. CIDR validation is only client-side.
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: ['http'], ipRange: 'not-a-cidr' });

      // Zod won't reject this — it's a valid string
      expect(res.status).toBe(202);
    });
  });

  // ── Response Shape Tests ────────────────────────────────────────────────

  describe('Response Shape', () => {

    test('12. response always has { success, data: { jobId, filename } }', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: ['http'] });

      expect(res.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          jobId: expect.anything(),
          filename: expect.any(String),
        }),
      });
    });

    test('13. filename always ends with .pcap', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: ['dns'] });

      expect(res.body.data.filename).toMatch(/\.pcap$/);
    });

    test('14. jobId is a non-empty string or number', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: ['http'] });

      const jobId = res.body.data.jobId;
      expect(jobId).toBeTruthy();
      expect(String(jobId).length).toBeGreaterThan(0);
    });
  });

  // ── Python Failure Test ─────────────────────────────────────────────────

  describe('Python Process Failure', () => {

    test('Python exit code non-zero → 500 GENERATION_FAILED', async () => {
      mockSpawn.mockReturnValue(createMockProcess(1, 'Traceback: something broke'));

      const res = await request(app)
        .post('/api/v1/generate')
        .send({ protocols: ['http'] });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GENERATION_FAILED');
      expect(res.body.error.message).toBe('Failed to generate PCAP');
      expect(res.body.error.details).toContain('Traceback');
    });
  });
});

// ── Existing Endpoint Regression Tests ────────────────────────────────────

describe('Regression — Existing Endpoints', () => {

  test('15. GET /api/v1/rules → 200', async () => {
    const res = await request(app).get('/api/v1/rules');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('16. GET /api/v1/stats → 200', async () => {
    const res = await request(app).get('/api/v1/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('metrics');
  });

  test('17. POST /api/v1/rules with valid body → 201', async () => {
    const res = await request(app)
      .post('/api/v1/rules')
      .send({ type: 'app', value: 'TestApp', enabled: true });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('18. POST /api/v1/upload without file → 400', async () => {
    const res = await request(app)
      .post('/api/v1/upload');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
