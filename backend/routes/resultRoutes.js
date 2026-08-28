const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const resultController = require('../controllers/resultController');
const { authenticate, adminOnly, lecturerOnly } = require('../middleware/auth');
const { requirePermission, requireResourceAccess, requireAnyPermission } = require('../middleware/permission');

// Validation middleware
const validateResult = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('course_id').notEmpty().withMessage('Course ID is required'),
  body('semester').notEmpty().withMessage('Semester is required'),
  body('academic_year').notEmpty().withMessage('Academic year is required')
];

// Create new result (requires CREATE_RESULTS permission)
router.post('/', authenticate, requirePermission('CREATE_RESULTS'), resultController.createResult);

// Import multiple results (requires CREATE_RESULTS permission)
router.post('/import', authenticate, requirePermission('CREATE_RESULTS'), resultController.importResults);

// Get all results (requires VIEW_RESULTS permission)
router.get('/', authenticate, requirePermission('VIEW_RESULTS'), resultController.getAllResults);

// Get result statistics (requires VIEW_RESULTS permission)
router.get('/statistics', authenticate, requirePermission('VIEW_RESULTS'), resultController.getResultStatistics);

// Get student GPA (requires VIEW_OWN_RESULTS permission for students, VIEW_RESULTS for others)
router.get('/gpa', authenticate, requireAnyPermission('VIEW_RESULTS', 'VIEW_OWN_RESULTS'), resultController.getStudentGPA);

// Download results as PDF (requires VIEW_OWN_RESULTS permission for students, VIEW_RESULTS for others)
router.get('/download/pdf', authenticate, requireAnyPermission('VIEW_RESULTS', 'VIEW_OWN_RESULTS'), resultController.downloadResultsPDF);

// Download single result as PDF (requires VIEW_RESULTS permission + resource access check)
router.get('/:id/download/pdf', authenticate, requirePermission('VIEW_RESULTS'), requireResourceAccess('result'), resultController.downloadResultPDF);

// Get result by ID (requires VIEW_RESULTS permission + resource access check)
router.get('/:id', authenticate, requirePermission('VIEW_RESULTS'), requireResourceAccess('result'), resultController.getResultById);

// Update result (requires EDIT_RESULTS permission + resource access check)
router.put('/:id', authenticate, requirePermission('EDIT_RESULTS'), requireResourceAccess('result'), resultController.updateResult);

// Delete result (requires DELETE_RESULTS permission + resource access check)
router.delete('/:id', authenticate, requirePermission('DELETE_RESULTS'), requireResourceAccess('result'), resultController.deleteResult);

module.exports = router;
