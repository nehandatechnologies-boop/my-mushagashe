const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const subjectController = require('../controllers/subjectController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Validation middleware
const validateSubject = [
  body('subject_code').notEmpty().withMessage('Subject code is required'),
  body('subject_name').notEmpty().withMessage('Subject name is required'),
  body('course_id').notEmpty().withMessage('Course ID is required')
];

// Create new subject (admin only)
router.post('/', authenticate, adminOnly, validateSubject, subjectController.createSubject);

// Get all subjects (authenticated)
router.get('/', authenticate, subjectController.getAllSubjects);

// Get subjects by course ID (authenticated)
router.get('/course/:course_id', authenticate, subjectController.getSubjectsByCourseId);

// Get subject by ID (authenticated)
router.get('/:id', authenticate, subjectController.getSubjectById);

// Update subject (admin only)
router.put('/:id', authenticate, adminOnly, subjectController.updateSubject);

// Delete subject (admin only)
router.delete('/:id', authenticate, adminOnly, subjectController.deleteSubject);

module.exports = router;
