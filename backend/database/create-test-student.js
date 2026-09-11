const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestStudent() {
  try {
    const hashedPassword = bcrypt.hashSync('student123', 10);
    
    const { data: newStudent, error } = await supabase
      .from('users')
      .insert({
        student_number: 'TEST001',
        full_name: 'Test Student',
        email: 'test@student.edu',
        password: hashedPassword,
        role: 'student',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test student:', error);
      return;
    }

    console.log('Test student created:', newStudent);
    console.log('Use: student_number: TEST001, password: student123');

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestStudent();