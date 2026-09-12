const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStudents() {
  try {
    console.log('Starting safe student reset...');

    // First, get all student IDs
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, student_number, full_name')
      .eq('role', 'student');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return;
    }

    console.log(`Found ${students.length} students to delete`);

    if (students.length === 0) {
      console.log('No students to delete');
      return;
    }

    // Delete dependent records for each student
    let deletedFees = 0;
    let deletedResults = 0;
    let deletedAnnouncements = 0;
    let deletedAuditLogs = 0;

    for (const student of students) {
      // Delete fees
      const { error: feesError } = await supabase
        .from('fees')
        .delete()
        .eq('user_id', student.id);

      if (!feesError) {
        deletedFees++;
      }

      // Delete results
      const { error: resultsError } = await supabase
        .from('results')
        .delete()
        .eq('user_id', student.id);

      if (!resultsError) {
        deletedResults++;
      }

      // Delete announcements
      const { error: announcementsError } = await supabase
        .from('announcements')
        .delete()
        .eq('created_by', student.id);

      if (!announcementsError) {
        deletedAnnouncements++;
      }

      // Delete audit logs
      const { error: auditLogsError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('user_id', student.id);

      if (!auditLogsError) {
        deletedAuditLogs++;
      }
    }

    console.log(`Deleted dependent records: ${deletedFees} fees, ${deletedResults} results, ${deletedAnnouncements} announcements, ${deletedAuditLogs} audit logs`);

    // Now delete the students
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('role', 'student');

    if (deleteError) {
      console.error('Error deleting students:', deleteError);
      return;
    }

    console.log(`✓ Deleted ${students.length} student records`);

    // Verify deletion
    const { count: remainingCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    console.log(`Remaining students: ${remainingCount}`);

    // Verify admins and lecturers are preserved
    const { count: adminCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .or('role.eq.admin,role.eq.SUPER_ADMIN,role.eq.ACADEMIC_ADMIN,role.eq.FINANCE_ADMIN,role.eq.ADMISSIONS_ADMIN,role.eq.LECTURER_ADMIN');

    const { count: lecturerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'lecturer');

    console.log(`Administrators preserved: ${adminCount}`);
    console.log(`Lecturers preserved: ${lecturerCount}`);

    console.log('✓ Student reset complete');

  } catch (error) {
    console.error('Error:', error);
  }
}

resetStudents();
