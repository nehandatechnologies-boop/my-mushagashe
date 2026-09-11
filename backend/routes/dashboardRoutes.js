const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Get comprehensive dashboard statistics (requires dashboard.view permission)
router.get('/statistics', authenticate, requirePermission('dashboard.view'), dashboardController.getDashboardStatistics);

// Get student-specific dashboard data (student only)
router.get('/student', authenticate, dashboardController.getStudentDashboard);

// Get chart data for analytics (requires dashboard.view permission)
router.get('/charts', authenticate, requirePermission('dashboard.view'), dashboardController.getChartData);

module.exports = router;
