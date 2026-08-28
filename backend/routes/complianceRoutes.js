const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const complianceController = require('../controllers/complianceController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

// Dashboard overview (requires VIEW_COMPLIANCE_DASHBOARD permission)
router.get('/dashboard', authenticate, requirePermission('VIEW_COMPLIANCE_DASHBOARD'), complianceController.getDashboardOverview);

// Audit logs (requires VIEW_AUDIT_LOGS permission)
router.get('/audit-logs', authenticate, requirePermission('VIEW_AUDIT_LOGS'), complianceController.getRecentAuditLogs);
router.get('/audit-logs/user/:userId', authenticate, requirePermission('VIEW_AUDIT_LOGS'), complianceController.getAuditLogsByUser);

// Security events (requires VIEW_SECURITY_EVENTS permission)
router.get('/security-events', authenticate, requirePermission('VIEW_SECURITY_EVENTS'), complianceController.getSecurityEvents);
router.post('/security-events', authenticate, requirePermission('MANAGE_SECURITY_EVENTS'), complianceController.createSecurityEvent);
router.put('/security-events/:id/resolve', authenticate, requirePermission('MANAGE_SECURITY_EVENTS'), complianceController.resolveSecurityEvent);

// Processing register (ROPA) (requires VIEW_ROPA permission)
router.get('/processing-register', authenticate, requirePermission('VIEW_ROPA'), complianceController.getProcessingRegister);
router.post('/processing-register', authenticate, requirePermission('MANAGE_ROPA'), complianceController.addProcessingRegisterEntry);

// Processor register (requires VIEW_PROCESSOR_REGISTER permission)
router.get('/processor-register', authenticate, requirePermission('VIEW_PROCESSOR_REGISTER'), complianceController.getProcessorRegister);
router.post('/processor-register', authenticate, requirePermission('MANAGE_PROCESSOR_REGISTER'), complianceController.addProcessorRegisterEntry);

// DPIA records (requires VIEW_DPIA permission)
router.get('/dpia', authenticate, requirePermission('VIEW_DPIA'), complianceController.getDPIARecords);
router.post('/dpia', authenticate, requirePermission('MANAGE_DPIA'), complianceController.createDPIARecord);
router.put('/dpia/:id', authenticate, requirePermission('MANAGE_DPIA'), complianceController.updateDPIARecord);

// Data retention policies (requires VIEW_RETENTION_POLICIES permission)
router.get('/retention-policies', authenticate, requirePermission('VIEW_RETENTION_POLICIES'), complianceController.getRetentionPolicies);
router.post('/retention-policies', authenticate, requirePermission('MANAGE_RETENTION_POLICIES'), complianceController.addRetentionPolicy);

module.exports = router;
