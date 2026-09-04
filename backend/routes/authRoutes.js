const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const studentControllerSupabase = require('../controllers/studentControllerSupabase');
const { authenticate, adminOnly } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/security');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads (memory storage for Supabase upload)
const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

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

// Student registration with Supabase Auth
router.post('/student/register-supabase', authRateLimiter, studentControllerSupabase.registerStudentSupabase);

// Lecturer creation with Supabase Auth (admin only)
router.post('/lecturer/create-supabase', authenticate, adminOnly, studentControllerSupabase.createLecturerSupabase);

// Get current user profile (authenticated)
router.get('/profile', authenticate, authController.getProfile);

// Get current user's profile picture URL (authenticated)
router.get('/profile-picture', authenticate, authController.getProfilePicture);

// Update profile (authenticated)
router.put('/profile', authenticate, authController.updateProfile);

// Change password (authenticated)
router.put('/change-password', authenticate, authController.changePassword);

// Request password reset (student)
router.post('/student/reset-password', authRateLimiter, authController.requestStudentPasswordReset);

// Request password reset (lecturer)
router.post('/lecturer/reset-password', authRateLimiter, authController.requestLecturerPasswordReset);

// Upload own profile picture (authenticated)
router.post('/profile-picture', authenticate, profilePictureUpload.single('profilePicture'), studentController.uploadProfilePicture);

// Delete own profile picture (authenticated)
router.delete('/profile-picture', authenticate, studentController.deleteProfilePicture);

// Email verification
router.get('/verify-email', authController.verifyEmail);

// Resend verification email (authenticated)
router.post('/resend-verification', authenticate, authRateLimiter, authController.resendVerificationEmail);

// Request password reset (generic)
router.post('/forgot-password', authRateLimiter, authController.requestPasswordReset);

// Reset password with token
router.post('/reset-password', authController.resetPassword);

module.exports = router;
