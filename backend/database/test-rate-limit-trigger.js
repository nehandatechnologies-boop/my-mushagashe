const http = require('http');

// Test if rate limiting works by making many requests
console.log('Testing rate limiting by making 50 rapid requests...');

// First login as admin to get a token
const loginData = JSON.stringify({
  email: 'admin@mushagashe.edu',
  password: 'admin123'
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
}, (loginRes) => {
  let data = '';
  loginRes.on('data', chunk => data += chunk);
  loginRes.on('end', () => {
    const response = JSON.parse(data);
    const token = response.token;

    console.log('Login successful, got token');
    console.log('Making 50 rapid requests to /api/dashboard/statistics...');

    let successCount = 0;
    let rateLimitCount = 0;
    let errorCount = 0;

    // Make 50 rapid requests
    for (let i = 0; i < 50; i++) {
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/dashboard/statistics',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (res) => {
        if (res.statusCode === 200) {
          successCount++;
        } else if (res.statusCode === 429) {
          rateLimitCount++;
        } else {
          errorCount++;
        }

        console.log(`Request ${i + 1}: Status ${res.statusCode}`);

        if (i === 49) {
          console.log('\nSummary:');
          console.log(`Success: ${successCount}`);
          console.log(`Rate limited (429): ${rateLimitCount}`);
          console.log(`Other errors: ${errorCount}`);
        }
      });

      req.on('error', (e) => {
        errorCount++;
        console.log(`Request ${i + 1}: Error - ${e.message}`);
      });

      req.end();
    }
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
