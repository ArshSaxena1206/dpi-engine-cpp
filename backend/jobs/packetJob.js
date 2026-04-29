const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Creates and queues a new packet processing job
 */
function createPacketJob(queue, inputPath, outputPath, outputFilename, originalName) {
  return queue.add({
    inputPath,
    outputPath,
    outputFilename,
    originalName,
  });
}

/**
 * Handles the output string from dpi_engine.exe
 */
function handleOutput(output) {
  const stats = {
    metrics: { totalPackets: 0, forwarded: 0, dropped: 0, activeFlows: 0 },
    apps: [],
    domains: [],
  };

  const lines = output.split('\n');
  let inAppBreakdown = false;
  let inDomains = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('Total Packets:')) {
      const m = line.match(/Total Packets:\s+(\d+)/);
      if (m) stats.metrics.totalPackets = parseInt(m[1], 10);
    } else if (line.includes('Forwarded:')) {
      const m = line.match(/Forwarded:\s+(\d+)/);
      if (m) stats.metrics.forwarded = parseInt(m[1], 10);
    } else if (line.includes('Dropped:')) {
      const m = line.match(/Dropped:\s+(\d+)/);
      if (m) stats.metrics.dropped = parseInt(m[1], 10);
    } else if (line.includes('Active Flows:')) {
      const m = line.match(/Active Flows:\s+(\d+)/);
      if (m) stats.metrics.activeFlows = parseInt(m[1], 10);
    }

    if (line.includes('APPLICATION BREAKDOWN')) { inAppBreakdown = true; continue; }
    if (inAppBreakdown && line.includes('╚')) { inAppBreakdown = false; continue; }
    if (inAppBreakdown && line.startsWith('║') && !line.includes('╠') && !line.includes('╚') && !line.includes('APPLICATION BREAKDOWN')) {
      const content = line.replace(/║/g, '').trim();
      if (content.length > 0) {
        const parts = content.split(/\s+/);
        if (parts.length >= 3 && !isNaN(parseInt(parts[1]))) {
          stats.apps.push({
            name:       parts[0],
            count:      parseInt(parts[1], 10),
            percentage: parseFloat(parts[2].replace('%', '')),
            isBlocked:  content.includes('(BLOCKED)'),
          });
        }
      }
    }

    if (line.includes('[Detected Domains/SNIs]') || line.includes('[Detected Applications/Domains]')) { inDomains = true; continue; }
    if (inDomains && line.startsWith('-')) {
      const parts = line.replace('-', '').split('->');
      if (parts.length === 2) {
        stats.domains.push({ domain: parts[0].trim(), app: parts[1].trim() });
      }
    }
  }

  return stats;
}

/**
 * Generates a report or processes stats for persistence
 */
function generateReport(parsedStats) {
  // Returns a formatted report or simply passes through
  return parsedStats;
}

module.exports = {
  createPacketJob,
  handleOutput,
  generateReport
};
