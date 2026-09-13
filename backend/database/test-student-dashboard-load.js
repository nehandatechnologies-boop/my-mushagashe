const http = require('http');

console.log('=== SIMULATING STUDENT DASHBOARD LOAD ===\n');

// First login as student
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
    const response = JSON.parse(data);
    const token = response.token;

    console.log('✅ Student login successful');
    console.log('Now simulating dashboard page load with multiple API requests...\n');

    // Simulate the typical API calls made when a student loads the dashboard
    const dashboardRequests = [
      '/api/dashboard/student',
      '/api/results',
      '/api/fees',
      '/api/announcements',
      '/api/auth/profile',
      '/api/announcements/unread/count'
    ];

    let successCount = 0;
    let rateLimitCount = 0;
    let errorCount = 0;

    dashboardRequests.forEach((endpoint, index) => {
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
          if (res.statusCode === 200) {
            successCount++;
            console.log(`✅ ${endpoint}: Status ${res.statusCode}`);
          } else if (res.statusCode === 429) {
            rateLimitCount++;
            console.log(`❌ ${endpoint}: Status ${res.statusCode} (RATE LIMITED)`);
          } else {
            errorCount++;
            console.log(`⚠️  ${endpoint}: Status ${res.statusCode}`);
          }

          if (index === dashboardRequests.length - 1) {
            console.log('\n=== DASHBOARD LOAD RESULTS ===');
            console.log(`Success: ${successCount}/${dashboardRequests.length}`);
            console.log(`Rate limited (429): ${rateLimitCount}`);
            console.log(`Other errors: ${errorCount}`);

            if (rateLimitCount === 0 && successCount === dashboardRequests.length) {
              console.log('\n✅ Student dashboard load would work without 429 errors');
            } else {
              console.log('\n❌ Student dashboard would experience rate limiting issues');
            }
          }
        });

        req.on('error', (e) => {
          errorCount++;
          console.log(`❌ ${endpoint}: Error - ${e.message}`);
        });

        req.end();
      }, index * 50); // Small delay between requests to simulate real browser behavior
    });
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
