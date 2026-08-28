const AuditLog = require('../models/AuditLog');

// Audit logging middleware
const auditLogger = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (data) {
      // Log the audit entry after response is sent
      setImmediate(async () => {
        try {
          const auditData = {
            user_id: req.user?.id,
            user_role: req.user?.role,
            action: action,
            resource_type: resourceType,
            resource_id: req.params.id || req.params.userId || req.params.studentId || req.body.id,
            details: {
              method: req.method,
              path: req.path,
              body: sanitizeRequestBody(req.body),
              params: req.params
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            success: res.statusCode < 400,
            error_message: data.error || null
          };

          await AuditLog.create(auditData);
        } catch (error) {
          console.error('Audit logging error:', error);
          // Don't throw - audit logging should not break the application
        }
      });

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

// Helper function to sanitize request body for logging
function sanitizeRequestBody(body) {
  if (!body) return null;

  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'current_password', 'new_password', 'token', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
}

// Manual audit logging function for use in controllers
const logAudit = async (auditData) => {
  try {
    await AuditLog.create(auditData);
  } catch (error) {
    console.error('Manual audit logging error:', error);
  }
};

// Specific audit log helpers
const logLogin = async (user, success, ipAddress, userAgent) => {
  await logAudit({
    user_id: user.id,
    user_role: user.role,
    action: 'LOGIN',
    resource_type: 'USER',
    resource_id: user.id,
    details: {
      login_method: 'password',
      student_number: user.student_number || null,
      email: user.email || null
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    success: success,
    error_message: success ? null : 'Invalid credentials'
  });
};

const logLogout = async (user, ipAddress, userAgent) => {
  await logAudit({
    user_id: user.id,
    user_role: user.role,
    action: 'LOGOUT',
    resource_type: 'USER',
    resource_id: user.id,
    details: {},
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true
  });
};

const logPasswordChange = async (user, success, ipAddress, userAgent) => {
  await logAudit({
    user_id: user.id,
    user_role: user.role,
    action: 'PASSWORD_CHANGE',
    resource_type: 'USER',
    resource_id: user.id,
    details: {
      forced: user.must_change_password || false
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    success: success,
    error_message: success ? null : 'Password change failed'
  });
};

const logDataAccess = async (user, resourceType, resourceId, ipAddress, userAgent) => {
  await logAudit({
    user_id: user.id,
    user_role: user.role,
    action: 'VIEW',
    resource_type: resourceType,
    resource_id: resourceId,
    details: {},
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true
  });
};

const logDataModification = async (user, action, resourceType, resourceId, previousData, newData, ipAddress, userAgent) => {
  await logAudit({
    user_id: user.id,
    user_role: user.role,
    action: action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: {
      previous_data: previousData,
      new_data: newData
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true
  });
};

const logDataDeletion = async (user, resourceType, resourceId, deletedData, ipAddress, userAgent) => {
  await logAudit({
    user_id: user.id,
    user_role: user.role,
    action: 'DELETE',
    resource_type: resourceType,
    resource_id: resourceId,
    details: {
      deleted_data: deletedData
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true
  });
};

const logFailedAccess = async (user, resourceType, resourceId, reason, ipAddress, userAgent) => {
  await logAudit({
    user_id: user?.id,
    user_role: user?.role,
    action: 'ACCESS_DENIED',
    resource_type: resourceType,
    resource_id: resourceId,
    details: {
      reason: reason
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    success: false,
    error_message: reason
  });
};

module.exports = {
  auditLogger,
  logAudit,
  logLogin,
  logLogout,
  logPasswordChange,
  logDataAccess,
  logDataModification,
  logDataDeletion,
  logFailedAccess
};
