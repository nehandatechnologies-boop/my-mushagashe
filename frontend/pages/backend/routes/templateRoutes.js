const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const templateController = require('../controllers/templateController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!require('fs').existsSync(uploadDir)) {
      require('fs').mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Upload PDF template (admin only)
router.post('/upload', authenticate, adminOnly, upload.single('template'), templateController.uploadTemplate);

// Get template info (admin only)
router.get('/info', authenticate, adminOnly, templateController.getTemplateInfo);

// Delete template (admin only)
router.delete('/delete', authenticate, adminOnly, templateController.deleteTemplate);

module.exports = router;
