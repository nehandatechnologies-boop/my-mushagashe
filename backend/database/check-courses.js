const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function checkCourses() {
  try {
    const courses = db.prepare('SELECT * FROM courses').all();
    console.log('Courses in database:', JSON.stringify(courses, null, 2));
    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

checkCourses();
