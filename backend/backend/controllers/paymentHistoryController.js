const PaymentHistory = require('../models/PaymentHistory');

// Get payment history for a specific fee
const getPaymentHistoryByFeeId = async (req, res) => {
  try {
    const { feeId } = req.params;
    const history = await PaymentHistory.findByFeeId(feeId);
    res.json(history);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

// Get payment history for a specific user
const getPaymentHistoryByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await PaymentHistory.findByUserId(userId);
    res.json(history);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

module.exports = {
  getPaymentHistoryByFeeId,
  getPaymentHistoryByUserId
};
