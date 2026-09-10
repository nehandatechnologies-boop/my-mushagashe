const supabase = require('../config/supabase');

class Permission {
  static async findAll() {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async findByRole(roleName) {
    // Get role ID first
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError) {
      if (roleError.code === 'PGRST116') return []; // Role not found
      throw roleError;
    }

    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          id,
          name,
          description,
          category
        )
      `)
      .eq('role_id', roleData.id);

    if (error) throw error;

    // Flatten the nested data
    return data.map(rp => rp.permissions).filter(p => p !== null);
  }

  static async hasPermission(roleName, permissionName) {
    // SUPER_ADMIN has all permissions
    if (roleName === 'SUPER_ADMIN' || roleName === 'super_admin') {
      return true;
    }

    // Get role ID first
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError) {
      if (roleError.code === 'PGRST116') return false; // Role not found
      throw roleError;
    }

    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          name
        )
      `)
      .eq('role_id', roleData.id)
      .eq('permissions.name', permissionName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // Not found
      throw error;
    }

    return !!data;
  }

  static async hasAnyPermission(roleName, permissionNames) {
    // SUPER_ADMIN has all permissions
    if (roleName === 'SUPER_ADMIN' || roleName === 'super_admin') {
      return true;
    }

    // Get role ID first
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError) {
      if (roleError.code === 'PGRST116') return false; // Role not found
      throw roleError;
    }

    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          name
        )
      `)
      .eq('role_id', roleData.id)
      .in('permissions.name', permissionNames);

    if (error) throw error;

    return data && data.length > 0;
  }

  static async assignPermissionToRole(roleId, permissionId) {
    const { data, error } = await supabase
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async removePermissionFromRole(roleId, permissionId) {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    if (error) throw error;
    return true;
  }

  static async getPermissionsByCategory(category) {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getRoleByName(roleName) {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('name', roleName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async getAllRoles() {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }
}

module.exports = Permission;
