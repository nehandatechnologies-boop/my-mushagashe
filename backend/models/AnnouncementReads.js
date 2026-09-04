const supabase = require('../config/supabase');

class AnnouncementReads {
  static async markAsRead(userId, announcementId) {
    const { data, error } = await supabase
      .from('announcement_reads')
      .upsert({
        user_id: userId,
        announcement_id: announcementId,
        read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,announcement_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUnreadCount(userId) {
    try {
      // Get total announcements
      const { count: totalAnnouncements, error: countError } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error counting announcements:', countError);
        // If table doesn't exist or other error, return 0
        return 0;
      }

      // Get read announcement IDs for this user
      const { data: readAnnouncements, error: readError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId);

      if (readError) {
        console.error('Error fetching read announcements:', readError);
        // If table doesn't exist or other error, assume no reads
        return totalAnnouncements || 0;
      }

      const readIds = readAnnouncements ? readAnnouncements.map(r => r.announcement_id) : [];
      const unreadCount = (totalAnnouncements || 0) - readIds.length;

      return Math.max(0, unreadCount);
    } catch (error) {
      console.error('Unexpected error in getUnreadCount:', error);
      return 0;
    }
  }

  static async getReadAnnouncements(userId) {
    const { data, error } = await supabase
      .from('announcement_reads')
      .select('announcement_id, read_at')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  static async isAnnouncementRead(userId, announcementId) {
    const { data, error } = await supabase
      .from('announcement_reads')
      .select('id')
      .eq('user_id', userId)
      .eq('announcement_id', announcementId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // Not found
      throw error;
    }

    return !!data;
  }
}

module.exports = AnnouncementReads;
