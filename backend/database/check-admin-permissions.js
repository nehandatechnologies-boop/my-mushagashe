const supabase = require('../config/supabase');

async function checkAdminPermissions() {
  // Get the main admin account
  const { data: admin, error: adminError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@mushagashe.edu')
    .single();

  if (adminError) {
    console.error('Error fetching admin:', adminError);
    return;
  }

  console.log('=== ADMIN ACCOUNT ===');
  console.log('ID:', admin.id);
  console.log('Email:', admin.email);
  console.log('Role:', admin.role);
  console.log('Status:', admin.status);
  console.log();

  // Get role from roles table
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('*')
    .eq('name', admin.role)
    .single();

  if (roleError) {
    console.log('Role not found in roles table (may be legacy role)');
  } else {
    console.log('=== ROLE DETAILS ===');
    console.log('Role ID:', role.id);
    console.log('Role Name:', role.name);
    console.log('Display Name:', role.display_name);
    console.log();
  }

  // Get permissions for this role
  const { data: permissions, error: permError } = await supabase
    .from('role_permissions')
    .select(`
      permissions (name, description, category)
    `)
    .eq('role_id', role?.id);

  if (permError) {
    console.error('Error fetching permissions:', permError);
  } else {
    console.log('=== PERMISSIONS ASSIGNED ===');
    if (permissions && permissions.length > 0) {
      permissions.forEach(p => {
        console.log(`- ${p.permissions.name} (${p.permissions.category})`);
      });
      console.log(`Total: ${permissions.length} permissions`);
    } else {
      console.log('No permissions assigned to this role');
    }
    console.log();
  }

  // Check specific permissions that are failing
  const specificPerms = ['dashboard.view', 'students.approve'];
  console.log('=== CHECKING SPECIFIC PERMISSIONS ===');

  for (const permName of specificPerms) {
    const { data: perm } = await supabase
      .from('permissions')
      .select('*')
      .eq('name', permName)
      .single();

    if (perm) {
      console.log(`✓ ${permName} exists in permissions table (ID: ${perm.id})`);

      // Check if this role has it
      const { data: mapping } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', role?.id)
        .eq('permission_id', perm.id)
        .single();

      if (mapping) {
        console.log(`  ✓ Assigned to ${admin.role}`);
      } else {
        console.log(`  ✗ NOT assigned to ${admin.role}`);
      }
    } else {
      console.log(`✗ ${permName} does NOT exist in permissions table`);
    }
  }
}

checkAdminPermissions();
