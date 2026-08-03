const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Validation middleware
const validateCourse = [
  body('course_code').notEmpty().withMessage('Course code is required'),
  body('course_name').notEmpty().withMessage('Course name is required')
];

// Create new course (admin only)
router.post('/', authenticate, adminOnly, courseController.createCourse);

// Get all courses (authenticated)
router.get('/', authenticate, courseController.getAllCourses);

// Get all courses with student count (admin only)
router.get('/with-count', authenticate, adminOnly, courseController.getCoursesWithStudentCount);

// Get course by ID (authenticated)
router.get('/:id', authenticate, courseController.getCourseById);

// Update course (admin only)
router.put('/:id', authenticate, adminOnly, courseController.updateCourse);

// Delete course (admin only)
router.delete('/:id', authenticate, adminOnly, courseController.deleteCourse);

module.exports = router;
