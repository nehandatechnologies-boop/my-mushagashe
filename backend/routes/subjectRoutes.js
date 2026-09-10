const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const subjectController = require('../controllers/subjectController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Validation middleware
const validateSubject = [
  body('subject_code').notEmpty().withMessage('Subject code is required'),
  body('subject_name').notEmpty().withMessage('Subject name is required'),
  body('course_id').notEmpty().withMessage('Course ID is required')
];

// Create new subject - requires subjects.create permission
router.post('/', authenticate, requirePermission('subjects.create'), validateSubject, subjectController.createSubject);

// Get all subjects - requires subjects.view permission
router.get('/', authenticate, requirePermission('subjects.view'), subjectController.getAllSubjects);

// Get subjects by course ID - requires subjects.view permission
router.get('/course/:course_id', authenticate, requirePermission('subjects.view'), subjectController.getSubjectsByCourseId);

// Get subject by ID - requires subjects.view permission
router.get('/:id', authenticate, requirePermission('subjects.view'), subjectController.getSubjectById);

// Update subject - requires subjects.edit permission
router.put('/:id', authenticate, requirePermission('subjects.edit'), subjectController.updateSubject);

// Delete subject - requires subjects.delete permission
router.delete('/:id', authenticate, requirePermission('subjects.delete'), subjectController.deleteSubject);

module.exports = router;
