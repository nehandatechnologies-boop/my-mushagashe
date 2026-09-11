const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const templateController = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

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

// Upload PDF template (requires settings.edit permission)
router.post('/upload', authenticate, requirePermission('settings.edit'), upload.single('template'), templateController.uploadTemplate);

// Get template info (requires settings.view permission)
router.get('/info', authenticate, requirePermission('settings.view'), templateController.getTemplateInfo);

// Delete template (requires settings.edit permission)
router.delete('/delete', authenticate, requirePermission('settings.edit'), templateController.deleteTemplate);

module.exports = router;
