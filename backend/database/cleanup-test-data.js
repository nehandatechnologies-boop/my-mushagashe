const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'mushagashe.db');
const db = new Database(dbPath);

console.log('Cleaning up test students...');
const stmt = db.prepare('DELETE FROM users WHERE student_number LIKE ?');
const result = stmt.run('STU%');
console.log(`Deleted ${result.changes} test students`);

db.close();
console.log('Cleanup complete');
