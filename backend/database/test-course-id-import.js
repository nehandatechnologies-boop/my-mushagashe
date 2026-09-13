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
        // Check current courses
        const coursesOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/courses',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResponse.token}`
          }
        };

        const coursesReq = http.request(coursesOptions, (coursesRes) => {
          let coursesData = '';
          coursesRes.on('data', (chunk) => {
            coursesData += chunk;
          });
          coursesRes.on('end', () => {
            console.log('Available courses:', JSON.parse(coursesData));
          });
        });

        coursesReq.on('error', (error) => {
          console.error('Courses error:', error);
        });

        coursesReq.end();
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
