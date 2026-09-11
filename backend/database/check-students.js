const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudents() {
  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('id, student_number, full_name, email, role, status')
      .eq('role', 'student');

    if (error) {
      console.error('Error fetching students:', error);
      return;
    }

    console.log('Students in database:', JSON.stringify(students, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

checkStudents();