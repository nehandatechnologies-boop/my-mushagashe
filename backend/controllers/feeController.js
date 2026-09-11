const Fee = require('../models/Fee');

// Create new fee
const createFee = async (req, res) => {
  try {
    const {
      user_id, fee_category, amount, amount_paid, balance,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status
    } = req.body;

    // Validation
    if (!user_id || !fee_category || !amount) {
      return res.status(400).json({ error: 'User ID, fee category, and amount are required' });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Amount must be a non-negative number' });
    }

    // Validate amount_paid if provided
    if (amount_paid !== undefined && amount_paid !== null) {
      const numAmountPaid = parseFloat(amount_paid);
      if (isNaN(numAmountPaid) || numAmountPaid < 0) {
        return res.status(400).json({ error: 'Amount paid must be a non-negative number' });
      }
      if (numAmountPaid > numAmount) {
        return res.status(400).json({ error: 'Amount paid cannot exceed the fee amount' });
      }
    }

    // Calculate balance if not provided
    const calculatedBalance = numAmount - (parseFloat(amount_paid) || 0);
    const calculatedStatus = calculatedBalance <= 0 ? 'paid' : (calculatedBalance < numAmount ? 'partial' : 'unpaid');

    const feeData = {
      user_id, fee_category, amount: numAmount, amount_paid: parseFloat(amount_paid) || 0,
      balance: balance !== undefined ? balance : calculatedBalance,
      payment_reference, payment_method, receipt_number, payment_date, due_date,
      status: status || calculatedStatus
    };

    const result = await Fee.create(feeData);

    res.status(201).json({
      message: 'Fee created successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Create fee error:', error);
    res.status(500).json({ error: 'Failed to create fee' });
  }
};

// Get all fees with filters
const getAllFees = async (req, res) => {
  try {
    const {
      user_id, fee_category, status, search, limit = 50, offset = 0
    } = req.query;

    const filters = {
      user_id,
      fee_category,
      status,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // If student, only show their own fees
    if (req.user.role === 'student') {
      filters.user_id = req.user.id;
    }

    const fees = await Fee.findAll(filters);
    res.json(fees);
  } catch (error) {
    console.error('[FEES] Get fees error:', error.message);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
};

// Get fee by ID
const getFeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const fee = await Fee.findById(id);

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    // Check permission
    if (req.user.role === 'student' && fee.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(fee);
  } catch (error) {
    console.error('Get fee error:', error);
    res.status(500).json({ error: 'Failed to fetch fee' });
  }
};

// Update fee
const updateFee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount, amount_paid, balance, payment_reference, payment_method,
      receipt_number, payment_date, due_date, status
    } = req.body;

    // Get current fee
    const currentFee = await Fee.findById(id);
    if (!currentFee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    // Validate amount if provided
    if (amount !== undefined && amount !== null) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Amount must be a non-negative number' });
      }
    }

    // Validate amount_paid if provided
    if (amount_paid !== undefined && amount_paid !== null) {
      const numAmountPaid = parseFloat(amount_paid);
      if (isNaN(numAmountPaid) || numAmountPaid < 0) {
        return res.status(400).json({ error: 'Amount paid must be a non-negative number' });
      }
      const feeAmount = amount !== undefined ? parseFloat(amount) : currentFee.amount;
      if (numAmountPaid > feeAmount) {
        return res.status(400).json({ error: 'Amount paid cannot exceed the fee amount' });
      }
    }

    // Recalculate balance if amount or amount_paid changed
    const finalAmount = amount !== undefined ? parseFloat(amount) : currentFee.amount;
    const finalAmountPaid = amount_paid !== undefined ? parseFloat(amount_paid) : currentFee.amount_paid;
    const calculatedBalance = finalAmount - finalAmountPaid;

    const updateData = {
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      amount_paid: amount_paid !== undefined ? parseFloat(amount_paid) : undefined,
      balance: balance !== undefined ? balance : calculatedBalance,
      payment_reference, payment_method, receipt_number, payment_date, due_date, status
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await Fee.update(id, updateData);

    const updatedFee = await Fee.findById(id);

    res.json(updatedFee);
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ error: 'Failed to update fee' });
  }
};

// Record payment
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount_paid, payment_reference, payment_method, receipt_number, payment_date
    } = req.body;

    // Validation
    if (!amount_paid || amount_paid <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    const paymentData = {
      amount_paid,
      payment_reference,
      payment_method,
      receipt_number,
      payment_date: payment_date || new Date().toISOString(),
      recorded_by: req.user.id
    };

    // Generate receipt number if not provided
    if (!receipt_number) {
      paymentData.receipt_number = await Fee.generateReceiptNumber();
    }

    await Fee.recordPayment(id, paymentData);
    const updatedFee = await Fee.findById(id);

    res.json(updatedFee);
  } catch (error) {
    console.error('[BACKEND] Record payment error:', error.message);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

// Delete fee
const deleteFee = async (req, res) => {
  try {
    const { id } = req.params;

    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    await Fee.delete(id);

    res.json({ message: 'Fee deleted successfully' });
  } catch (error) {
    console.error('Delete fee error:', error);
    res.status(500).json({ error: 'Failed to delete fee' });
  }
};

// Get fee statistics
const getFeeStatistics = async (req, res) => {
  try {
    const stats = await Fee.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get fee statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch fee statistics' });
  }
};

// Get outstanding balance for user
const getOutstandingBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const outstanding = await Fee.getOutstandingByUser(userId);
    res.json({ outstanding_balance: outstanding });
  } catch (error) {
    console.error('Get outstanding balance error:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding balance' });
  }
};

// Generate receipt number
const generateReceiptNumber = async (req, res) => {
  try {
    const receiptNumber = await Fee.generateReceiptNumber();
    res.json({ receipt_number });
  } catch (error) {
    console.error('Generate receipt number error:', error);
    res.status(500).json({ error: 'Failed to generate receipt number' });
  }
};

module.exports = {
  createFee,
  getAllFees,
  getFeeById,
  updateFee,
  recordPayment,
  deleteFee,
  getFeeStatistics,
  getOutstandingBalance,
  generateReceiptNumber
};
