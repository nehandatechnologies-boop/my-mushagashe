const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Validation middleware
const validateCourse = [
  body('course_code').notEmpty().withMessage('Course code is required'),
  body('course_name').notEmpty().withMessage('Course name is required')
];

// Create new course - requires courses.create permission
router.post('/', authenticate, requirePermission('courses.create'), courseController.createCourse);

// Get all courses - requires courses.view permission
router.get('/', authenticate, requirePermission('courses.view'), courseController.getAllCourses);

// Get all courses with student count - requires courses.view permission
router.get('/with-count', authenticate, requirePermission('courses.view'), courseController.getCoursesWithStudentCount);

// Get course by ID - requires courses.view permission
router.get('/:id', authenticate, requirePermission('courses.view'), courseController.getCourseById);

// Update course - requires courses.edit permission
router.put('/:id', authenticate, requirePermission('courses.edit'), courseController.updateCourse);

// Delete course - requires courses.delete permission
router.delete('/:id', authenticate, requirePermission('courses.delete'), courseController.deleteCourse);

module.exports = router;
