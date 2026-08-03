require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import middleware
const { 
  securityHeaders, 
  rateLimiter, 
  corsOptions, 
  requestSizeLimiter, 
  xssProtection,
  sanitizeLogs 
} = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const feeRoutes = require('./routes/feeRoutes');
const resultRoutes = require('./routes/resultRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentHistoryRoutes = require('./routes/paymentHistoryRoutes');
const templateRoutes = require('./routes/templateRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Render deployment
app.set('trust proxy', true);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(securityHeaders);
app.use(xssProtection);
app.use(cors(corsOptions));
app.use(rateLimiter);
app.use(requestSizeLimiter);
app.use(sanitizeLogs);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files - handle both local and deployment paths
const frontendPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../frontend') 
  : path.join(__dirname, '../frontend');

app.use(express.static(frontendPath));

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Serve other frontend pages
app.get('/student-login.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/student-login.html'));
});

app.get('/lecturer-login.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/lecturer-login.html'));
});

app.get('/admin-login.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/admin-login.html'));
});

app.get('/student-register.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/student-register.html'));
});

app.get('/lecturer-dashboard.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/lecturer-dashboard.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/admin-dashboard.html'));
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payment-history', paymentHistoryRoutes);
app.use('/api/templates', templateRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Security: Helmet, Rate Limiting, CORS enabled`);
  console.log(`📝 Logging: Morgan enabled`);
  console.log(`💾 Database: Supabase connected`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
