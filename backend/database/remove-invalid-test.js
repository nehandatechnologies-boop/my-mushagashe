const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'mushagashe.db');
const db = new Database(dbPath);

console.log('Removing test student with invalid course...');
const stmt = db.prepare('DELETE FROM users WHERE student_number = ?');
const result = stmt.run('STU999999');
console.log(`Deleted ${result.changes} student(s)`);

db.close();
