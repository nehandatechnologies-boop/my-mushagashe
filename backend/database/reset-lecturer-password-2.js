const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetLecturerPassword() {
  try {
    const hashedPassword = bcrypt.hashSync('lecturer123', 10);
    
    const { data: updatedLecturer, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', 'testlecturer@test.com')
      .select()
      .single();

    if (error) {
      console.error('Error updating lecturer password:', error);
      return;
    }

    console.log('Lecturer password reset:', updatedLecturer);
    console.log('Use: email: testlecturer@test.com, password: lecturer123');

  } catch (error) {
    console.error('Error:', error);
  }
}

resetLecturerPassword();