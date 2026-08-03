const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/security');

// Validation middleware
const validateLogin = [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
  body('student_number').optional().notEmpty().withMessage('Student number is required')
];

// Admin login
router.post('/admin/login', authRateLimiter, validateLogin, authController.adminLogin);

// Lecturer login
router.post('/lecturer/login', authRateLimiter, validateLogin, authController.lecturerLogin);

// Student login
router.post('/student/login', authRateLimiter, validateLogin, authController.studentLogin);

// Get current user profile (authenticated)
router.get('/profile', authenticate, authController.getProfile);

// Update profile (authenticated)
router.put('/profile', authenticate, authController.updateProfile);

// Change password (authenticated)
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
