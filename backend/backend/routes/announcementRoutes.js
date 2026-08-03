const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const announcementController = require('../controllers/announcementController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Validation middleware
const validateAnnouncement = [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'normal', 'important', 'urgent']).withMessage('Invalid priority')
];

// Create new announcement (admin only)
router.post('/', authenticate, adminOnly, announcementController.createAnnouncement);

// Get all announcements (authenticated)
router.get('/', authenticate, announcementController.getAllAnnouncements);

// Get latest announcements (public)
router.get('/latest', announcementController.getLatestAnnouncements);

// Get urgent announcements (public)
router.get('/urgent', announcementController.getUrgentAnnouncements);

// Get announcement statistics (admin only)
router.get('/statistics', authenticate, adminOnly, announcementController.getAnnouncementStatistics);

// Get announcement by ID (authenticated)
router.get('/:id', authenticate, announcementController.getAnnouncementById);

// Update announcement (admin only)
router.put('/:id', authenticate, adminOnly, announcementController.updateAnnouncement);

// Delete announcement (admin only)
router.delete('/:id', authenticate, adminOnly, announcementController.deleteAnnouncement);

module.exports = router;
