const Database = require('better-sqlite3');
const db = new Database('./mushagashe.db');

// Migrate existing admin to SUPER_ADMIN
const stmt = db.prepare('UPDATE users SET role = ? WHERE email = ?');
stmt.run('SUPER_ADMIN', 'admin@mushagashe.edu');
console.log('Admin migrated to SUPER_ADMIN');

// Verify the migration
const rows = db.prepare("SELECT id, email, full_name, role, status FROM users WHERE role = 'SUPER_ADMIN'").all();
console.log('SUPER_ADMIN accounts:', JSON.stringify(rows, null, 2));

db.close();