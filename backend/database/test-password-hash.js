const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'mushagashe.db');
const db = new Database(dbPath);

// Test what happens when we hash "Temp@12345"
const password = 'Temp@12345';
const hash = bcrypt.hashSync(password, 10);
console.log('Hash of "Temp@12345":', hash);

// Check if the stored hash is actually a bcrypt hash
const storedHash = '$2a$10$M/19jZ4BkJKd7.hHOT9z0ue/PRTp/XG2BMQtBx3jfboJrLaA90wre';
console.log('Stored hash:', storedHash);

// Check if they match
const match = bcrypt.compareSync(password, storedHash);
console.log('Do they match?', match);

// Try to identify what the stored hash might be
// Let's check if it was base64 encoded or something else
console.log('Length of stored hash:', storedHash.length);
console.log('Expected bcrypt hash length:', hash.length);

db.close();
