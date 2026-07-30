const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/security');
const fs = require('fs');
const path = require('path');

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

// Backup database (admin only)
router.get('/backup/database', authenticate, adminOnly, (req, res) => {
  try {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
    if (fs.existsSync(dbPath)) {
      const dbFile = fs.readFileSync(dbPath);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=mushagashe.db');
      res.send(dbFile);
    } else {
      res.status(404).json({ error: 'Database file not found' });
    }
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to backup database' });
  }
});

// Restore database (admin only)
router.post('/restore/database', authenticate, adminOnly, (req, res) => {
  try {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/mushagashe.db');
    const dbDir = path.dirname(dbPath);
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Handle file from multer (already in memory)
    if (!req.file) {
      return res.status(400).json({ error: 'No database file uploaded' });
    }
    
    // Write the file to the database path
    fs.writeFileSync(dbPath, req.file.buffer);
    
    console.log('Database restored successfully');
    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore database' });
  }
});

module.exports = router;
