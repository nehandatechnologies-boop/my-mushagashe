const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');

// Validation middleware
const validateAdminCreate = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').notEmpty().withMessage('Role is required')
];

const validateAdminUpdate = [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().notEmpty().withMessage('Role cannot be empty')
];

// All admin routes require SUPER_ADMIN role
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// Administrator-specific routes
router.get('/administrators', adminController.getAllAdmins);
router.post('/administrators', validateAdminCreate, adminController.createAdmin);
router.get('/administrators/:id(\\d+)', adminController.getAdminById);
router.put('/administrators/:id(\\d+)', validateAdminUpdate, adminController.updateAdmin);
router.put('/administrators/:id(\\d+)/suspend', adminController.suspendAdmin);
router.put('/administrators/:id(\\d+)/reactivate', adminController.reactivateAdmin);
router.delete('/administrators/:id(\\d+)', adminController.deleteAdmin);
router.put('/administrators/:id(\\d+)/reset-password', adminController.resetAdminPassword);

// Legacy routes for backward compatibility
router.get('/', adminController.getAllAdmins);
router.post('/', validateAdminCreate, adminController.createAdmin);

// Get audit logs (must come before /:id)
router.get('/audit-logs', adminController.getAuditLogs);

// Get audit logs (alternative path for frontend compatibility)
router.get('/audit/logs', adminController.getAuditLogs);

// Get recent audit logs for dashboard
router.get('/audit-logs/recent', adminController.getRecentAuditLogs);

// Get administrator by ID (must come after specific routes)
router.get('/:id(\\d+)', adminController.getAdminById);

// Update administrator
router.put('/:id(\\d+)', validateAdminUpdate, adminController.updateAdmin);

// Suspend administrator
router.put('/:id(\\d+)/suspend', adminController.suspendAdmin);

// Reactivate administrator
router.put('/:id(\\d+)/reactivate', adminController.reactivateAdmin);

// Delete administrator
router.delete('/:id(\\d+)', adminController.deleteAdmin);

// Reset administrator password
router.put('/:id(\\d+)/reset-password', adminController.resetAdminPassword);

module.exports = router;
