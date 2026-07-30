const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for authentication routes (per-IP and per-identifier)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP + identifier to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts for this account, please try again later.'
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Create a unique key based on IP AND the login identifier (email or student_number)
    // This ensures that:
    // 1. Different users on different IPs don't affect each other
    // 2. Different users on the same IP don't affect each other
    // 3. Same user on different IPs is tracked separately
    const ip = req.ip || req.connection.remoteAddress;
    const identifier = req.body?.email || req.body?.student_number || 'unknown';
    return `${ip}-${identifier}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB default
  
  if (req.headers['content-length'] > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large'
    });
  }
  
  next();
};

// XSS protection middleware
const xssProtection = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

// Remove sensitive data from logs
const sanitizeLogs = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function (data) {
    // Don't log sensitive data
    if (req.path.includes('/auth/login')) {
      req.body = { ...req.body, password: '***' };
    }
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  securityHeaders,
  rateLimiter,
  authRateLimiter,
  corsOptions,
  requestSizeLimiter,
  xssProtection,
  sanitizeLogs
};
