const http = require('http');

// Login as admin
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

    console.log('Got token, now fetching dashboard statistics...');

    // Get dashboard statistics
    const statsReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/statistics',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (statsRes) => {
      let statsData = '';
      statsRes.on('data', chunk => statsData += chunk);
      statsRes.on('end', () => {
        console.log('Status:', statsRes.statusCode);
        console.log('Response:', statsData);
      });
    });

    statsReq.on('error', (e) => console.error('Stats error:', e));
    statsReq.end();
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
