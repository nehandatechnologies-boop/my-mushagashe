const helmet = require('helmet');
const cors = require('cors');

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "https://*.supabase.co"],
      connectSrc: ["'self'", "http://localhost:5000", "https://*.onrender.com", "https://*.supabase.co"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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
  corsOptions,
  requestSizeLimiter,
  xssProtection,
  sanitizeLogs
};
