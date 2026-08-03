const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const feeController = require('../controllers/feeController');
const { authenticate, adminOnly } = require('../middleware/auth');

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

// Create new fee (admin only)
router.post('/', authenticate, adminOnly, feeController.createFee);

// Get all fees (authenticated)
router.get('/', authenticate, feeController.getAllFees);

// Get fee statistics (admin only)
router.get('/statistics', authenticate, adminOnly, feeController.getFeeStatistics);

// Get outstanding balance for current user (student only)
router.get('/outstanding', authenticate, feeController.getOutstandingBalance);

// Generate receipt number (admin only)
router.get('/generate-receipt', authenticate, adminOnly, feeController.generateReceiptNumber);

// Get fee by ID (authenticated)
router.get('/:id', authenticate, feeController.getFeeById);

// Update fee (admin only)
router.put('/:id', authenticate, adminOnly, feeController.updateFee);

// Record payment (admin only)
router.post('/:id/payment', authenticate, adminOnly, validatePayment, feeController.recordPayment);

// Delete fee (admin only)
router.delete('/:id', authenticate, adminOnly, feeController.deleteFee);

module.exports = router;
