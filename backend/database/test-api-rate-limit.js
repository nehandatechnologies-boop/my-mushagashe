const http = require('http');

// Test API endpoints with rate limiting
const apiEndpoints = [
  '/api/dashboard/student',
  '/api/results',
  '/api/fees',
  '/api/announcements',
  '/api/auth/profile',
  '/api/announcements/unread/count'
];

console.log('Testing API endpoints for rate limiting...');

// First login to get a token
const loginData = JSON.stringify({
  student_number: 'STU2026001',
  password: 'NewSecurePassword123!'
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/student/login',
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

    // Test each API endpoint
    apiEndpoints.forEach((endpoint, index) => {
      setTimeout(() => {
        const req = http.request({
          hostname: 'localhost',
          port: 5000,
          path: endpoint,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }, (res) => {
          console.log(`${endpoint}: Status ${res.statusCode}`);
        });

        req.on('error', (e) => console.error(`${endpoint}: Error - ${e.message}`));
        req.end();
      }, index * 100); // Small delay between requests
    });
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
