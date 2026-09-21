const StudentCredit = require('../models/StudentCredit');

// Get student's available credit
const getStudentCredit = async (req, res) => {
  try {
    const userId = req.user.id;
    const availableCredit = await StudentCredit.getAvailableCredit(userId);
    const creditDetails = await StudentCredit.findByUserId(userId);

    res.json({
      available_credit: availableCredit,
      credits: creditDetails
    });
  } catch (error) {
    console.error('Get student credit error:', error);
    res.status(500).json({ error: 'Failed to fetch student credit' });
  }
};

// Allocate credit to a fee
const allocateCredit = async (req, res) => {
  try {
    const { credit_id, fee_id, amount } = req.body;

    if (!credit_id || !fee_id || !amount) {
      return res.status(400).json({ error: 'Credit ID, fee ID, and amount are required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const result = await StudentCredit.allocateCredit(credit_id, fee_id, numAmount);

    res.json({
      message: 'Credit allocated successfully',
      credit: result
    });
  } catch (error) {
    console.error('Allocate credit error:', error);
    res.status(500).json({ error: error.message || 'Failed to allocate credit' });
  }
};

module.exports = {
  getStudentCredit,
  allocateCredit
};
