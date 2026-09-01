const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      student_number: user.student_number,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    console.log('Auth middleware - decoded userId:', decoded.userId);
    
    // Get fresh user data
    const user = await User.findById(decoded.userId);
    
    console.log('Auth middleware - user found:', user ? 'yes' : 'no');
    if (user) {
      console.log('Auth middleware - user status:', user.status);
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'active') {
      console.log('Auth middleware - user not active, status:', user.status);
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      student_number: user.student_number,
      role: user.role,
      full_name: user.full_name,
      course_id: user.course_id
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = authorize('admin');

// Lecturer only middleware
const lecturerOnly = authorize('lecturer');

// Student only middleware
const studentOnly = authorize('student');

// Course access control middleware for lecturers
const requireCourseAccess = (req, res, next) => {
  // Admins can access all courses
  if (req.user.role === 'admin') {
    return next();
  }

  // Lecturers can only access their assigned course
  if (req.user.role === 'lecturer') {
    const courseId = req.params.courseId || req.body.course_id || req.query.course_id;
    
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID required' });
    }

    if (parseInt(courseId) !== req.user.course_id) {
      return res.status(403).json({ error: 'Access denied: You can only manage your assigned course' });
    }

    return next();
  }

  // Students can only access their own data
  if (req.user.role === 'student') {
    return next();
  }

  return res.status(403).json({ error: 'Insufficient permissions' });
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  adminOnly,
  lecturerOnly,
  studentOnly,
  requireCourseAccess
};
