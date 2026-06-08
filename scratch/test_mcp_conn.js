const https = require('https');

function testUrl(url) {
  https.get(url, (res) => {
    console.log(`${url}: SUCCESS (statusCode: ${res.statusCode})`);
  }).on('error', (e) => {
    console.error(`${url}: FAILED`, e.message);
  });
}

testUrl('https://oauth2.googleapis.com/token');
testUrl('https://mcp.supabase.com/mcp');
