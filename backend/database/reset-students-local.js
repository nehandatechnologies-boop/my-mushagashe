const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
const db = new Database(dbPath);

async function resetStudents() {
  try {
    console.log('Starting safe student reset (local SQLite)...');

    // Get all student IDs
    const students = db.prepare('SELECT id, student_number, full_name FROM users WHERE role = ?').all('student');

    console.log(`Found ${students.length} students to delete`);

    if (students.length === 0) {
      console.log('No students to delete');
      return;
    }

    // Delete dependent records
    let deletedFees = 0;
    let deletedResults = 0;
    let deletedAnnouncements = 0;
    let deletedAuditLogs = 0;

    for (const student of students) {
      // Delete fees
      const feeResult = db.prepare('DELETE FROM fees WHERE user_id = ?').run(student.id);
      deletedFees += feeResult.changes;

      // Delete results
      const resultDelete = db.prepare('DELETE FROM results WHERE user_id = ?').run(student.id);
      deletedResults += resultDelete.changes;

      // Delete announcements
      const announcementDelete = db.prepare('DELETE FROM announcements WHERE created_by = ?').run(student.id);
      deletedAnnouncements += announcementDelete.changes;

      // Delete audit logs
      const auditLogDelete = db.prepare('DELETE FROM audit_logs WHERE user_id = ?').run(student.id);
      deletedAuditLogs += auditLogDelete.changes;
    }

    console.log(`Deleted dependent records: ${deletedFees} fees, ${deletedResults} results, ${deletedAnnouncements} announcements, ${deletedAuditLogs} audit logs`);

    // Delete students
    const deleteResult = db.prepare('DELETE FROM users WHERE role = ?').run('student');

    console.log(`✓ Deleted ${deleteResult.changes} student records`);

    // Verify deletion
    const remainingCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('student');
    console.log(`Remaining students: ${remainingCount.count}`);

    // Verify admins and lecturers are preserved
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('admin', 'SUPER_ADMIN', 'ACADEMIC_ADMIN', 'FINANCE_ADMIN', 'ADMISSIONS_ADMIN', 'LECTURER_ADMIN')").get();
    const lecturerCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'lecturer'").get();

    console.log(`Administrators preserved: ${adminCount.count}`);
    console.log(`Lecturers preserved: ${lecturerCount.count}`);

    console.log('✓ Student reset complete');

    db.close();
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

resetStudents();
