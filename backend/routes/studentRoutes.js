const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const studentController = require('../controllers/studentController');
const { authenticate, adminOnly, lecturerOnly } = require('../middleware/auth');
const { requirePermission, requireResourceAccess } = require('../middleware/permission');

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

// Create new student (requires CREATE_STUDENT permission)
router.post('/', authenticate, requirePermission('CREATE_STUDENT'), studentController.createStudent);

// Get all students (requires VIEW_STUDENT permission)
router.get('/', authenticate, requirePermission('VIEW_STUDENT'), studentController.getAllStudents);

// Lecturer management routes (requires MANAGE_USERS permission)
router.post('/lecturers', authenticate, requirePermission('MANAGE_USERS'), studentController.createLecturer);
router.get('/lecturers', authenticate, requirePermission('VIEW_STUDENT'), studentController.getAllLecturers);
router.get('/lecturers/:id', authenticate, requirePermission('VIEW_STUDENT'), studentController.getLecturerById);
router.put('/lecturers/:id', authenticate, requirePermission('EDIT_STUDENT'), studentController.updateLecturer);
router.delete('/lecturers/:id', authenticate, requirePermission('DELETE_STUDENT'), studentController.deleteLecturer);

// Get student by ID (requires VIEW_STUDENT permission + resource access check)
router.get('/:id', authenticate, requirePermission('VIEW_STUDENT'), requireResourceAccess('student'), studentController.getStudentById);

// Update student (requires EDIT_STUDENT permission + resource access check)
router.put('/:id', authenticate, requirePermission('EDIT_STUDENT'), requireResourceAccess('student'), studentController.updateStudent);

// Delete student (requires DELETE_STUDENT permission + resource access check)
router.delete('/:id', authenticate, requirePermission('DELETE_STUDENT'), requireResourceAccess('student'), studentController.deleteStudent);

// Suspend student (requires DISABLE_ACCOUNTS permission)
router.put('/:id/suspend', authenticate, requirePermission('DISABLE_ACCOUNTS'), studentController.suspendStudent);

// Activate student (requires DISABLE_ACCOUNTS permission)
router.put('/:id/activate', authenticate, requirePermission('DISABLE_ACCOUNTS'), studentController.activateStudent);

// Reset student password (requires RESET_PASSWORDS permission)
router.put('/:id/reset-password', authenticate, requirePermission('RESET_PASSWORDS'), studentController.resetPassword);

// Assign course to student (requires EDIT_STUDENT permission)
router.put('/:id/assign-course', authenticate, requirePermission('EDIT_STUDENT'), studentController.assignCourse);

// Get student statistics (requires VIEW_STUDENT permission)
router.get('/stats/overview', authenticate, requirePermission('VIEW_STUDENT'), studentController.getStudentStatistics);

// Import students from Excel (requires CREATE_STUDENT permission)
router.post('/import/excel', authenticate, requirePermission('CREATE_STUDENT'), excelUpload.single('file'), studentController.importStudentsFromExcel);

// Upload profile picture (requires EDIT_STUDENT permission)
router.post('/:id/profile-picture', authenticate, requirePermission('EDIT_STUDENT'), profilePictureUpload.single('profilePicture'), studentController.uploadProfilePicture);

// Delete profile picture (requires EDIT_STUDENT permission)
router.delete('/:id/profile-picture', authenticate, requirePermission('EDIT_STUDENT'), studentController.deleteProfilePicture);

module.exports = router;
