const FormData = require('form-data');
const fs = require('fs');
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
        // Now test the duplicate import with the same file
        const filePath = 'C:\\Users\\PC\\Contacts\\HHHH\\my-mushagashe\\MUSH STUDENTS 1.xlsx';

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('preview', 'false'); // Set to false for actual import

        const importOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/students/import/excel',
          method: 'POST',
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${loginResponse.token}`
          }
        };

        const importReq = http.request(importOptions, (importRes) => {
          let importData = '';
          importRes.on('data', (chunk) => {
            importData += chunk;
          });
          importRes.on('end', () => {
            console.log('Second Import Status:', importRes.statusCode);
            console.log('Second Import Response:', importData);
          });
        });

        importReq.on('error', (error) => {
          console.error('Import Error:', error);
        });

        form.pipe(importReq);
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
