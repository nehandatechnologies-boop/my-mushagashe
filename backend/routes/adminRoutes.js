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

// Get all administrators
router.get('/', adminController.getAllAdmins);

// Get administrator by ID
router.get('/:id', adminController.getAdminById);

// Create new administrator
router.post('/', validateAdminCreate, adminController.createAdmin);

// Update administrator
router.put('/:id', validateAdminUpdate, adminController.updateAdmin);

// Suspend administrator
router.put('/:id/suspend', adminController.suspendAdmin);

// Reactivate administrator
router.put('/:id/reactivate', adminController.reactivateAdmin);

// Delete administrator
router.delete('/:id', adminController.deleteAdmin);

// Reset administrator password
router.put('/:id/reset-password', adminController.resetAdminPassword);

// Get audit logs
router.get('/audit/logs', adminController.getAuditLogs);

// Get recent audit logs for dashboard
router.get('/audit/logs/recent', adminController.getRecentAuditLogs);

module.exports = router;
