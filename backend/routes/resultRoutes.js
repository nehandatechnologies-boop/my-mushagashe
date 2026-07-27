const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const resultController = require('../controllers/resultController');
const { authenticate, adminOnly, lecturerOnly } = require('../middleware/auth');

// Validation middleware
const validateResult = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('course_id').notEmpty().withMessage('Course ID is required'),
  body('semester').notEmpty().withMessage('Semester is required'),
  body('academic_year').notEmpty().withMessage('Academic year is required')
];

// Create new result (admin and lecturer)
router.post('/', authenticate, resultController.createResult);

// Import multiple results (admin and lecturer)
router.post('/import', authenticate, resultController.importResults);

// Get all results (authenticated)
router.get('/', authenticate, resultController.getAllResults);

// Get result statistics (admin only)
router.get('/statistics', authenticate, adminOnly, resultController.getResultStatistics);

// Get student GPA (student only)
router.get('/gpa', authenticate, resultController.getStudentGPA);

// Download results as PDF (student only)
router.get('/download/pdf', authenticate, resultController.downloadResultsPDF);

// Get result by ID (authenticated)
router.get('/:id', authenticate, resultController.getResultById);

// Update result (admin and lecturer)
router.put('/:id', authenticate, resultController.updateResult);

// Delete result (admin and lecturer)
router.delete('/:id', authenticate, resultController.deleteResult);

module.exports = router;
