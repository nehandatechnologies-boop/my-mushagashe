const http = require('http');

// First login with temporary password
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

    console.log('Step 1: Login with temporary password successful');
    console.log('must_change_password:', response.must_change_password);

    // Now change password
    const changePasswordData = JSON.stringify({
      current_password: 'Temp@12345',
      new_password: 'NewSecurePassword123!'
    });

    const changeReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/change-password',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(changePasswordData)
      }
    }, (changeRes) => {
      let changeData = '';
      changeRes.on('data', chunk => changeData += chunk);
      changeRes.on('end', () => {
        console.log('Step 2: Password change status:', changeRes.statusCode);
        console.log('Response:', changeData);

        // Now try to login with old password (should fail)
        const oldLoginData = JSON.stringify({
          student_number: 'STU2026001',
          password: 'Temp@12345'
        });

        const oldLoginReq = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/auth/student/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(oldLoginData)
          }
        }, (oldLoginRes) => {
          let oldLoginData = '';
          oldLoginRes.on('data', chunk => oldLoginData += chunk);
          oldLoginRes.on('end', () => {
            console.log('Step 3: Login with OLD password status:', oldLoginRes.statusCode);
            console.log('Response:', oldLoginData);

            // Try to login with new password (should succeed)
            const newLoginData = JSON.stringify({
              student_number: 'STU2026001',
              password: 'NewSecurePassword123!'
            });

            const newLoginReq = http.request({
              hostname: 'localhost',
              port: 5000,
              path: '/api/auth/student/login',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(newLoginData)
              }
            }, (newLoginRes) => {
              let newLoginData = '';
              newLoginRes.on('data', chunk => newLoginData += chunk);
              newLoginRes.on('end', () => {
                console.log('Step 4: Login with NEW password status:', newLoginRes.statusCode);
                console.log('Response:', newLoginData);
                const newResponse = JSON.parse(newLoginData);
                console.log('must_change_password after change:', newResponse.must_change_password);
              });
            });

            newLoginReq.on('error', (e) => console.error('New login error:', e));
            newLoginReq.write(newLoginData);
            newLoginReq.end();
          });
        });

        oldLoginReq.on('error', (e) => console.error('Old login error:', e));
        oldLoginReq.write(oldLoginData);
        oldLoginReq.end();
      });
    });

    changeReq.on('error', (e) => console.error('Change password error:', e));
    changeReq.write(changePasswordData);
    changeReq.end();
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
