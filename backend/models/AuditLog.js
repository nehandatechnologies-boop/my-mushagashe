const supabase = require('../config/supabase');

class AuditLog {
  static async create(logData) {
    const {
      admin_id,
      action,
      target_type,
      target_id,
      description,
      metadata,
      ip_address
    } = logData;

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: admin_id,
        action,
        entity_type: target_type,
        entity_id: target_id,
        details: description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip_address
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (
          full_name,
          email,
          role
        )
      `);

    if (filters.admin_id) {
      query = query.eq('user_id', filters.admin_id);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.target_type) {
      query = query.eq('entity_type', filters.target_type);
    }

    if (filters.target_id) {
      query = query.eq('entity_id', filters.target_id);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten nested user data
    return data.map(log => {
      if (log.users) {
        log.admin_name = log.users.full_name;
        log.admin_email = log.users.email;
        log.admin_role = log.users.role;
        delete log.users;
      }
      // Parse metadata if it exists
      if (log.metadata && typeof log.metadata === 'string') {
        try {
          log.metadata = JSON.parse(log.metadata);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return log;
    });
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (
          full_name,
          email,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten nested user data
    if (data && data.users) {
      data.admin_name = data.users.full_name;
      data.admin_email = data.users.email;
      data.admin_role = data.users.role;
      delete data.users;
    }

    // Parse metadata if it exists
    if (data && data.metadata && typeof data.metadata === 'string') {
      try {
        data.metadata = JSON.parse(data.metadata);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    return data;
  }

  static async getRecentLogs(limit = 20) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (
          full_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Flatten nested user data
    return data.map(log => {
      if (log.users) {
        log.admin_name = log.users.full_name;
        log.admin_email = log.users.email;
        log.admin_role = log.users.role;
        delete log.users;
      }
      return log;
    });
  }

  static async getLogsByAdmin(adminId, limit = 50) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (
          full_name,
          email,
          role
        )
      `)
      .eq('user_id', adminId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Flatten nested user data
    return data.map(log => {
      if (log.users) {
        log.admin_name = log.users.full_name;
        log.admin_email = log.users.email;
        log.admin_role = log.users.role;
        delete log.users;
      }
      return log;
    });
  }

  static async getActionCounts(filters = {}) {
    let query = supabase
      .from('audit_logs')
      .select('action');

    if (filters.admin_id) {
      query = query.eq('user_id', filters.admin_id);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Count actions
    const counts = {};
    data.forEach(log => {
      counts[log.action] = (counts[log.action] || 0) + 1;
    });

    return counts;
  }
}

module.exports = AuditLog;
