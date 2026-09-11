const http = require('http');

const testAdmins = [
  { email: 'admin@mushagashe.edu', password: 'admin123', role: 'SUPER_ADMIN' },
  { email: 'academic@mushagashe.edu', password: 'academic123', role: 'ACADEMIC_ADMIN' },
  { email: 'finance@mushagashe.edu', password: 'finance123', role: 'FINANCE_ADMIN' },
  { email: 'admissions@mushagashe.edu', password: 'admissions123', role: 'ADMISSIONS_ADMIN' },
  { email: 'lecturer@mushagashe.edu', password: 'lecturer123', role: 'LECTURER_ADMIN' }
];

function testLogin(admin) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: admin.email,
      password: admin.password
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            admin: admin.email,
            expectedRole: admin.role,
            status: res.statusCode,
            response: response
          });
        } catch (e) {
          resolve({
            admin: admin.email,
            expectedRole: admin.role,
            status: res.statusCode,
            response: data,
            error: 'JSON parse error'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        admin: admin.email,
        error: error.message
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('Testing all admin role logins...\n');

  const results = [];

  for (const admin of testAdmins) {
    try {
      const result = await testLogin(admin);
      results.push(result);

      if (result.status === 200) {
        const actualRole = result.response.user?.role;
        const permissionCount = result.response.permissions?.length || 0;
        const match = actualRole === admin.role ? '✓' : '✗';

        console.log(`${match} ${admin.email}`);
        console.log(`  Expected: ${admin.role}`);
        console.log(`  Actual: ${actualRole}`);
        console.log(`  Permissions: ${permissionCount}`);
        console.log();
      } else {
        console.log(`✗ ${admin.email} - Status: ${result.status}`);
        console.log(`  Response: ${JSON.stringify(result.response)}`);
        console.log();
      }
    } catch (error) {
      console.log(`✗ ${admin.email} - Error: ${error.error}`);
      console.log();
    }
  }

  console.log('\n=== SUMMARY ===');
  const successCount = results.filter(r => r.status === 200 && r.response.user?.role === r.expectedRole).length;
  console.log(`Successful logins: ${successCount}/${testAdmins.length}`);

  results.forEach(r => {
    if (r.status === 200 && r.response.user?.role === r.expectedRole) {
      console.log(`✓ ${r.admin} (${r.response.user.role})`);
    } else {
      console.log(`✗ ${r.admin} - Expected ${r.expectedRole}, got ${r.response.user?.role || 'N/A'}`);
    }
  });
}

runTests();
