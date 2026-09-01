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

  static async findByRole(role) {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions (
          id,
          name,
          description,
          category
        )
      `)
      .eq('role', role);

    if (error) throw error;

    // Flatten the nested data
    return data.map(rp => rp.permissions);
  }

  static async hasPermission(role, permissionName) {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions (
          name
        )
      `)
      .eq('role', role)
      .eq('permissions.name', permissionName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // Not found
      throw error;
    }

    return !!data;
  }

  static async hasAnyPermission(role, permissionNames) {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions (
          name
        )
      `)
      .eq('role', role)
      .in('permissions.name', permissionNames);

    if (error) throw error;

    return data && data.length > 0;
  }

  static async assignPermissionToRole(role, permissionId) {
    const { data, error } = await supabase
      .from('role_permissions')
      .insert({ role, permission_id: permissionId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async removePermissionFromRole(role, permissionId) {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role)
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
}

module.exports = Permission;
