const { spawn } = require('child_process');
const server = spawn('node', ['server.js'], { env: { ...process.env, PORT: '3002' } });

server.stdout.on('data', d => console.log('OUT:', d.toString()));
server.stderr.on('data', d => console.log('ERR:', d.toString()));

setTimeout(() => {
  fetch('http://localhost:3002/api/v1/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packetCount: 100, protocols: ['http'], domains: [] })
  }).then(r => r.text()).then(console.log).catch(console.error);
}, 2000);

setTimeout(() => server.kill(), 5000);
