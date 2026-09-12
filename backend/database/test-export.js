const http = require('http');
const fs = require('fs');

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
        // Now test the export
        const exportOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/students/export/excel',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResponse.token}`
          }
        };

        const exportReq = http.request(exportOptions, (exportRes) => {
          console.log('Export Status:', exportRes.statusCode);
          console.log('Export Content-Type:', exportRes.headers['content-type']);
          console.log('Export Content-Disposition:', exportRes.headers['content-disposition']);

          // Save the exported file
          const fileStream = fs.createWriteStream('C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\exported_students.xlsx');
          exportRes.pipe(fileStream);

          fileStream.on('finish', () => {
            console.log('Export file saved successfully');
            fileStream.close();
          });
        });

        exportReq.on('error', (error) => {
          console.error('Export Error:', error);
        });

        exportReq.end();
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
