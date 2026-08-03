const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Get comprehensive dashboard statistics (admin only)
router.get('/statistics', authenticate, adminOnly, dashboardController.getDashboardStatistics);

// Get student-specific dashboard data (student only)
router.get('/student', authenticate, dashboardController.getStudentDashboard);

// Get chart data for analytics (admin only)
router.get('/charts', authenticate, adminOnly, dashboardController.getChartData);

module.exports = router;
