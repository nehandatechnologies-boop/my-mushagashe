const bcrypt = require('bcryptjs');
const hash = '$2a$10$M5m2Ew2a87ogca/1yWYf3um2YDQXcN6/VADlfa/hYbmfqYq9BAz0C';
const password = 'Temp@12345';

console.log('Testing password:', password);
console.log('Testing against LATEST hash:', hash);

const result = bcrypt.compareSync(password, hash);
console.log('Match result:', result);
