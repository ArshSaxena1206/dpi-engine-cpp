const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for PCAP uploads
const upload = multer({ dest: 'uploads/' });

// State to store current rules and latest stats
let activeRules = {
  ips: [],
  apps: [],
  domains: []
};

let latestStats = {
  metrics: {
    totalPackets: 0,
    forwarded: 0,
    dropped: 0,
    activeFlows: 0,
  },
  apps: [],
  domains: []
};

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Ensure output directory exists
if (!fs.existsSync('output')) {
  fs.mkdirSync('output');
}

// Parse the stdout from dpi_engine.exe
function parseEngineOutput(output) {
  const stats = {
    metrics: {
      totalPackets: 0,
      forwarded: 0,
      dropped: 0,
      activeFlows: 0,
    },
    apps: [],
    domains: []
  };

  const lines = output.split('\n');
  let inAppBreakdown = false;
  let inDomains = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse Key Metrics
    if (line.includes('Total Packets:')) {
      const match = line.match(/Total Packets:\s+(\d+)/);
      if (match) stats.metrics.totalPackets = parseInt(match[1], 10);
    } else if (line.includes('Forwarded:')) {
      const match = line.match(/Forwarded:\s+(\d+)/);
      if (match) stats.metrics.forwarded = parseInt(match[1], 10);
    } else if (line.includes('Dropped:')) {
      const match = line.match(/Dropped:\s+(\d+)/);
      if (match) stats.metrics.dropped = parseInt(match[1], 10);
    } else if (line.includes('Active Flows:')) {
      const match = line.match(/Active Flows:\s+(\d+)/);
      if (match) stats.metrics.activeFlows = parseInt(match[1], 10);
    }

    // Parse App Breakdown
    if (line.includes('APPLICATION BREAKDOWN')) {
      inAppBreakdown = true;
      continue;
    }
    if (inAppBreakdown && line.includes('╚══════════════════════════════════════════════════════════════╝')) {
      inAppBreakdown = false;
      continue;
    }
    if (inAppBreakdown && line.startsWith('║') && !line.includes('APPLICATION BREAKDOWN') && !line.includes('╠') && !line.includes('╚')) {
      // Example line: ║ HTTPS                39  50.6% ##########                     ║
      // Or:           ║ YouTube               4   5.2% # (BLOCKED)                    ║
      const content = line.replace(/║/g, '').trim();
      if (content.length > 0 && !content.includes('APPLICATION BREAKDOWN')) {
         const parts = content.split(/\s+/);
         if (parts.length >= 3 && !isNaN(parseInt(parts[1]))) {
            const name = parts[0];
            const count = parseInt(parts[1], 10);
            const percentage = parseFloat(parts[2].replace('%', ''));
            const isBlocked = content.includes('(BLOCKED)');
            stats.apps.push({ name, count, percentage, isBlocked });
         }
      }
    }

    // Parse Detected Domains
    if (line.includes('[Detected Domains/SNIs]') || line.includes('[Detected Applications/Domains]')) {
      inDomains = true;
      continue;
    }
    if (inDomains && line.startsWith('-')) {
      // Example: - www.youtube.com -> YouTube
      const parts = line.replace('-', '').split('->');
      if (parts.length === 2) {
        stats.domains.push({
          domain: parts[0].trim(),
          app: parts[1].trim()
        });
      }
    }
  }

  return stats;
}


// --- API Endpoints ---

// Get current rules
app.get('/api/rules', (req, res) => {
  res.json(activeRules);
});

// Update rules
app.post('/api/rules', (req, res) => {
  activeRules = req.body;
  res.json({ message: 'Rules updated successfully', rules: activeRules });
});

// Get latest stats
app.get('/api/stats', (req, res) => {
  res.json(latestStats);
});

// Upload and Process PCAP
app.post('/api/upload', upload.single('pcapFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(__dirname, 'output', `filtered_${req.file.filename}.pcap`);
  
  // Construct command with rules
  // The dpi_engine.exe should be in the parent directory
  const enginePath = path.resolve(__dirname, '../dpi_engine.exe');
  
  let cmdArgs = `"${enginePath}" "${inputPath}" "${outputPath}"`;
  
  activeRules.ips.forEach(ip => {
    cmdArgs += ` --block-ip "${ip}"`;
  });
  activeRules.apps.forEach(app => {
    cmdArgs += ` --block-app "${app}"`;
  });
  activeRules.domains.forEach(domain => {
    cmdArgs += ` --block-domain "${domain}"`;
  });

  console.log(`Executing: ${cmdArgs}`);

  exec(cmdArgs, (error, stdout, stderr) => {
    // Clean up uploaded file
    fs.unlink(inputPath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    if (error) {
      console.error(`Execution error: ${error}`);
      return res.status(500).json({ error: 'Engine execution failed', details: stderr || error.message });
    }

    console.log('Engine processing complete.');
    latestStats = parseEngineOutput(stdout);
    latestStats.rawOutput = stdout; // Include raw output for debugging if needed

    res.json({
      message: 'Processing complete',
      stats: latestStats,
      outputFile: `filtered_${req.file.filename}.pcap`
    });
  });
});

// Download filtered PCAP
app.get('/api/download/:filename', (req, res) => {
  const file = path.join(__dirname, 'output', req.params.filename);
  if (fs.existsSync(file)) {
    res.download(file);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
