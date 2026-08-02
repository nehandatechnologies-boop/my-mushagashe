const bcrypt = require('bcryptjs');

// Generate bcrypt hash for admin password
const password = 'admin123';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log('Password:', password);
console.log('Bcrypt Hash:', hash);
console.log('\nCopy this hash and use it in the Supabase SQL editor to create the admin user.');
