const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function inspectCourses() {
  try {
    console.log('=== CURRENT COURSE DATABASE ===');
    const courses = db.prepare('SELECT * FROM courses ORDER BY id').all();
    console.log(`Total courses: ${courses.length}`);
    console.log('All courses:');
    courses.forEach(course => {
      console.log(`  ID: ${course.id}, Code: ${course.course_code}, Name: ${course.course_name}, Dept: ${course.department}, Created: ${course.created_at}`);
    });

    console.log('\n=== CHECKING FOR COURSE REFERENCES ===');
    const studentCourses = db.prepare('SELECT course_id, COUNT(*) as count FROM users WHERE role = ? AND course_id IS NOT NULL GROUP BY course_id').all('student');
    console.log('Students per course:');
    studentCourses.forEach(sc => {
      const course = courses.find(c => c.id === sc.course_id);
      console.log(`  Course ID ${sc.course_id} (${course ? course.course_name : 'Unknown'}): ${sc.count} students`);
    });

    console.log('\n=== CHECKING FOR MIGRATION FILES ===');
    const dbDir = path.join(__dirname, '../database');
    const files = fs.readdirSync(dbDir);
    const migrationFiles = files.filter(f => f.includes('course') || f.includes('init') || f.includes('seed') || f.includes('migrate'));
    console.log('Course-related files:', migrationFiles);

    console.log('\n=== CHECKING BACKUP/OLD DATABASES ===');
    const projectRoot = path.join(__dirname, '../../');
    const possibleBackups = [
      path.join(projectRoot, 'mushagashe.db'),
      path.join(projectRoot, 'database/mushagashe.db.backup'),
      path.join(projectRoot, 'database/mushagashe.db.old'),
      path.join(projectRoot, 'database/backup'),
    ];

    possibleBackups.forEach(backupPath => {
      if (fs.existsSync(backupPath)) {
        console.log(`Found backup: ${backupPath}`);
      }
    });

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

inspectCourses();
