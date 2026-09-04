const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const studentController = require('../controllers/studentController');
const { authenticate, adminOnly, lecturerOnly } = require('../middleware/auth');

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

// Public student registration
router.post('/register', studentController.registerStudent);

// Create new student (admin only)
router.post('/', authenticate, adminOnly, validateStudent, studentController.createStudent);

// Get all students (admin or lecturer - controller handles role-based filtering)
router.get('/', authenticate, studentController.getAllStudents);

// Lecturer management routes (admin only)
router.post('/lecturers', authenticate, adminOnly, studentController.createLecturer);
router.get('/lecturers', authenticate, adminOnly, studentController.getAllLecturers);
router.get('/lecturers/:id', authenticate, adminOnly, studentController.getLecturerById);
router.put('/lecturers/:id', authenticate, adminOnly, studentController.updateLecturer);
router.delete('/lecturers/:id', authenticate, adminOnly, studentController.deleteLecturer);
router.put('/lecturers/:id/reset-password', authenticate, adminOnly, studentController.resetLecturerPassword);

// Get student by ID (admin only)
router.get('/:id', authenticate, adminOnly, studentController.getStudentById);

// Update student (admin only)
router.put('/:id', authenticate, adminOnly, studentController.updateStudent);

// Delete student (admin only)
router.delete('/:id', authenticate, adminOnly, studentController.deleteStudent);

// Suspend student (admin only)
router.put('/:id/suspend', authenticate, adminOnly, studentController.suspendStudent);

// Activate student (admin only)
router.put('/:id/activate', authenticate, adminOnly, studentController.activateStudent);

// Reset student password (admin only)
router.put('/:id/reset-password', authenticate, adminOnly, studentController.resetPassword);

// Assign course to student (admin only)
router.put('/:id/assign-course', authenticate, adminOnly, studentController.assignCourse);

// Get student statistics (admin only)
router.get('/stats/overview', authenticate, adminOnly, studentController.getStudentStatistics);

// Import students from Excel (admin only)
router.post('/import/excel', authenticate, adminOnly, excelUpload.single('file'), studentController.importStudentsFromExcel);

// Upload profile picture (admin only)
router.post('/:id/profile-picture', authenticate, adminOnly, profilePictureUpload.single('profilePicture'), studentController.uploadProfilePicture);

// Delete profile picture (admin only)
router.delete('/:id/profile-picture', authenticate, adminOnly, studentController.deleteProfilePicture);

module.exports = router;
