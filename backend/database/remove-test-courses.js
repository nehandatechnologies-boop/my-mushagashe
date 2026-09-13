const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function removeTestCourses() {
  try {
    console.log('=== REMOVING TEST/SAMPLE COURSES ===');

    // Test courses created during testing (keep only original 8 courses from 2026-07-24)
    const testCourseIds = [9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    // First, check which courses have students
    const studentCourses = db.prepare('SELECT course_id, COUNT(*) as count FROM users WHERE role = ? AND course_id IS NOT NULL GROUP BY course_id').all('student');
    console.log('Students per course before removal:');
    studentCourses.forEach(sc => {
      console.log(`  Course ID ${sc.course_id}: ${sc.count} students`);
    });

    // Unassign students from test courses
    let unassignedCount = 0;
    testCourseIds.forEach(courseId => {
      const result = db.prepare('UPDATE users SET course_id = NULL WHERE course_id = ?').run(courseId);
      if (result.changes > 0) {
        console.log(`Unassigned ${result.changes} students from course ID ${courseId}`);
        unassignedCount += result.changes;
      }
    });

    console.log(`Total students unassigned: ${unassignedCount}`);

    // Remove test courses
    let removedCount = 0;
    testCourseIds.forEach(courseId => {
      const result = db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
      if (result.changes > 0) {
        console.log(`Removed course ID ${courseId}`);
        removedCount += result.changes;
      }
    });

    console.log(`Total courses removed: ${removedCount}`);

    // Verify remaining courses
    const remainingCourses = db.prepare('SELECT * FROM courses ORDER BY id').all();
    console.log('\n=== REMAINING COURSES ===');
    console.log(`Total remaining courses: ${remainingCourses.length}`);
    remainingCourses.forEach(course => {
      console.log(`  ID: ${course.id}, Code: ${course.course_code}, Name: ${course.course_name}, Dept: ${course.department}`);
    });

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

removeTestCourses();
