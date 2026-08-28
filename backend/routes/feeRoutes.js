const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const feeController = require('../controllers/feeController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { requirePermission, requireResourceAccess, requireAnyPermission } = require('../middleware/permission');

// Validation middleware
const validateFee = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('fee_category').notEmpty().withMessage('Fee category is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
];

const validatePayment = [
  body('amount_paid').isNumeric().withMessage('Amount paid must be a number'),
  body('amount_paid').custom(value => value > 0).withMessage('Amount paid must be greater than 0')
];

// Create new fee (requires CREATE_FEES permission)
router.post('/', authenticate, requirePermission('CREATE_FEES'), feeController.createFee);

// Get all fees (requires VIEW_FEES permission)
router.get('/', authenticate, requirePermission('VIEW_FEES'), feeController.getAllFees);

// Get fee statistics (requires VIEW_FINANCIAL_REPORTS permission)
router.get('/statistics', authenticate, requirePermission('VIEW_FINANCIAL_REPORTS'), feeController.getFeeStatistics);

// Get outstanding balance for current user (requires VIEW_OWN_FEES permission for students, VIEW_FEES for others)
router.get('/outstanding', authenticate, requireAnyPermission('VIEW_FEES', 'VIEW_OWN_FEES'), feeController.getOutstandingBalance);

// Generate receipt number (requires RECORD_PAYMENTS permission)
router.get('/generate-receipt', authenticate, requirePermission('RECORD_PAYMENTS'), feeController.generateReceiptNumber);

// Get fee by ID (requires VIEW_FEES permission + resource access check)
router.get('/:id', authenticate, requirePermission('VIEW_FEES'), requireResourceAccess('fee'), feeController.getFeeById);

// Update fee (requires EDIT_FEES permission + resource access check)
router.put('/:id', authenticate, requirePermission('EDIT_FEES'), requireResourceAccess('fee'), feeController.updateFee);

// Record payment (requires RECORD_PAYMENTS permission + resource access check)
router.post('/:id/payment', authenticate, requirePermission('RECORD_PAYMENTS'), requireResourceAccess('fee'), validatePayment, feeController.recordPayment);

// Delete fee (requires DELETE_FEES permission + resource access check)
router.delete('/:id', authenticate, requirePermission('DELETE_FEES'), requireResourceAccess('fee'), feeController.deleteFee);

module.exports = router;
