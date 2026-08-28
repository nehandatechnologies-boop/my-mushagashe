const supabase = require('../config/supabase');

class PrivacyConsent {
  static async create(consentData) {
    const {
      user_id,
      notice_id,
      consent_type,
      consented,
      ip_address,
      user_agent
    } = consentData;

    const insertData = {
      user_id,
      notice_id,
      consent_type,
      consented,
      ip_address,
      user_agent,
      consented_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('privacy_consents')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('privacy_consents')
      .select(`
        *,
        privacy_notices (
          id,
          version,
          title,
          effective_date
        )
      `)
      .eq('user_id', userId)
      .order('consented_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async findByUserAndNotice(userId, noticeId) {
    const { data, error } = await supabase
      .from('privacy_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('notice_id', noticeId)
      .order('consented_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async updateConsent(userId, noticeId, consentType, consented, ipAddress, userAgent) {
    // First, withdraw any existing consent of this type
    await supabase
      .from('privacy_consents')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('notice_id', noticeId)
      .eq('consent_type', consentType)
      .is('withdrawn_at', null);

    // If consenting, create new consent record
    if (consented) {
      return await this.create({
        user_id: userId,
        notice_id: noticeId,
        consent_type: consentType,
        consented: true,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }

    return null;
  }

  static async hasActiveConsent(userId, consentType) {
    const { data, error } = await supabase
      .from('privacy_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('consented', true)
      .is('withdrawn_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // Not found
      throw error;
    }

    return !!data;
  }

  static async getConsentStatistics() {
    const { data, error } = await supabase
      .from('privacy_consents')
      .select('consent_type, consented');

    if (error) throw error;

    const stats = {
      total_consents: data.length,
      by_type: {},
      consented: 0,
      withdrawn: 0
    };

    data.forEach(consent => {
      stats.by_type[consent.consent_type] = (stats.by_type[consent.consent_type] || 0) + 1;
      if (consent.withdrawn_at) {
        stats.withdrawn++;
      } else {
        stats.consented++;
      }
    });

    return stats;
  }
}

class PrivacyNotice {
  static async create(noticeData) {
    const {
      version,
      title,
      content,
      effective_date,
      is_current = false
    } = noticeData;

    // If this is marked as current, unmark all others
    if (is_current) {
      await supabase
        .from('privacy_notices')
        .update({ is_current: false })
        .eq('is_current', true);
    }

    const insertData = {
      version,
      title,
      content,
      effective_date,
      is_current
    };

    const { data, error } = await supabase
      .from('privacy_notices')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getCurrent() {
    const { data, error } = await supabase
      .from('privacy_notices')
      .select('*')
      .eq('is_current', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No current notice
      throw error;
    }

    return data;
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('privacy_notices')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async setCurrent(noticeId) {
    // First, unmark all others
    await supabase
      .from('privacy_notices')
      .update({ is_current: false })
      .eq('is_current', true);

    // Mark this one as current
    const { data, error } = await supabase
      .from('privacy_notices')
      .update({ is_current: true })
      .eq('id', noticeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = { PrivacyConsent, PrivacyNotice };
