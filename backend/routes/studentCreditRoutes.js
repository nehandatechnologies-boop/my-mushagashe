const express = require('express');
const router = express.Router();
const studentCreditController = require('../controllers/studentCreditController');
const { authenticate } = require('../middleware/auth');

// Get student's available credit
router.get('/credit', authenticate, studentCreditController.getStudentCredit);

// Allocate credit to a fee
router.post('/credit/allocate', authenticate, studentCreditController.allocateCredit);

module.exports = router;
