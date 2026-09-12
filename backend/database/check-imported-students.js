const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function checkImportedStudents() {
  try {
    const students = db.prepare('SELECT id, student_number, full_name, course_id, gender, status FROM users WHERE role = ?').all('student');
    console.log(`Total students in database: ${students.length}`);

    if (students.length > 0) {
      console.log('Sample students:');
      students.slice(0, 10).forEach(student => {
        console.log(`  ${student.student_number} - ${student.full_name} (Course ID: ${student.course_id}, Gender: ${student.gender})`);
      });

      // Check for duplicate student numbers
      const studentNumbers = {};
      students.forEach(student => {
        const num = student.student_number;
        if (!studentNumbers[num]) {
          studentNumbers[num] = [];
        }
        studentNumbers[num].push(student);
      });

      const duplicates = {};
      Object.keys(studentNumbers).forEach(num => {
        if (studentNumbers[num].length > 1) {
          duplicates[num] = studentNumbers[num];
        }
      });

      if (Object.keys(duplicates).length > 0) {
        console.log(`Found ${Object.keys(duplicates).length} duplicate student numbers:`);
        Object.keys(duplicates).forEach(num => {
          console.log(`  ${num}: ${duplicates[num].length} records`);
        });
      } else {
        console.log('No duplicate student numbers found');
      }
    }

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

checkImportedStudents();
