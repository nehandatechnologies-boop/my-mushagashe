const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const resultController = require('../controllers/resultController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Validation middleware
const validateResult = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('course_id').notEmpty().withMessage('Course ID is required'),
  body('semester').notEmpty().withMessage('Semester is required'),
  body('academic_year').notEmpty().withMessage('Academic year is required')
];

// Create new result - requires results.create permission
router.post('/', authenticate, requirePermission('results.create'), resultController.createResult);

// Import multiple results - requires results.create permission
router.post('/import', authenticate, requirePermission('results.create'), resultController.importResults);

// Get all results - requires results.view permission
router.get('/', authenticate, requirePermission('results.view'), resultController.getAllResults);

// Get result statistics - requires results.view permission
router.get('/statistics', authenticate, requirePermission('results.view'), resultController.getResultStatistics);

// Get student GPA - requires results.view permission
router.get('/gpa', authenticate, requirePermission('results.view'), resultController.getStudentGPA);

// Download results as PDF - requires results.view permission
router.get('/download/pdf', authenticate, requirePermission('results.view'), resultController.downloadResultsPDF);

// Download single result as PDF - requires results.view permission
router.get('/:id/download/pdf', authenticate, requirePermission('results.view'), resultController.downloadResultPDF);

// Get result by ID - requires results.view permission
router.get('/:id', authenticate, requirePermission('results.view'), resultController.getResultById);

// Update result - requires results.edit permission
router.put('/:id', authenticate, requirePermission('results.edit'), resultController.updateResult);

// Delete result - requires results.delete permission
router.delete('/:id', authenticate, requirePermission('results.delete'), resultController.deleteResult);

module.exports = router;
