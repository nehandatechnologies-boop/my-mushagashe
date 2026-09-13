const bcrypt = require('bcryptjs');
const hash = '$2a$10$M/19jZ4BkJKd7.hHOT9z0ue/PRTp/XG2BMQtBx3jfboJrLaA90wre';
const password = 'Temp@12345';

console.log('Testing password:', password);
console.log('Testing against hash:', hash);

const result = bcrypt.compareSync(password, hash);
console.log('Match result:', result);

// Also test generating a new hash
const newHash = bcrypt.hashSync(password, 10);
console.log('New hash:', newHash);
const newResult = bcrypt.compareSync(password, newHash);
console.log('New hash match:', newResult);
