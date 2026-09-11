const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
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

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSecurityScenarios() {
  console.log('=== SECURITY TESTS ===\n');

  // Test 1: Student attempting admin login should fail
  console.log('Test 1: Student attempting admin login');
  const studentAdminLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'test@student.edu', password: 'student123' });
  console.log(`Status: ${studentAdminLogin.status}`);
  console.log(`Result: ${studentAdminLogin.status === 403 ? '✓ PASS' : '✗ FAIL'} - Students rejected from admin login\n`);

  // Test 2: Lecturer attempting admin login should fail
  console.log('Test 2: Lecturer attempting admin login');
  const lecturerAdminLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'testlecturer@test.com', password: 'lecturer123' });
  console.log(`Status: ${lecturerAdminLogin.status}`);
  console.log(`Result: ${lecturerAdminLogin.status === 403 ? '✓ PASS' : '✗ FAIL'} - Lecturers rejected from admin login\n`);

  // Test 3: Invalid credentials should fail
  console.log('Test 3: Invalid admin credentials');
  const invalidLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@mushagashe.edu', password: 'wrongpassword' });
  console.log(`Status: ${invalidLogin.status}`);
  console.log(`Result: ${invalidLogin.status === 401 ? '✓ PASS' : '✗ FAIL'} - Invalid credentials rejected\n`);

  // Test 4: Admin login without token should return 401 on protected route
  console.log('Test 4: Accessing protected route without token');
  const noTokenRequest = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admins/administrators',
    method: 'GET'
  });
  console.log(`Status: ${noTokenRequest.status}`);
  console.log(`Result: ${noTokenRequest.status === 401 ? '✓ PASS' : '✗ FAIL'} - Unauthorized access blocked\n`);

  // Test 5: Login as admin and test dashboard endpoint
  console.log('Test 5: Admin accessing dashboard with valid token');
  const adminLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@mushagashe.edu', password: 'admin123' });

  if (adminLogin.status === 200 && adminLogin.body.token) {
    const dashboardRequest = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/statistics',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminLogin.body.token}`
      }
    });
    console.log(`Status: ${dashboardRequest.status}`);
    console.log(`Result: ${dashboardRequest.status === 200 ? '✓ PASS' : '✗ FAIL'} - Authorized admin can access dashboard\n`);
  } else {
    console.log('✗ FAIL - Could not get admin token\n');
  }

  // Test 6: Student login should work at student endpoint
  console.log('Test 6: Student login at student endpoint');
  const studentLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/student/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { student_number: 'TEST001', password: 'student123' });
  console.log(`Status: ${studentLogin.status}`);
  console.log(`Response: ${JSON.stringify(studentLogin.body)}`);
  console.log(`Result: ${studentLogin.status === 200 ? '✓ PASS' : '✗ FAIL'} - Student login works\n`);

  // Test 7: Lecturer login should work at lecturer endpoint
  console.log('Test 7: Lecturer login at lecturer endpoint');
  const lecturerLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/lecturer/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'testlecturer@test.com', password: 'lecturer123' });
  console.log(`Status: ${lecturerLogin.status}`);
  console.log(`Result: ${lecturerLogin.status === 200 ? '✓ PASS' : '✗ FAIL'} - Lecturer login works\n`);

  console.log('=== SECURITY TESTS COMPLETE ===');
}

testSecurityScenarios();
