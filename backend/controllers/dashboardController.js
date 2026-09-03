const User = require('../models/User');
const Course = require('../models/Course');
const Fee = require('../models/Fee');
const Result = require('../models/Result');
const Announcement = require('../models/Announcement');

// Get comprehensive dashboard statistics
const getDashboardStatistics = async (req, res) => {
  try {
    // Get statistics from all models
    const userStats = await User.getStatistics();
    const feeStats = await Fee.getStatistics();
    const resultStats = await Result.getStatistics();
    const announcementStats = await Announcement.getStatistics();
    const courses = await Course.getAllWithStudentCount();

    const totalCourses = courses.length;
    const totalStudents = userStats ? userStats.total || 0 : 0;
    const totalFees = feeStats ? feeStats.total_fees || 0 : 0;
    const totalResults = resultStats ? resultStats.total_results || 0 : 0;
    const totalAnnouncements = announcementStats ? announcementStats.total || 0 : 0;

    const statistics = {
      students: {
        total: totalStudents,
        male: userStats ? userStats.male_count || 0 : 0,
        female: userStats ? userStats.female_count || 0 : 0,
        active: userStats ? userStats.active_count || 0 : 0,
        suspended: userStats ? userStats.suspended_count || 0 : 0
      },
      courses: {
        total: totalCourses,
        with_students: courses.filter(c => c.student_count > 0).length
      },
      fees: {
        total: totalFees,
        unpaid: feeStats ? feeStats.unpaid_count || 0 : 0,
        partial: feeStats ? feeStats.partial_count || 0 : 0,
        paid: feeStats ? feeStats.paid_count || 0 : 0,
        total_amount: feeStats ? feeStats.total_amount || 0 : 0,
        total_collected: feeStats ? feeStats.total_collected || 0 : 0,
        total_outstanding: feeStats ? feeStats.total_outstanding || 0 : 0
      },
      results: {
        total: totalResults,
        grade_a: resultStats ? resultStats.grade_a || 0 : 0,
        grade_b: resultStats ? resultStats.grade_b || 0 : 0,
        grade_c: resultStats ? resultStats.grade_c || 0 : 0,
        grade_d: resultStats ? resultStats.grade_d || 0 : 0,
        grade_e: resultStats ? resultStats.grade_e || 0 : 0,
        grade_f: resultStats ? resultStats.grade_f || 0 : 0,
        average_mark: resultStats ? resultStats.average_mark || 0 : 0
      },
      announcements: {
        total: totalAnnouncements,
        urgent: announcementStats ? announcementStats.urgent_count || 0 : 0,
        important: announcementStats ? announcementStats.important_count || 0 : 0,
        normal: announcementStats ? announcementStats.normal_count || 0 : 0,
        low: announcementStats ? announcementStats.low_count || 0 : 0
      }
    };

    res.json(statistics);
  } catch (error) {
    console.error('Get dashboard statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Get student-specific dashboard data
const getStudentDashboard = async (req, res) => {
  try {
    console.log('[DASHBOARD] Student dashboard request - User ID:', req.user?.id, 'Role:', req.user?.role);
    const userId = req.user.id;

    console.log('[DASHBOARD] Fetching user data...');
    const user = await User.findById(userId);
    console.log('[DASHBOARD] User found:', user ? 'yes' : 'no');

    console.log('[DASHBOARD] Fetching fees...');
    const fees = await Fee.findByUserId(userId);
    console.log('[DASHBOARD] Fees count:', fees?.length);

    console.log('[DASHBOARD] Fetching results...');
    const results = await Result.findByUserId(userId);
    console.log('[DASHBOARD] Results count:', results?.length);

    console.log('[DASHBOARD] Fetching announcements...');
    const announcements = await Announcement.getLatest(5);
    console.log('[DASHBOARD] Announcements count:', announcements?.length);

    console.log('[DASHBOARD] Calculating outstanding balance...');
    const outstandingBalance = await Fee.getOutstandingByUser(userId);
    console.log('[DASHBOARD] Outstanding balance:', outstandingBalance);

    console.log('[DASHBOARD] Calculating GPA...');
    const gpaData = await Result.getStudentGPA(userId);
    console.log('[DASHBOARD] GPA data:', gpaData);

    const dashboardData = {
      user: {
        id: user.id,
        full_name: user.full_name,
        student_number: user.student_number,
        course_name: user.course_name,
        course_code: user.course_code,
        status: user.status
      },
      fees: {
        total: fees.length,
        unpaid: fees.filter(f => f.status === 'unpaid').length,
        paid: fees.filter(f => f.status === 'paid').length,
        outstanding_balance: outstandingBalance
      },
      results: {
        total: results.length,
        gpa: gpaData.gpa,
        total_courses: gpaData.total_courses
      },
      announcements: announcements.slice(0, 5)
    };

    console.log('[DASHBOARD] Dashboard data prepared successfully');
    res.json(dashboardData);
  } catch (error) {
    console.error('[DASHBOARD] Get student dashboard error:', error);
    console.error('[DASHBOARD] Error message:', error.message);
    console.error('[DASHBOARD] Error code:', error.code);
    console.error('[DASHBOARD] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch student dashboard data' });
  }
};

// Get chart data for analytics
const getChartData = async (req, res) => {
  try {
    const { type } = req.query;

    let chartData = {};

    switch (type) {
      case 'enrollment':
        // Student enrollment by course
        const courses = await Course.getAllWithStudentCount();
        chartData = {
          labels: courses.map(c => c.course_name),
          data: courses.map(c => c.student_count),
          type: 'bar'
        };
        break;

      case 'fees':
        // Fee collection by category
        const allFees = await Fee.findAll({});
        const feeCategories = {};
        allFees.forEach(fee => {
          if (!feeCategories[fee.fee_category]) {
            feeCategories[fee.fee_category] = { total: 0, collected: 0 };
          }
          feeCategories[fee.fee_category].total += fee.amount;
          feeCategories[fee.fee_category].collected += fee.amount_paid || 0;
        });

        chartData = {
          labels: Object.keys(feeCategories),
          data: Object.values(feeCategories).map(f => f.collected),
          type: 'pie'
        };
        break;

      case 'gender':
        // Gender distribution
        const userStats = await User.getStatistics();
        chartData = {
          labels: ['Male', 'Female'],
          data: [userStats.male_count || 0, userStats.female_count || 0],
          type: 'doughnut'
        };
        break;

      case 'results':
        // Results distribution by grade
        const resultStats = await Result.getStatistics();
        chartData = {
          labels: ['A', 'B', 'C', 'D', 'E', 'F'],
          data: [
            resultStats.grade_a || 0,
            resultStats.grade_b || 0,
            resultStats.grade_c || 0,
            resultStats.grade_d || 0,
            resultStats.grade_e || 0,
            resultStats.grade_f || 0
          ],
          type: 'bar'
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid chart type' });
    }

    res.json(chartData);
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};

module.exports = {
  getDashboardStatistics,
  getStudentDashboard,
  getChartData
};
