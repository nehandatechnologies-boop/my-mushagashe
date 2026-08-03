const supabase = require('../config/supabase');

async function fixAdminStatus() {
  try {
    console.log('Updating admin user status to active...');
    
    const { data, error } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('email', 'admin@mushagashe.edu')
      .select();
    
    if (error) {
      console.error('Error updating admin status:', error);
      process.exit(1);
    }
    
    console.log('Admin user updated successfully:', data);
    
    // Verify the update
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, email, role, status')
      .eq('email', 'admin@mushagashe.edu')
      .single();
    
    if (fetchError) {
      console.error('Error fetching admin user:', fetchError);
    } else {
      console.log('Current admin user status:', user);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

fixAdminStatus();
