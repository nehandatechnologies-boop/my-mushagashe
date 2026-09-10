const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const intakeController = require('../controllers/intakeController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Validation middleware
const validateIntake = [
  body('name').notEmpty().withMessage('Intake name is required'),
  body('year').isInt().withMessage('Year must be a valid integer')
];

// All intake routes require authentication
router.use(authenticate);

// Get all intakes - requires intakes.view permission
router.get('/', requirePermission('intakes.view'), intakeController.getAllIntakes);

// Get intake by ID - requires intakes.view permission
router.get('/:id', requirePermission('intakes.view'), intakeController.getIntakeById);

// Get active intake - requires intakes.view permission
router.get('/active/current', requirePermission('intakes.view'), intakeController.getActiveIntake);

// Get intake years - requires intakes.view permission
router.get('/years/list', requirePermission('intakes.view'), intakeController.getIntakeYears);

// Create new intake - requires intakes.create permission
router.post('/', requirePermission('intakes.create'), validateIntake, intakeController.createIntake);

// Update intake - requires intakes.edit permission
router.put('/:id', requirePermission('intakes.edit'), validateIntake, intakeController.updateIntake);

// Delete intake - requires intakes.delete permission
router.delete('/:id', requirePermission('intakes.delete'), intakeController.deleteIntake);

module.exports = router;
