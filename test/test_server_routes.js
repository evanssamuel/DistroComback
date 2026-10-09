const http = require('http');
const app = require('../server');
const { closeDB } = require('../src/db');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing Express server routes and frontend static files...');

  const health = await testEndpoint('/health');
  console.log('/health status:', health.statusCode);
  if (health.statusCode !== 200) throw new Error('/health failed');

  const index = await testEndpoint('/');
  console.log('/ status:', index.statusCode, 'Index contains Mikko:', index.body.includes('Mikko'));
  if (index.statusCode !== 200 || !index.body.includes('Mikko')) throw new Error('Index page failed');

  const rooms = await testEndpoint('/api/rooms');
  console.log('/api/rooms status:', rooms.statusCode);
  if (rooms.statusCode !== 200) throw new Error('/api/rooms failed');

  await closeDB();
  console.log('Server route tests passed successfully!');
  process.exit(0);
}

// Give server time to listen
setTimeout(run, 1500);
