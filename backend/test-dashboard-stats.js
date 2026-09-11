const http = require('http');

async function testDashboardStats() {
  // First login as admin
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
            reject(new Error(`Login failed: ${res.statusCode} - ${body}`));
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

  console.log('Login successful, token obtained');

  // Now test dashboard statistics
  const statsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/statistics',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const statsResult = await new Promise((resolve) => {
    const req = http.request(statsOptions, (res) => {
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

  console.log('\n=== DASHBOARD STATISTICS TEST ===');
  console.log('Status:', statsResult.status);
  if (statsResult.status === 200) {
    console.log('✓ SUCCESS - Dashboard statistics accessible');
    console.log('Response keys:', Object.keys(statsResult.body));
  } else {
    console.log('✗ FAILED');
    console.log('Response:', JSON.stringify(statsResult.body, null, 2));
  }
}

testDashboardStats();
