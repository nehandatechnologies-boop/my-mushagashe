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
        // Test preview first
        const filePath = 'C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\test_students_with_passwords.xlsx';

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('preview', 'true');

        const importOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/students/import/excel',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${loginResponse.token}`
          }
        };

        form.pipe(http.request(importOptions, (importRes) => {
          let importData = '';
          importRes.on('data', (chunk) => {
            importData += chunk;
          });
          importRes.on('end', () => {
            console.log('Preview Status:', importRes.statusCode);
            console.log('Preview Response:', importData);
          });
        }));
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
