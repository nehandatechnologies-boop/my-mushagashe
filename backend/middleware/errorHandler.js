const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom error logger
const logError = (error, req = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = {
    timestamp,
    error: error.message,
    stack: error.stack,
    path: req ? req.path : null,
    method: req ? req.method : null,
    ip: req ? req.ip : null
  };

  const errorLogPath = path.join(logsDir, 'error.log');
  fs.appendFileSync(errorLogPath, JSON.stringify(logMessage) + '\n');
  
  console.error('Error logged:', logMessage);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Log the error
  logError(err, req);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Handle database errors
  if (err.message && err.message.includes('UNIQUE')) {
    return res.status(400).json({
      error: 'Duplicate entry'
    });
  }

  if (err.message && err.message.includes('FOREIGN KEY')) {
    return res.status(400).json({
      error: 'Invalid reference'
    });
  }

  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  // Check if this is a request for a static asset (CSS, JS, images, etc.)
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    // For static assets, return a 404 without JSON
    res.status(404).send('Not Found');
  } else {
    // For API routes and pages, return JSON error
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method
    });
  }
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logError
};
