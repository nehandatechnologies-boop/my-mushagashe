const http = require('http');

// Test auth rate limiting by making many login attempts
console.log('Testing auth rate limiting by making 20 rapid login attempts...');

let successCount = 0;
let rateLimitCount = 0;
let errorCount = 0;

// Make 20 rapid login attempts
for (let i = 0; i < 20; i++) {
  const loginData = JSON.stringify({
    email: 'admin@mushagashe.edu',
    password: 'admin123'
  });

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, (res) => {
    if (res.statusCode === 200) {
      successCount++;
    } else if (res.statusCode === 429) {
      rateLimitCount++;
    } else {
      errorCount++;
    }

    console.log(`Login attempt ${i + 1}: Status ${res.statusCode}`);

    if (i === 19) {
      console.log('\nSummary:');
      console.log(`Success: ${successCount}`);
      console.log(`Rate limited (429): ${rateLimitCount}`);
      console.log(`Other errors: ${errorCount}`);
    }
  });

  req.on('error', (e) => {
    errorCount++;
    console.log(`Login attempt ${i + 1}: Error - ${e.message}`);
  });

  req.write(loginData);
  req.end();
}
