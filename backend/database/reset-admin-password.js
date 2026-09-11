const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./mushagashe.db');

// Reset admin password to admin123
const hashedPassword = bcrypt.hashSync('admin123', 10);
const stmt = db.prepare('UPDATE users SET password = ? WHERE email = ?');
stmt.run(hashedPassword, 'admin@mushagashe.edu');
console.log('Admin password reset to admin123');

// Verify the update
const rows = db.prepare("SELECT id, email, full_name, role, status FROM users WHERE email = 'admin@mushagashe.edu'").all();
console.log('Admin account:', JSON.stringify(rows, null, 2));

db.close();