const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function inspectStudentData() {
  try {
    console.log('=== CURRENT STUDENT DATA ===');
    const students = db.prepare('SELECT id, student_number, full_name, email, course_id, gender, status, created_at FROM users WHERE role = ? ORDER BY id').all('student');
    console.log(`Total students: ${students.length}`);

    // Identify test vs legitimate students
    const testStudents = students.filter(s => s.student_number && s.student_number.startsWith('stu-'));
    const legitimateStudents = students.filter(s => !s.student_number || !s.student_number.startsWith('stu-'));

    console.log(`\nTest students (stu-xxx): ${testStudents.length}`);
    if (testStudents.length > 0) {
      console.log('Sample test students:');
      testStudents.slice(0, 10).forEach(s => {
        console.log(`  ${s.student_number} - ${s.full_name} (ID: ${s.id}, Course: ${s.course_id})`);
      });
    }

    console.log(`\nLegitimate students: ${legitimateStudents.length}`);
    if (legitimateStudents.length > 0) {
      console.log('Legitimate students:');
      legitimateStudents.forEach(s => {
        console.log(`  ${s.student_number || 'NULL'} - ${s.full_name} (ID: ${s.id}, Course: ${s.course_id})`);
      });
    }

    // Check for NULL values
    const nullEmails = students.filter(s => !s.email);
    const nullGender = students.filter(s => !s.gender);
    const nullCourse = students.filter(s => !s.course_id);

    console.log(`\nNULL email: ${nullEmails.length}`);
    console.log(`NULL gender: ${nullGender.length}`);
    console.log(`NULL course_id: ${nullCourse.length}`);

    // Check current schema
    console.log('\n=== CURRENT USERS TABLE SCHEMA ===');
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    tableInfo.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

inspectStudentData();
