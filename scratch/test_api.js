const http = require('http');

const data = JSON.stringify({
  messages: [{ role: "user", content: "how many credits in bhavarkua project total?" }],
  context: {
    surface: "dashboard",
    title: "Test",
    summary: "Test",
    facts: ["Project: Bhavarkua"],
    nextSteps: ["Wait"],
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/assistant',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let output = '';
  res.on('data', d => output += d);
  res.on('end', () => console.log('RESPONSE:', output));
});

req.on('error', console.error);
req.write(data);
req.end();
