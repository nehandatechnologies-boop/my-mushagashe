const http = require('http');

async function testAdminsRoute() {
  // Login as admin
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

  const token = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 200 && response.token) {
            resolve(response.token);
          } else {
            reject(new Error(`Login failed: ${res.statusCode}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('✓ Login successful\n');

  // Test administrators route
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admins/administrators',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const result = await new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });
    req.on('error', (error) => resolve({ error: error.message }));
    req.end();
  });

  console.log('=== ADMINISTRATORS ROUTE TEST ===');
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.body, null, 2));
}

testAdminsRoute();
