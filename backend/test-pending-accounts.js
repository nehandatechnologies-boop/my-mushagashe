const http = require('http');

async function testPendingAccounts() {
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

  // Now test pending accounts
  const pendingOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/pending-accounts?role=student',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const pendingResult = await new Promise((resolve) => {
    const req = http.request(pendingOptions, (res) => {
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

  console.log('\n=== PENDING ACCOUNTS TEST ===');
  console.log('Status:', pendingResult.status);
  if (pendingResult.status === 200) {
    console.log('✓ SUCCESS - Pending accounts accessible');
    console.log('Response:', JSON.stringify(pendingResult.body, null, 2));
  } else {
    console.log('✗ FAILED');
    console.log('Response:', JSON.stringify(pendingResult.body, null, 2));
  }
}

testPendingAccounts();
