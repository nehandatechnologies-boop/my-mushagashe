const http = require('http');

console.log('=== COMPREHENSIVE FUNCTIONALITY TEST ===\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
  testFn()
    .then(() => {
      console.log(`✅ ${testName} - PASSED`);
      testsPassed++;
    })
    .catch((error) => {
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      testsFailed++;
    });
}

// Test 1: Static CSS files
runTest('Static CSS files (app-shell.css)', () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/assets/css/app-shell.css',
      method: 'GET'
    }, (res) => {
      if (res.statusCode === 200 && res.headers['content-type'].includes('text/css')) {
        resolve();
      } else {
        reject(new Error(`Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}`));
      }
    });
    req.on('error', reject);
    req.end();
  });
});

// Test 2: Static image files
runTest('Static image files (mushagashe-logo.jpg)', () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/assets/images/mushagashe-logo.jpg',
      method: 'GET'
    }, (res) => {
      if (res.statusCode === 200 && res.headers['content-type'].includes('image/jpeg')) {
        resolve();
      } else {
        reject(new Error(`Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}`));
      }
    });
    req.on('error', reject);
    req.end();
  });
});

// Test 3: Health check endpoint
runTest('Health check endpoint', () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/health',
      method: 'GET'
    }, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Status ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.end();
  });
});

// Test 4: Admin login
runTest('Admin login', () => {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      email: 'admin@mushagashe.edu',
      password: 'admin123'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Status ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
});

// Test 5: Student login
runTest('Student login', () => {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      student_number: 'STU2026001',
      password: 'Temp@12345'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/student/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Status ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
});

// Test 6: Dashboard statistics API
runTest('Dashboard statistics API', () => {
  return new Promise((resolve, reject) => {
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
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.end();
      });
    });

    loginReq.on('error', reject);
    loginReq.write(loginData);
    loginReq.end();
  });
});

// Test 7: Students API
runTest('Students API', () => {
  return new Promise((resolve, reject) => {
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

        const req = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/students',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.end();
      });
    });

    loginReq.on('error', reject);
    loginReq.write(loginData);
    loginReq.end();
  });
});

// Test 8: Course API
runTest('Course API', () => {
  return new Promise((resolve, reject) => {
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

        const req = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/courses',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.end();
      });
    });

    loginReq.on('error', reject);
    loginReq.write(loginData);
    loginReq.end();
  });
});

// Wait for all tests to complete
setTimeout(() => {
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n❌ Some tests failed');
  }
}, 5000);
