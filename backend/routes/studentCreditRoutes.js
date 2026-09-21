const express = require('express');
const router = express.Router();
const studentCreditController = require('../controllers/studentCreditController');
const { authenticateToken } = require('../middleware/auth');

// Get student's available credit
router.get('/credit', authenticateToken, studentCreditController.getStudentCredit);

// Allocate credit to a fee
router.post('/credit/allocate', authenticateToken, studentCreditController.allocateCredit);

module.exports = router;
