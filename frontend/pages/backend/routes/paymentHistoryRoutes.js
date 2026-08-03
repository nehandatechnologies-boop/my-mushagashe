const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const paymentHistoryController = require('../controllers/paymentHistoryController');

// Get payment history for a specific fee (admin/lecturer only)
router.get('/fee/:feeId', authenticate, paymentHistoryController.getPaymentHistoryByFeeId);

// Get payment history for the logged-in user (student)
router.get('/my-payments', authenticate, paymentHistoryController.getPaymentHistoryByUserId);

module.exports = router;
