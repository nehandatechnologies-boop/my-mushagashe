const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://krenyvbcwtbwcsrpiryf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZW55dmJjd3Rid2NzcnBpcnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDYxMDgsImV4cCI6MjEwMTIyMjEwOH0.ePaoY-bRwmRFo2Rd2eA_XY_EllShPtC178eyUXnUl-I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAdminAccount() {
  try {
    // Check current admin account
    const { data: existingAdmin, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@mushagashe.edu')
      .single();

    if (fetchError) {
      console.error('Error fetching admin:', fetchError);
      return;
    }

    console.log('Current admin account:', existingAdmin);

    // Update to SUPER_ADMIN role and reset password
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'SUPER_ADMIN',
        password: hashedPassword
      })
      .eq('email', 'admin@mushagashe.edu')
      .select()
      .single();

    if (updateError) {
      console.error('Error updating admin:', updateError);
      return;
    }

    console.log('Updated admin account:', updatedAdmin);
    console.log('Admin successfully migrated to SUPER_ADMIN with password admin123');

  } catch (error) {
    console.error('Error:', error);
  }
}

updateAdminAccount();