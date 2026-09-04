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
    // Get total announcements
    const { count: totalAnnouncements, error: countError } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get read announcement IDs for this user
    const { data: readAnnouncements, error: readError } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId);

    if (readError) throw readError;

    const readIds = readAnnouncements.map(r => r.announcement_id);
    const unreadCount = totalAnnouncements - readIds.length;

    return Math.max(0, unreadCount);
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
