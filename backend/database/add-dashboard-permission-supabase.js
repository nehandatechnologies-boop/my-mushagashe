const supabase = require('../config/supabase');

async function addDashboardPermission() {
  try {
    console.log('Adding dashboard.view permission to Supabase RBAC schema...');

    // Add the dashboard.view permission
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .insert({
        name: 'dashboard.view',
        description: 'View dashboard and statistics',
        category: 'dashboard'
      })
      .select()
      .single();

    if (permError && permError.code !== '23505') { // Ignore duplicate key error
      console.error('Error inserting permission:', permError);
      throw permError;
    }

    let permissionId;
    if (permission) {
      permissionId = permission.id;
      console.log(`dashboard.view permission created with ID: ${permissionId}`);
    } else {
      // Permission already exists, fetch its ID
      const { data: existingPerm } = await supabase
        .from('permissions')
        .select('id')
        .eq('name', 'dashboard.view')
        .single();
      permissionId = existingPerm.id;
      console.log(`dashboard.view permission already exists with ID: ${permissionId}`);
    }

    // Get role IDs
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name')
      .in('name', ['SUPER_ADMIN', 'ACADEMIC_ADMIN', 'FINANCE_ADMIN', 'ADMISSIONS_ADMIN', 'LECTURER_ADMIN']);

    if (!roles || roles.length === 0) {
      console.error('No roles found in database');
      return;
    }

    console.log('Found roles:', roles.map(r => r.name));

    // Assign permission to each role
    for (const role of roles) {
      const { error: assignError } = await supabase
        .from('role_permissions')
        .insert({
          role_id: role.id,
          permission_id: permissionId
        });

      if (assignError && assignError.code !== '23505') { // Ignore duplicate
        console.error(`Error assigning to ${role.name}:`, assignError);
      } else {
        console.log(`Assigned dashboard.view to ${role.name}`);
      }
    }

    // Verify the assignment
    const { data: verify } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions (name, description, category),
        role_id,
        roles (name)
      `)
      .eq('permission_id', permissionId);

    console.log('\nVerification:');
    console.log(JSON.stringify(verify, null, 2));

    console.log('\nDashboard permission migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

addDashboardPermission();
