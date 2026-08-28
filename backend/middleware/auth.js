const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Password complexity requirements
const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
const PASSWORD_REQUIRE_UPPERCASE = process.env.PASSWORD_REQUIRE_UPPERCASE === 'true';
const PASSWORD_REQUIRE_LOWERCASE = process.env.PASSWORD_REQUIRE_LOWERCASE === 'true';
const PASSWORD_REQUIRE_NUMBERS = process.env.PASSWORD_REQUIRE_NUMBERS === 'true';
const PASSWORD_REQUIRE_SPECIAL_CHARS = process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === 'true';
const PASSWORD_EXPIRY_DAYS = parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90;
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const ACCOUNT_LOCKOUT_DURATION = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES) || 30;

// Validate password complexity
const validatePassword = (password) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }

  if (PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return false;
  }

  if (PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return false;
  }

  if (PASSWORD_REQUIRE_NUMBERS && !/\d/.test(password)) {
    return false;
  }

  if (PASSWORD_REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }

  return true;
};

// Check if password is in user's password history
const isPasswordInHistory = async (userId, newPassword) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.password_history) return false;

    const passwordHistory = user.password_history || [];
    
    for (const oldHashedPassword of passwordHistory) {
      const isMatch = await bcrypt.compare(newPassword, oldHashedPassword);
      if (isMatch) return true;
    }

    return false;
  } catch (error) {
    console.error('Password history check error:', error);
    return false;
  }
};

// Check if account is locked
const isAccountLocked = (user) => {
  if (!user.account_locked_until) return false;
  return new Date(user.account_locked_until) > new Date();
};

// Increment failed login attempts
const incrementFailedAttempts = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const newAttempts = (user.failed_login_attempts || 0) + 1;
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Lock the account
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + ACCOUNT_LOCKOUT_DURATION);
      
      await User.update(userId, {
        failed_login_attempts: newAttempts,
        account_locked_until: lockUntil.toISOString()
      });
    } else {
      await User.update(userId, {
        failed_login_attempts: newAttempts
      });
    }
  } catch (error) {
    console.error('Increment failed attempts error:', error);
  }
};

// Reset failed login attempts on successful login
const resetFailedAttempts = async (userId) => {
  try {
    await User.update(userId, {
      failed_login_attempts: 0,
      account_locked_until: null,
      last_login_at: new Date().toISOString(),
      last_login_ip: null // Will be set from request
    });
  } catch (error) {
    console.error('Reset failed attempts error:', error);
  }
};

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

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(403).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts',
        locked_until: user.account_locked_until
      });
    }

    // Check if password needs to be changed
    if (user.must_change_password) {
      return res.status(403).json({ 
        error: 'Password change required',
        must_change_password: true
      });
    }

    // Check password expiry
    if (user.last_password_change) {
      const lastChange = new Date(user.last_password_change);
      const expiryDate = new Date(lastChange);
      expiryDate.setDate(expiryDate.getDate() + PASSWORD_EXPIRY_DAYS);
      
      if (new Date() > expiryDate) {
        await User.update(user.id, { must_change_password: true });
        return res.status(403).json({ 
          error: 'Password has expired. Please change your password.',
          must_change_password: true
        });
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      student_number: user.student_number,
      role: user.role,
      full_name: user.full_name,
      course_id: user.course_id,
      must_change_password: user.must_change_password
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
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
  requireCourseAccess,
  validatePassword,
  isPasswordInHistory,
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts
};
