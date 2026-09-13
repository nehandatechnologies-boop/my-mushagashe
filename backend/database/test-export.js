const http = require('http');
const fs = require('fs');

// Login as admin
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

    console.log('Got token, now exporting students...');

    // Export students
    const exportReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students/export/excel',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (exportRes) => {
      const chunks = [];
      exportRes.on('data', chunk => chunks.push(chunk));
      exportRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log('Status:', exportRes.statusCode);
        console.log('Content-Type:', exportRes.headers['content-type']);
        console.log('Content-Disposition:', exportRes.headers['content-disposition']);
        console.log('File size:', buffer.length);

        // Save the file
        fs.writeFileSync('C:\\Users\\PC\\CascadeProjects\\vocational-portal\\backend\\database\\exported_students.xlsx', buffer);
        console.log('File saved as: exported_students.xlsx');

        // Read and verify the headers
        const XLSX = require('xlsx');
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('Export headers:', jsonData[0]);
        console.log('Number of rows:', jsonData.length);
      });
    });

    exportReq.on('error', (e) => console.error('Export error:', e));
    exportReq.end();
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(loginData);
loginReq.end();
