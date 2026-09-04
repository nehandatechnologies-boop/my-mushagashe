const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabaseAuth');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Verify custom JWT token
const verifyCustomToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Verify Supabase token
const verifySupabaseToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
};

// Hybrid authentication middleware
const authenticateHybrid = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    
    // Try Supabase token first
    const supabaseUser = await verifySupabaseToken(token);
    
    if (supabaseUser) {
      // Supabase Auth token valid
      console.log('Auth middleware - Supabase token valid for user:', supabaseUser.email);
      
      // Find user in custom users table by email
      const user = await User.findByEmail(supabaseUser.email);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found in profile database' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      req.user = {
        id: user.id,
        email: user.email,
        student_number: user.student_number,
        role: user.role,
        full_name: user.full_name,
        course_id: user.course_id,
        auth_type: 'supabase',
        supabase_user_id: supabaseUser.id
      };

      return next();
    }
    
    // Try custom JWT token
    const customUser = verifyCustomToken(token);
    
    if (customUser) {
      // Custom JWT token valid
      console.log('Auth middleware - Custom JWT valid for user ID:', customUser.userId);
      
      // Get fresh user data
      const user = await User.findById(customUser.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      req.user = {
        id: user.id,
        email: user.email,
        student_number: user.student_number,
        role: user.role,
        full_name: user.full_name,
        course_id: user.course_id,
        auth_type: 'custom'
      };

      return next();
    }
    
    // Neither token type valid
    return res.status(401).json({ error: 'Invalid token' });
    
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware (unchanged)
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

// Course access control middleware (unchanged)
const requireCourseAccess = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }

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

  if (req.user.role === 'student') {
    return next();
  }

  return res.status(403).json({ error: 'Insufficient permissions' });
};

module.exports = {
  authenticateHybrid,
  authorize,
  adminOnly,
  lecturerOnly,
  studentOnly,
  requireCourseAccess
};
