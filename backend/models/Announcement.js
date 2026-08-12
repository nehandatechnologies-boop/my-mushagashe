const supabase = require('../config/supabase');

class Announcement {
  static async create(announcementData) {
    const { title, message, priority, created_by } = announcementData;

    const { data, error } = await supabase
      .from('announcements')
      .insert({ 
        title, 
        message, 
        priority: priority || 'normal', 
        created_by
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        users:created_by (
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Flatten the nested user data
    if (data && data.users) {
      data.creator_name = data.users.full_name;
      delete data.users;
    }

    return data;
  }

  static async findAll(filters = {}) {
    let query = supabase
      .from('announcements')
      .select(`
        *,
        users:created_by (
          full_name
        )
      `);

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten the nested user data
    return data.map(announcement => {
      if (announcement.users) {
        announcement.creator_name = announcement.users.full_name;
        delete announcement.users;
      }
      return announcement;
    });
  }

  static async getLatest(limit = 5) {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        users:created_by (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Flatten the nested user data
    return data.map(announcement => {
      if (announcement.users) {
        announcement.creator_name = announcement.users.full_name;
        delete announcement.users;
      }
      return announcement;
    });
  }

  static async getUrgent() {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        users:created_by (
          full_name
        )
      `)
      .in('priority', ['urgent', 'important'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Flatten the nested user data
    return data.map(announcement => {
      if (announcement.users) {
        announcement.creator_name = announcement.users.full_name;
        delete announcement.users;
      }
      return announcement;
    });
  }

  static async update(id, announcementData) {
    const { title, message, priority } = announcementData;

    const { data, error } = await supabase
      .from('announcements')
      .update({ 
        title, 
        message, 
        priority
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getStatistics() {
    const { data, error } = await supabase
      .from('announcements')
      .select('priority');

    if (error) throw error;

    const stats = {
      total: data.length,
      urgent_count: data.filter(a => a.priority === 'urgent').length,
      important_count: data.filter(a => a.priority === 'important').length,
      normal_count: data.filter(a => a.priority === 'normal').length,
      low_count: data.filter(a => a.priority === 'low').length
    };

    return stats;
  }
}

module.exports = Announcement;
