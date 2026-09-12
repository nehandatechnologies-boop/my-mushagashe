const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

const filePath = 'C:\\Users\\PC\\Contacts\\HHHH\\my-mushagashe\\MUSH STUDENTS 1.xlsx';

const form = new FormData();
form.append('file', fs.createReadStream(filePath));
form.append('preview', 'true');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/students/import/excel',
  method: 'POST',
  headers: {
    ...form.getHeaders(),
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

form.pipe(req);
