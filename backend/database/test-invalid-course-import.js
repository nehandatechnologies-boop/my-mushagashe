const http = require('http');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'test_invalid_course.xlsx');
const fileBuffer = fs.readFileSync(filePath);
const boundary = '----WebKitFormBoundary' + Date.now();

// Create multipart form data
let body = '';
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="file"; filename="test_invalid_course.xlsx"\r\n`;
body += `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
const bodyBuffer = Buffer.concat([
  Buffer.from(body),
  fileBuffer,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

// Login first
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

    console.log('Got token, now importing invalid course ID...');

    // Import with preview
    const importReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students/import/excel?preview=true',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    }, (importRes) => {
      let importData = '';
      importRes.on('data', chunk => importData += chunk);
      importRes.on('end', () => {
        console.log('Status:', importRes.statusCode);
        console.log('Response:', importData);
      });
    });

    importReq.on('error', (e) => console.error('Import error:', e));
    importReq.write(bodyBuffer);
    importReq.end();
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
