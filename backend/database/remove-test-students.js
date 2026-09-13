const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function removeTestStudents() {
  try {
    console.log('=== REMOVING TEST STUDENTS ===');

    // Identify test students (stu-xxx format)
    const testStudents = db.prepare('SELECT id, student_number, full_name FROM users WHERE role = ? AND student_number LIKE ?').all('student', 'stu-%');
    console.log(`Found ${testStudents.length} test students`);

    if (testStudents.length === 0) {
      console.log('No test students to remove');
      db.close();
      return;
    }

    // Delete dependent records first
    let deletedFees = 0;
    let deletedResults = 0;
    let deletedAnnouncements = 0;
    let deletedAuditLogs = 0;

    testStudents.forEach(student => {
      const feeResult = db.prepare('DELETE FROM fees WHERE user_id = ?').run(student.id);
      deletedFees += feeResult.changes;

      const resultDelete = db.prepare('DELETE FROM results WHERE user_id = ?').run(student.id);
      deletedResults += resultDelete.changes;

      const announcementDelete = db.prepare('DELETE FROM announcements WHERE created_by = ?').run(student.id);
      deletedAnnouncements += announcementDelete.changes;

      const auditLogDelete = db.prepare('DELETE FROM audit_logs WHERE user_id = ?').run(student.id);
      deletedAuditLogs += auditLogDelete.changes;
    });

    console.log(`Deleted dependent records: ${deletedFees} fees, ${deletedResults} results, ${deletedAnnouncements} announcements, ${deletedAuditLogs} audit logs`);

    // Delete test students
    const deleteResult = db.prepare('DELETE FROM users WHERE role = ? AND student_number LIKE ?').run('student', 'stu-%');
    console.log(`✓ Deleted ${deleteResult.changes} test student records`);

    // Verify remaining students
    const remainingStudents = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('student');
    console.log(`Remaining students: ${remainingStudents.count}`);

    // Verify admins and lecturers are preserved
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('admin', 'SUPER_ADMIN', 'ACADEMIC_ADMIN', 'FINANCE_ADMIN', 'ADMISSIONS_ADMIN', 'LECTURER_ADMIN')").get();
    const lecturerCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'lecturer'").get();

    console.log(`Administrators preserved: ${adminCount.count}`);
    console.log(`Lecturers preserved: ${lecturerCount.count}`);

    console.log('✓ Test student cleanup complete');

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

removeTestStudents();
