const supabase = require('../config/supabase');
const AuditLog = require('../models/AuditLog');
const { PrivacyConsent } = require('../models/PrivacyConsent');
const { logDataAccess } = require('../middleware/auditLogger');

// Get compliance dashboard overview
const getDashboardOverview = async (req, res) => {
  try {
    // Get audit log statistics
    const auditStats = await AuditLog.getStatistics();

    // Get privacy consent statistics
    const consentStats = await PrivacyConsent.getConsentStatistics();

    // Get privacy request statistics
    const { data: privacyRequests, error: requestsError } = await supabase
      .from('privacy_requests')
      .select('status, request_type');

    if (requestsError) throw requestsError;

    const requestStats = {
      total: privacyRequests.length,
      pending: privacyRequests.filter(r => r.status === 'PENDING').length,
      in_progress: privacyRequests.filter(r => r.status === 'IN_PROGRESS').length,
      completed: privacyRequests.filter(r => r.status === 'COMPLETED').length,
      rejected: privacyRequests.filter(r => r.status === 'REJECTED').length,
      by_type: {}
    };

    privacyRequests.forEach(r => {
      requestStats.by_type[r.request_type] = (requestStats.by_type[r.request_type] || 0) + 1;
    });

    // Get security events statistics
    const { data: securityEvents, error: securityError } = await supabase
      .from('security_events')
      .select('severity, resolved');

    if (securityError) throw securityError;

    const securityStats = {
      total: securityEvents.length,
      resolved: securityEvents.filter(e => e.resolved).length,
      unresolved: securityEvents.filter(e => !e.resolved).length,
      by_severity: {
        LOW: securityEvents.filter(e => e.severity === 'LOW').length,
        MEDIUM: securityEvents.filter(e => e.severity === 'MEDIUM').length,
        HIGH: securityEvents.filter(e => e.severity === 'HIGH').length,
        CRITICAL: securityEvents.filter(e => e.severity === 'CRITICAL').length
      }
    };

    // Get user statistics
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role, status');

    if (usersError) throw usersError;

    const userStats = {
      total: users.length,
      by_role: {},
      by_status: {
        active: users.filter(u => u.status === 'active').length,
        inactive: users.filter(u => u.status === 'inactive').length,
        suspended: users.filter(u => u.status === 'suspended').length
      }
    };

    users.forEach(u => {
      userStats.by_role[u.role] = (userStats.by_role[u.role] || 0) + 1;
    });

    res.json({
      audit_logs: auditStats,
      privacy_consents: consentStats,
      privacy_requests: requestStats,
      security_events: securityStats,
      users: userStats
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
};

// Get recent audit logs
const getRecentAuditLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const logs = await AuditLog.findAll(limit, offset);

    await logDataAccess(req.user, 'AUDIT_LOGS', null, req.ip, req.get('user-agent'));

    res.json(logs);
  } catch (error) {
    console.error('Get recent audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Get audit logs by user
const getAuditLogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const logs = await AuditLog.findByUser(userId, limit);

    await logDataAccess(req.user, 'AUDIT_LOGS', userId, req.ip, req.get('user-agent'));

    res.json(logs);
  } catch (error) {
    console.error('Get audit logs by user error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Get security events
const getSecurityEvents = async (req, res) => {
  try {
    const { severity, resolved } = req.query;

    let query = supabase
      .from('security_events')
      .select(`
        *,
        users (
          id,
          full_name,
          email
        )
      `);

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (resolved !== undefined) {
      query = query.eq('resolved', resolved === 'true');
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    await logDataAccess(req.user, 'SECURITY_EVENTS', null, req.ip, req.get('user-agent'));

    res.json(data);
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
};

// Create security event
const createSecurityEvent = async (req, res) => {
  try {
    const { event_type, severity, details } = req.body;

    const { data, error } = await supabase
      .from('security_events')
      .insert({
        event_type,
        severity,
        user_id: req.user.id,
        user_role: req.user.role,
        ip_address: req.ip,
        details,
        resolved: false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Create security event error:', error);
    res.status(500).json({ error: 'Failed to create security event' });
  }
};

// Resolve security event
const resolveSecurityEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { data, error } = await supabase
      .from('security_events')
      .update({
        resolved: true,
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString(),
        details: supabase.raw(`details || '{"resolution_notes": "${notes}", "resolved_by": ${req.user.id}}'::jsonb`)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Resolve security event error:', error);
    res.status(500).json({ error: 'Failed to resolve security event' });
  }
};

// Get processing register (ROPA)
const getProcessingRegister = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('processing_register')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await logDataAccess(req.user, 'PROCESSING_REGISTER', null, req.ip, req.get('user-agent'));

    res.json(data);
  } catch (error) {
    console.error('Get processing register error:', error);
    res.status(500).json({ error: 'Failed to fetch processing register' });
  }
};

// Add processing register entry
const addProcessingRegisterEntry = async (req, res) => {
  try {
    const {
      data_category,
      purpose,
      data_subjects,
      recipients,
      transfers,
      retention_period,
      security_measures,
      legal_basis
    } = req.body;

    const { data, error } = await supabase
      .from('processing_register')
      .insert({
        data_category,
        purpose,
        data_subjects,
        recipients,
        transfers,
        retention_period,
        security_measures,
        legal_basis
      })
      .select()
      .single();

    if (error) throw error;

    await logDataModification(req.user, 'CREATE', 'PROCESSING_REGISTER', data.id, null, data, req.ip, req.get('user-agent'));

    res.status(201).json(data);
  } catch (error) {
    console.error('Add processing register entry error:', error);
    res.status(500).json({ error: 'Failed to add processing register entry' });
  }
};

// Get processor register
const getProcessorRegister = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('processor_register')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await logDataAccess(req.user, 'PROCESSOR_REGISTER', null, req.ip, req.get('user-agent'));

    res.json(data);
  } catch (error) {
    console.error('Get processor register error:', error);
    res.status(500).json({ error: 'Failed to fetch processor register' });
  }
};

// Add processor register entry
const addProcessorRegisterEntry = async (req, res) => {
  try {
    const {
      processor_name,
      processor_type,
      services_provided,
      data_shared,
      data_location,
      security_measures,
      contract_expiry_date
    } = req.body;

    const { data, error } = await supabase
      .from('processor_register')
      .insert({
        processor_name,
        processor_type,
        services_provided,
        data_shared,
        data_location,
        security_measures,
        contract_expiry_date
      })
      .select()
      .single();

    if (error) throw error;

    await logDataModification(req.user, 'CREATE', 'PROCESSOR_REGISTER', data.id, null, data, req.ip, req.get('user-agent'));

    res.status(201).json(data);
  } catch (error) {
    console.error('Add processor register entry error:', error);
    res.status(500).json({ error: 'Failed to add processor register entry' });
  }
};

// Get DPIA records
const getDPIARecords = async (req, res) => {
  try {
    const { status, risk_level } = req.query;

    let query = supabase
      .from('dpia_records')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (risk_level) {
      query = query.eq('risk_level', risk_level);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    await logDataAccess(req.user, 'DPIA_RECORDS', null, req.ip, req.get('user-agent'));

    res.json(data);
  } catch (error) {
    console.error('Get DPIA records error:', error);
    res.status(500).json({ error: 'Failed to fetch DPIA records' });
  }
};

// Create DPIA record
const createDPIARecord = async (req, res) => {
  try {
    const {
      project_name,
      description,
      risk_level,
      risks_identified,
      mitigation_measures
    } = req.body;

    const { data, error } = await supabase
      .from('dpia_records')
      .insert({
        project_name,
        description,
        risk_level,
        risks_identified,
        mitigation_measures,
        assessor_id: req.user.id,
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;

    await logDataModification(req.user, 'CREATE', 'DPIA_RECORD', data.id, null, data, req.ip, req.get('user-agent'));

    res.status(201).json(data);
  } catch (error) {
    console.error('Create DPIA record error:', error);
    res.status(500).json({ error: 'Failed to create DPIA record' });
  }
};

// Update DPIA record
const updateDPIARecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const { data, error } = await supabase
      .from('dpia_records')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logDataModification(req.user, 'UPDATE', 'DPIA_RECORD', id, null, { status }, req.ip, req.get('user-agent'));

    res.json(data);
  } catch (error) {
    console.error('Update DPIA record error:', error);
    res.status(500).json({ error: 'Failed to update DPIA record' });
  }
};

// Get data retention policies
const getRetentionPolicies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .order('data_category');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get retention policies error:', error);
    res.status(500).json({ error: 'Failed to fetch retention policies' });
  }
};

// Add retention policy
const addRetentionPolicy = async (req, res) => {
  try {
    const {
      data_category,
      retention_period_days,
      retention_reason,
      legal_basis
    } = req.body;

    const { data, error } = await supabase
      .from('data_retention_policies')
      .insert({
        data_category,
        retention_period_days,
        retention_reason,
        legal_basis
      })
      .select()
      .single();

    if (error) throw error;

    await logDataModification(req.user, 'CREATE', 'RETENTION_POLICY', data.id, null, data, req.ip, req.get('user-agent'));

    res.status(201).json(data);
  } catch (error) {
    console.error('Add retention policy error:', error);
    res.status(500).json({ error: 'Failed to add retention policy' });
  }
};

module.exports = {
  getDashboardOverview,
  getRecentAuditLogs,
  getAuditLogsByUser,
  getSecurityEvents,
  createSecurityEvent,
  resolveSecurityEvent,
  getProcessingRegister,
  addProcessingRegisterEntry,
  getProcessorRegister,
  addProcessorRegisterEntry,
  getDPIARecords,
  createDPIARecord,
  updateDPIARecord,
  getRetentionPolicies,
  addRetentionPolicy
};
