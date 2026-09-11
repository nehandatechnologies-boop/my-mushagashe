const http = require('http');

async function testAllRoutes() {
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

  const routes = [
    { path: '/api/dashboard/statistics', name: 'Dashboard Statistics' },
    { path: '/api/auth/admin/pending-accounts?role=student', name: 'Pending Accounts' },
    { path: '/api/admins/administrators', name: 'Administrators List' },
    { path: '/api/admins/audit/logs', name: 'Audit Logs' },
    { path: '/api/intakes', name: 'Intakes' },
    { path: '/api/students', name: 'Students' },
    { path: '/api/announcements', name: 'Announcements' }
  ];

  const results = [];

  for (const route of routes) {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: route.path,
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

    results.push({ ...route, ...result });
  }

  console.log('=== ROUTE TEST RESULTS ===\n');
  results.forEach(r => {
    const status = r.status === 200 ? '✓' : '✗';
    console.log(`${status} ${r.name}: ${r.status}`);
    if (r.status !== 200) {
      console.log(`  Response: ${JSON.stringify(r.body).substring(0, 100)}...`);
    }
  });

  const successCount = results.filter(r => r.status === 200).length;
  console.log(`\nSummary: ${successCount}/${results.length} routes successful`);
}

testAllRoutes();
