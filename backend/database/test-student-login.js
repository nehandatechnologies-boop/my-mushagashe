const http = require('http');

// Test student login with temporary password
const loginData = JSON.stringify({
  student_number: 'STU2026001',
  password: 'Temp@12345'
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
    console.log('Status:', loginRes.statusCode);
    console.log('Response:', data);
    const response = JSON.parse(data);
    if (response.token) {
      console.log('SUCCESS: Student login with temporary password worked');

      // Check if password change is required
      const checkReq = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/check-password-change-required',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${response.token}`
        }
      }, (checkRes) => {
        let checkData = '';
        checkRes.on('data', chunk => checkData += chunk);
        checkRes.on('end', () => {
          console.log('Password change required status:', checkRes.statusCode);
          console.log('Response:', checkData);
        });
      });

      checkReq.on('error', (e) => console.error('Check error:', e));
      checkReq.end();
    }
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
