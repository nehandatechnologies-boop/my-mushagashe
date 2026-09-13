const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'mushagashe.db');
const db = new Database(dbPath);

const student = db.prepare('SELECT id, student_number, full_name, password, must_change_password FROM users WHERE student_number = ?').get('STU2026001');

console.log('Student record:', JSON.stringify(student, null, 2));

db.close();
