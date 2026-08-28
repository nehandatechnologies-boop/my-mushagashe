const supabase = require('../config/supabase');

class AuditLog {
  static async create(auditData) {
    const {
      user_id,
      user_role,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent,
      success = true,
      error_message
    } = auditData;

    const insertData = {
      user_id,
      user_role,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent,
      success,
      error_message
    };

    // Remove undefined values
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      }
    });

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Audit log creation error:', error);
      // Don't throw error - audit logging should not break the main application
      return null;
    }

    return data;
  }

  static async findByUserId(userId, limit = 100) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async findByResource(resourceType, resourceId, limit = 100) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async findByAction(action, limit = 100) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async findAll(filters = {}, limit = 100, offset = 0) {
    let query = supabase
      .from('audit_logs')
      .select('*');

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.user_role) {
      query = query.eq('user_role', filters.user_role);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }

    if (filters.success !== undefined) {
      query = query.eq('success', filters.success);
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
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  static async getStatistics(startDate, endDate) {
    let query = supabase
      .from('audit_logs')
      .select('action, resource_type, user_role, success');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total_events: data.length,
      successful_events: data.filter(l => l.success).length,
      failed_events: data.filter(l => !l.success).length,
      by_action: {},
      by_resource_type: {},
      by_user_role: {}
    };

    data.forEach(log => {
      stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;
      stats.by_resource_type[log.resource_type] = (stats.by_resource_type[log.resource_type] || 0) + 1;
      stats.by_user_role[log.user_role] = (stats.by_user_role[log.user_role] || 0) + 1;
    });

    return stats;
  }

  static async deleteOldLogs(daysToKeep) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    return true;
  }
}

module.exports = AuditLog;
