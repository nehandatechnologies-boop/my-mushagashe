const AuditLog = require('../models/AuditLog');

/**
 * Log an administrative action
 * @param {Object} req - Express request object
 * @param {string} action - Action performed (e.g., 'student.create', 'admin.delete')
 * @param {string} target_type - Type of entity affected (e.g., 'student', 'course', 'admin')
 * @param {number} target_id - ID of the entity affected
 * @param {string} description - Human-readable description of the action
 * @param {Object} metadata - Additional metadata about the action
 */
async function logAction(req, action, target_type, target_id, description, metadata = {}) {
  try {
    const admin_id = req.user?.id;
    const ip_address = req.ip || req.connection?.remoteAddress || null;

    await AuditLog.create({
      admin_id,
      action,
      target_type,
      target_id,
      description,
      metadata,
      ip_address
    });
  } catch (error) {
    // Log errors but don't throw - audit logging shouldn't break the main operation
    console.error('Failed to log audit action:', error);
  }
}

/**
 * Middleware to automatically log API calls
 * Use this for routes that should be automatically logged
 */
const auditMiddleware = (action, target_type) => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override json to intercept response
    res.json = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const target_id = req.params.id || req.body?.id || data?.id || null;
        const description = `${action} on ${target_type}${target_id ? ` (ID: ${target_id})` : ''}`;
        
        logAction(req, action, target_type, target_id, description, {
          method: req.method,
          path: req.path,
          body: sanitizeBody(req.body)
        }).catch(err => console.error('Audit middleware error:', err));
      }

      // Call original json
      return originalJson(data);
    };

    next();
  };
};

/**
 * Sanitize request body to remove sensitive data before logging
 */
function sanitizeBody(body) {
  if (!body) return null;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'new_password', 'current_password', 'confirm_password', 'token', 'secret'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

/**
 * Common action loggers for convenience
 */
const auditActions = {
  // Student actions
  studentCreate: (req, studentId, description) => 
    logAction(req, 'student.create', 'student', studentId, description),
  studentUpdate: (req, studentId, description) => 
    logAction(req, 'student.edit', 'student', studentId, description),
  studentDelete: (req, studentId, description) => 
    logAction(req, 'student.delete', 'student', studentId, description),
  studentSuspend: (req, studentId, description) => 
    logAction(req, 'student.suspend', 'student', studentId, description),
  studentActivate: (req, studentId, description) => 
    logAction(req, 'student.activate', 'student', studentId, description),
  studentApprove: (req, studentId, description) => 
    logAction(req, 'student.approve', 'student', studentId, description),

  // Lecturer actions
  lecturerCreate: (req, lecturerId, description) => 
    logAction(req, 'lecturer.create', 'lecturer', lecturerId, description),
  lecturerUpdate: (req, lecturerId, description) => 
    logAction(req, 'lecturer.edit', 'lecturer', lecturerId, description),
  lecturerDelete: (req, lecturerId, description) => 
    logAction(req, 'lecturer.delete', 'lecturer', lecturerId, description),
  lecturerSuspend: (req, lecturerId, description) => 
    logAction(req, 'lecturer.suspend', 'lecturer', lecturerId, description),

  // Course actions
  courseCreate: (req, courseId, description) => 
    logAction(req, 'course.create', 'course', courseId, description),
  courseUpdate: (req, courseId, description) => 
    logAction(req, 'course.edit', 'course', courseId, description),
  courseDelete: (req, courseId, description) => 
    logAction(req, 'course.delete', 'course', courseId, description),

  // Subject actions
  subjectCreate: (req, subjectId, description) => 
    logAction(req, 'subject.create', 'subject', subjectId, description),
  subjectUpdate: (req, subjectId, description) => 
    logAction(req, 'subject.edit', 'subject', subjectId, description),
  subjectDelete: (req, subjectId, description) => 
    logAction(req, 'subject.delete', 'subject', subjectId, description),

  // Result actions
  resultCreate: (req, resultId, description) => 
    logAction(req, 'result.create', 'result', resultId, description),
  resultUpdate: (req, resultId, description) => 
    logAction(req, 'result.edit', 'result', resultId, description),
  resultDelete: (req, resultId, description) => 
    logAction(req, 'result.delete', 'result', resultId, description),
  resultPublish: (req, resultId, description) => 
    logAction(req, 'result.publish', 'result', resultId, description),

  // Fee actions
  feeCreate: (req, feeId, description) => 
    logAction(req, 'fee.create', 'fee', feeId, description),
  feeUpdate: (req, feeId, description) => 
    logAction(req, 'fee.edit', 'fee', feeId, description),
  feeDelete: (req, feeId, description) => 
    logAction(req, 'fee.delete', 'fee', feeId, description),

  // Payment actions
  paymentCreate: (req, paymentId, description) => 
    logAction(req, 'payment.create', 'payment', paymentId, description),
  paymentUpdate: (req, paymentId, description) => 
    logAction(req, 'payment.edit', 'payment', paymentId, description),

  // Announcement actions
  announcementCreate: (req, announcementId, description) => 
    logAction(req, 'announcement.create', 'announcement', announcementId, description),
  announcementUpdate: (req, announcementId, description) => 
    logAction(req, 'announcement.edit', 'announcement', announcementId, description),
  announcementDelete: (req, announcementId, description) => 
    logAction(req, 'announcement.delete', 'announcement', announcementId, description),

  // Intake actions
  intakeCreate: (req, intakeId, description) => 
    logAction(req, 'intake.create', 'intake', intakeId, description),
  intakeUpdate: (req, intakeId, description) => 
    logAction(req, 'intake.edit', 'intake', intakeId, description),
  intakeDelete: (req, intakeId, description) => 
    logAction(req, 'intake.delete', 'intake', intakeId, description),

  // Admin actions
  adminCreate: (req, adminId, description) => 
    logAction(req, 'admin.create', 'admin', adminId, description),
  adminUpdate: (req, adminId, description) => 
    logAction(req, 'admin.edit', 'admin', adminId, description),
  adminDelete: (req, adminId, description) => 
    logAction(req, 'admin.delete', 'admin', adminId, description),
  adminSuspend: (req, adminId, description) => 
    logAction(req, 'admin.suspend', 'admin', adminId, description),
  adminRoleChange: (req, adminId, description) => 
    logAction(req, 'admin.role_change', 'admin', adminId, description),

  // Authentication actions
  adminLogin: (req, description) => 
    logAction(req, 'admin.login', 'auth', null, description),
  adminLogout: (req, description) => 
    logAction(req, 'admin.logout', 'auth', null, description),
  failedLogin: (req, description) => 
    logAction(req, 'auth.failed_login', 'auth', null, description),

  // Settings actions
  settingsUpdate: (req, description) => 
    logAction(req, 'settings.edit', 'settings', null, description)
};

module.exports = {
  logAction,
  auditMiddleware,
  auditActions,
  sanitizeBody
};
