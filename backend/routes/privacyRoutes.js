const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const privacyController = require('../controllers/privacyController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

// Validation middleware
const validatePrivacyRequest = [
  body('request_type').notEmpty().withMessage('Request type is required'),
  body('request_type').isIn(['ACCESS', 'DELETION', 'CORRECTION', 'PORTABILITY', 'OBJECTION']).withMessage('Invalid request type')
];

const validateConsentUpdate = [
  body('consent_type').notEmpty().withMessage('Consent type is required'),
  body('consented').isBoolean().withMessage('Consented must be a boolean')
];

// Get current privacy notice (public)
router.get('/notice', privacyController.getCurrentPrivacyNotice);

// Get user's consent status (authenticated)
router.get('/consent', authenticate, privacyController.getUserConsentStatus);

// Update user consent (authenticated)
router.put('/consent', authenticate, validateConsentUpdate, privacyController.updateUserConsent);

// Create privacy request (authenticated)
router.post('/requests', authenticate, validatePrivacyRequest, privacyController.createPrivacyRequest);

// Get user's privacy requests (authenticated)
router.get('/requests', authenticate, privacyController.getUserPrivacyRequests);

// Get all privacy requests (requires MANAGE_PRIVACY_REQUESTS permission)
router.get('/requests/all', authenticate, requirePermission('MANAGE_PRIVACY_REQUESTS'), privacyController.getAllPrivacyRequests);

// Update privacy request status (requires MANAGE_PRIVACY_REQUESTS permission)
router.put('/requests/:id', authenticate, requirePermission('MANAGE_PRIVACY_REQUESTS'), privacyController.updatePrivacyRequest);

// Export user data (requires EXPORT_DATA permission or own data)
router.get('/export/:id', authenticate, privacyController.exportUserData);

module.exports = router;
