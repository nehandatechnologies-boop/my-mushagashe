const supabase = require('../config/supabase');
const User = require('../models/User');
const { logDataModification, logDataAccess } = require('../middleware/auditLogger');

// Create privacy request
const createPrivacyRequest = async (req, res) => {
  try {
    const { request_type, description } = req.body;
    const userId = req.user.id;

    // Validation
    const validTypes = ['ACCESS', 'DELETION', 'CORRECTION', 'PORTABILITY', 'OBJECTION'];
    if (!validTypes.includes(request_type)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    const { data, error } = await supabase
      .from('privacy_requests')
      .insert({
        user_id: userId,
        request_type,
        description,
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;

    // Log the request
    await logDataModification(req.user, 'CREATE', 'PRIVACY_REQUEST', data.id, null, data, req.ip, req.get('user-agent'));

    res.status(201).json({
      message: 'Privacy request submitted successfully',
      request: data
    });
  } catch (error) {
    console.error('Create privacy request error:', error);
    res.status(500).json({ error: 'Failed to submit privacy request' });
  }
};

// Get user's privacy requests
const getUserPrivacyRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('privacy_requests')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get privacy requests error:', error);
    res.status(500).json({ error: 'Failed to fetch privacy requests' });
  }
};

// Get all privacy requests (admin/DPO only)
const getAllPrivacyRequests = async (req, res) => {
  try {
    const { status, request_type } = req.query;

    let query = supabase
      .from('privacy_requests')
      .select(`
        *,
        users (
          id,
          full_name,
          email,
          student_number
        )
      `);

    if (status) {
      query = query.eq('status', status);
    }

    if (request_type) {
      query = query.eq('request_type', request_type);
    }

    query = query.order('requested_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get all privacy requests error:', error);
    res.status(500).json({ error: 'Failed to fetch privacy requests' });
  }
};

// Update privacy request status (admin/DPO only)
const updatePrivacyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {
      status,
      notes,
      processed_by: req.user.id,
      completed_at: status === 'COMPLETED' || status === 'REJECTED' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('privacy_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log the update
    await logDataModification(req.user, 'UPDATE', 'PRIVACY_REQUEST', id, null, updateData, req.ip, req.get('user-agent'));

    res.json(data);
  } catch (error) {
    console.error('Update privacy request error:', error);
    res.status(500).json({ error: 'Failed to update privacy request' });
  }
};

// Export user data (for data portability requests)
const exportUserData = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only allow users to export their own data, or admins to export any data
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && parseInt(id) !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user data
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get related data (results, fees, etc.)
    const [resultsData, feesData] = await Promise.all([
      supabase.from('results').select('*').eq('user_id', id),
      supabase.from('fees').select('*').eq('user_id', id)
    ]);

    // Get privacy consents
    const consentsData = await supabase
      .from('privacy_consents')
      .select('*')
      .eq('user_id', id);

    const exportData = {
      user: {
        full_name: user.full_name,
        email: user.email,
        student_number: user.student_number,
        phone: user.phone,
        gender: user.gender,
        national_id: user.national_id,
        date_of_birth: user.date_of_birth,
        address: user.address,
        guardian_name: user.guardian_name,
        guardian_phone: user.guardian_phone,
        intake_year: user.intake_year,
        course_id: user.course_id,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      },
      academic_results: resultsData.data || [],
      fee_records: feesData.data || [],
      privacy_consents: consentsData.data || [],
      export_date: new Date().toISOString(),
      export_requested_by: req.user.id
    };

    // Log the export
    await logDataAccess(req.user, 'USER_DATA_EXPORT', id, req.ip, req.get('user-agent'));

    res.json(exportData);
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
};

// Get current privacy notice
const getCurrentPrivacyNotice = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('privacy_notices')
      .select('*')
      .eq('is_current', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'No current privacy notice found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Get privacy notice error:', error);
    res.status(500).json({ error: 'Failed to fetch privacy notice' });
  }
};

// Get user's consent status
const getUserConsentStatus = async (req, res) => {
  try {
    const userId = req.user.id;

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

    // Group by consent type and get latest status
    const consentStatus = {};
    data.forEach(consent => {
      if (!consentStatus[consent.consent_type] || consent.consented_at > consentStatus[consent.consent_type].consented_at) {
        consentStatus[consent.consent_type] = {
          consented: consent.consented && !consent.withdrawn_at,
          consented_at: consent.consented_at,
          withdrawn_at: consent.withdrawn_at,
          notice_version: consent.privacy_notices?.version
        };
      }
    });

    res.json(consentStatus);
  } catch (error) {
    console.error('Get consent status error:', error);
    res.status(500).json({ error: 'Failed to fetch consent status' });
  }
};

// Update user consent
const updateUserConsent = async (req, res) => {
  try {
    const { consent_type, consented } = req.body;
    const userId = req.user.id;

    // Get current privacy notice
    const { data: notice } = await supabase
      .from('privacy_notices')
      .select('*')
      .eq('is_current', true)
      .single();

    if (!notice) {
      return res.status(404).json({ error: 'No current privacy notice found' });
    }

    // Withdraw existing consent of this type
    await supabase
      .from('privacy_consents')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('consent_type', consent_type)
      .is('withdrawn_at', null);

    // If consenting, create new consent record
    let newConsent = null;
    if (consented) {
      const { data, error } = await supabase
        .from('privacy_consents')
        .insert({
          user_id: userId,
          notice_id: notice.id,
          consent_type,
          consented: true,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        })
        .select()
        .single();

      if (error) throw error;
      newConsent = data;
    }

    // Log the consent change
    await logDataModification(req.user, 'UPDATE_CONSENT', 'PRIVACY_CONSENT', userId, null, { consent_type, consented }, req.ip, req.get('user-agent'));

    res.json({
      message: 'Consent updated successfully',
      consent: newConsent
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({ error: 'Failed to update consent' });
  }
};

module.exports = {
  createPrivacyRequest,
  getUserPrivacyRequests,
  getAllPrivacyRequests,
  updatePrivacyRequest,
  exportUserData,
  getCurrentPrivacyNotice,
  getUserConsentStatus,
  updateUserConsent
};
