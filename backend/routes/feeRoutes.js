const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const feeController = require('../controllers/feeController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

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

// Create new fee - requires fees.create permission
router.post('/', authenticate, requirePermission('fees.create'), feeController.createFee);

// Get all fees - requires fees.view permission
router.get('/', authenticate, requirePermission('fees.view'), feeController.getAllFees);

// Get fee statistics - requires financial_reports.view permission
router.get('/statistics', authenticate, requirePermission('financial_reports.view'), feeController.getFeeStatistics);

// Get outstanding balance for current user - requires fees.view permission
router.get('/outstanding', authenticate, requirePermission('fees.view'), feeController.getOutstandingBalance);

// Generate receipt number - requires payments.create permission
router.get('/generate-receipt', authenticate, requirePermission('payments.create'), feeController.generateReceiptNumber);

// Get fee by ID - requires fees.view permission
router.get('/:id', authenticate, requirePermission('fees.view'), feeController.getFeeById);

// Update fee - requires fees.edit permission
router.put('/:id', authenticate, requirePermission('fees.edit'), feeController.updateFee);

// Record payment - requires payments.create permission
router.post('/:id/payment', authenticate, requirePermission('payments.create'), validatePayment, feeController.recordPayment);

// Delete fee - requires fees.delete permission
router.delete('/:id', authenticate, requirePermission('fees.delete'), feeController.deleteFee);

module.exports = router;
