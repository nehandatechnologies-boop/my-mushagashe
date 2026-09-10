const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const studentController = require('../controllers/studentController');
const { authenticate, adminOnly, lecturerOnly } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Ensure uploads/students directory exists
const uploadDir = path.join(__dirname, '../../uploads/students');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

// Configure multer for Excel file uploads
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('sheet') || file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

// Validation middleware
const validateStudent = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('student_number').notEmpty().withMessage('Student number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional().isEmail().withMessage('Invalid email')
];

// Public student registration - REMOVED - Admin only
// router.post('/register', studentController.registerStudent);

// Create new student - requires students.create permission
router.post('/', authenticate, requirePermission('students.create'), validateStudent, studentController.createStudent);

// Get all students - requires students.view permission
router.get('/', authenticate, requirePermission('students.view'), studentController.getAllStudents);

// Lecturer management routes - require lecturers.create/edit/delete permissions
router.post('/lecturers', authenticate, requirePermission('lecturers.create'), studentController.createLecturer);
router.get('/lecturers', authenticate, requirePermission('lecturers.view'), studentController.getAllLecturers);
router.get('/lecturers/:id', authenticate, requirePermission('lecturers.view'), studentController.getLecturerById);
router.put('/lecturers/:id', authenticate, requirePermission('lecturers.edit'), studentController.updateLecturer);
router.delete('/lecturers/:id', authenticate, requirePermission('lecturers.delete'), studentController.deleteLecturer);
router.put('/lecturers/:id/reset-password', authenticate, requirePermission('lecturers.edit'), studentController.resetLecturerPassword);

// Get student by ID - requires students.view permission
router.get('/:id', authenticate, requirePermission('students.view'), studentController.getStudentById);

// Update student - requires students.edit permission
router.put('/:id', authenticate, requirePermission('students.edit'), studentController.updateStudent);

// Delete student - requires students.delete permission
router.delete('/:id', authenticate, requirePermission('students.delete'), studentController.deleteStudent);

// Suspend student - requires students.suspend permission
router.put('/:id/suspend', authenticate, requirePermission('students.suspend'), studentController.suspendStudent);

// Activate student - requires students.edit permission
router.put('/:id/activate', authenticate, requirePermission('students.edit'), studentController.activateStudent);

// Reset student password - requires students.edit permission
router.put('/:id/reset-password', authenticate, requirePermission('students.edit'), studentController.resetPassword);

// Assign course to student - requires students.edit permission
router.put('/:id/assign-course', authenticate, requirePermission('students.edit'), studentController.assignCourse);

// Get student statistics - requires students.view permission
router.get('/stats/overview', authenticate, requirePermission('students.view'), studentController.getStudentStatistics);

// Import students from Excel - requires students.create permission
router.post('/import/excel', authenticate, requirePermission('students.create'), excelUpload.single('file'), studentController.importStudentsFromExcel);

// Upload profile picture - requires students.edit permission
router.post('/:id/profile-picture', authenticate, requirePermission('students.edit'), profilePictureUpload.single('profilePicture'), studentController.uploadProfilePicture);

// Delete profile picture - requires students.edit permission
router.delete('/:id/profile-picture', authenticate, requirePermission('students.edit'), studentController.deleteProfilePicture);

module.exports = router;
