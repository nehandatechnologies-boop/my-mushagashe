const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const announcementController = require('../controllers/announcementController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Validation middleware
const validateAnnouncement = [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'normal', 'important', 'urgent']).withMessage('Invalid priority')
];

// Create new announcement - requires announcements.create permission
router.post('/', authenticate, requirePermission('announcements.create'), validateAnnouncement, announcementController.createAnnouncement);

// Get all announcements - requires announcements.view permission
router.get('/', authenticate, requirePermission('announcements.view'), announcementController.getAllAnnouncements);

// Get latest announcements (public - no auth required)
router.get('/latest', announcementController.getLatestAnnouncements);

// Get urgent announcements (public - no auth required)
router.get('/urgent', announcementController.getUrgentAnnouncements);

// Get announcement statistics - requires announcements.view permission
router.get('/statistics', authenticate, requirePermission('announcements.view'), announcementController.getAnnouncementStatistics);

// Get unread announcement count - requires announcements.view permission
router.get('/unread/count', authenticate, requirePermission('announcements.view'), announcementController.getUnreadCount);

// Get announcements with read status - requires announcements.view permission
router.get('/with-status', authenticate, requirePermission('announcements.view'), announcementController.getAnnouncementsWithReadStatus);

// Get announcement by ID - requires announcements.view permission
router.get('/:id', authenticate, requirePermission('announcements.view'), announcementController.getAnnouncementById);

module.exports = router;
