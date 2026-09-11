const supabase = require('../config/supabase');

async function testQuery() {
  console.log('Testing current RBAC query method...');
  
  // Test the current (broken) query
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permissions(name, description, category)')
      .innerJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
      .innerJoin('roles', 'role_permissions.role_id', 'roles.id')
      .eq('roles.name', 'SUPER_ADMIN');
    
    if (error) {
      console.error('Current query ERROR:', error);
    } else {
      console.log('Current query SUCCESS:', data?.length, 'permissions');
    }
  } catch (e) {
    console.error('Current query EXCEPTION:', e.message);
  }
  
  console.log('\nTesting correct Supabase query method...');
  
  // Test the correct Supabase query
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions (name, description, category),
        roles (name)
      `)
      .eq('roles.name', 'SUPER_ADMIN');
    
    if (error) {
      console.error('Correct query ERROR:', error);
    } else {
      console.log('Correct query SUCCESS:', data?.length, 'permissions');
      if (data && data.length > 0) {
        console.log('Sample permission:', data[0]);
      }
    }
  } catch (e) {
    console.error('Correct query EXCEPTION:', e.message);
  }
}

testQuery();
