const http = require('http');

// Test static file endpoints
const testFiles = [
  '/assets/css/app-shell.css',
  '/assets/css/components.css',
  '/assets/css/design-system.css',
  '/assets/images/mushagashe-logo.jpg'
];

console.log('Testing static file endpoints...');

testFiles.forEach(filePath => {
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: filePath,
    method: 'GET'
  }, (res) => {
    console.log(`${filePath}: Status ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);
  });

  req.on('error', (e) => console.error(`${filePath}: Error - ${e.message}`));
  req.end();
});
