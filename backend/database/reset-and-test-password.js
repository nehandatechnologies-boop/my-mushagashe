const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'mushagashe.db');
const db = new Database(dbPath);

console.log('Resetting students...');
const stmt = db.prepare('DELETE FROM users WHERE role = ?');
const result = stmt.run('student');
console.log(`Deleted ${result.changes} students`);

db.close();
console.log('Database reset complete. Now run test with new import.');
