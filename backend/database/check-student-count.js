const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudentData() {
  try {
    // Check total student count
    const { count: totalCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    if (countError) {
      console.error('Error counting students:', countError);
      return;
    }

    console.log(`Total students: ${totalCount}`);

    // Check for duplicate student numbers
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, student_number, full_name')
      .eq('role', 'student');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return;
    }

    // Group by student_number
    const studentNumbers = {};
    students.forEach(student => {
      const num = student.student_number;
      if (!studentNumbers[num]) {
        studentNumbers[num] = [];
      }
      studentNumbers[num].push(student);
    });

    // Find duplicates
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
        duplicates[num].forEach(s => {
          console.log(`    ID: ${s.id}, Name: ${s.full_name}`);
        });
      });
    } else {
      console.log('No duplicate student numbers found');
    }

    // Check admin and lecturer counts
    const { count: adminCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .or('role.eq.admin,role.eq.SUPER_ADMIN,role.eq.ACADEMIC_ADMIN,role.eq.FINANCE_ADMIN,role.eq.ADMISSIONS_ADMIN,role.eq.LECTURER_ADMIN');

    const { count: lecturerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'lecturer');

    console.log(`Administrators: ${adminCount}`);
    console.log(`Lecturers: ${lecturerCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkStudentData();
