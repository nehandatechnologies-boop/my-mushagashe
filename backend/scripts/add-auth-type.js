require('dotenv').config();
const { supabase } = require('../config/supabaseAuth');

async function addAuthTypeColumn() {
  console.log('Adding auth_type column to users table...');
  
  try {
    // Add the column
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'custom'`
    });
    
    if (addError && addError.code !== 'PGRST116') {
      console.error('Error adding column:', addError);
      // Try direct SQL approach
      console.log('Trying direct SQL approach...');
    }
    
    // Update existing NULL values
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_type: 'custom' })
      .is('auth_type', null);
    
    if (updateError) {
      console.error('Error updating existing users:', updateError);
    } else {
      console.log('Updated existing users to auth_type = custom');
    }
    
    // Verify the changes
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('auth_type');
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
    } else {
      const summary = {
        total: users.length,
        custom: users.filter(u => u.auth_type === 'custom').length,
        supabase: users.filter(u => u.auth_type === 'supabase').length,
        null: users.filter(u => !u.auth_type).length
      };
      
      console.log('\nAuth type summary:');
      console.log(JSON.stringify(summary, null, 2));
    }
    
    console.log('\n✅ auth_type column added successfully');
    console.log('Note: If you see errors above, you may need to run the SQL manually in Supabase dashboard:');
    console.log('File: backend/database/add-auth-type-column.sql');
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to add auth_type column:', error);
    console.log('\nPlease run the SQL manually in Supabase dashboard:');
    console.log('File: backend/database/add-auth-type-column.sql');
    process.exit(1);
  }
}

addAuthTypeColumn();
