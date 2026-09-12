const http = require('http');

// First, login as admin to get a token
const loginData = JSON.stringify({
  email: 'admin@mushagashe.edu',
  password: 'admin123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

const loginReq = http.request(loginOptions, (loginRes) => {
  let loginData = '';
  loginRes.on('data', (chunk) => {
    loginData += chunk;
  });
  loginRes.on('end', () => {
    try {
      const loginResponse = JSON.parse(loginData);
      console.log('Login successful');

      if (loginResponse.token) {
        // Now test the dashboard statistics
        const statsOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/dashboard/statistics',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResponse.token}`
          }
        };

        const statsReq = http.request(statsOptions, (statsRes) => {
          let statsData = '';
          statsRes.on('data', (chunk) => {
            statsData += chunk;
          });
          statsRes.on('end', () => {
            console.log('Dashboard Statistics Status:', statsRes.statusCode);
            console.log('Dashboard Statistics Response:', statsData);
          });
        });

        statsReq.on('error', (error) => {
          console.error('Statistics Error:', error);
        });

        statsReq.end();
      } else {
        console.error('No token in login response');
      }
    } catch (error) {
      console.error('Error parsing login response:', error);
    }
  });
});

loginReq.on('error', (error) => {
  console.error('Login Error:', error);
});

loginReq.write(loginData);
loginReq.end();
