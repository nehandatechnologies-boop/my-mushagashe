const bcrypt = require('bcryptjs');
const hash = '$2a$10$02b2Y.pbT0tqqvnY22e6YeQnO5ChRYkCOUMBSB/.H20MZrmIIoHvK';
const password = 'Temp@12345';

console.log('Testing password:', password);
console.log('Testing against NEW hash:', hash);

const result = bcrypt.compareSync(password, hash);
console.log('Match result:', result);
