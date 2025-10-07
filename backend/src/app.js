const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: '.env.development' });
} else {
  dotenv.config();
}

// Increase Node.js header size limits to prevent HTTP 431 errors
process.env.NODE_OPTIONS = '--max-http-header-size=16384';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or internal Docker calls)
    if (!origin) return callback(null, true);
    
    // In production with Docker, nginx handles CORS, so we can be more permissive
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    // Development: Allow common development origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // Allow localhost and 127.0.0.1 for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    console.log(`CORS Blocked - Origin: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Middleware to handle large headers and prevent HTTP 431 errors
app.use((req, res, next) => {
  // Set larger header limits
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Capture raw body for LINE webhook signature verification
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try { req.rawBody = buf.toString('utf8'); } catch {}
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Static file serving for uploads
// Primary: backend/uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Backward-compat: also serve backend/src/uploads in case older files were stored there
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger API Documentation
const swagger = require('./config/swagger');
app.use('/api-docs', swagger.serve, swagger.setup);
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swagger.swaggerSpec);
});

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const machineRoutes = require('./routes/machine');
const ticketRoutes = require('./routes/ticket');
const lineRoutes = require('./routes/line');
const assetRoutes = require('./routes/asset');
const testAssetRoutes = require('./routes/test-asset');
const workOrderRoutes = require('./routes/workorder');
const workRequestRoutes = require('./routes/workrequest');
const inventoryRoutes = require('./routes/inventory');
const personnelRoutes = require('./routes/personnel');
const workflowRoutes = require('./routes/workflow');
const dashboardRoutes = require('./routes/dashboard');
const backlogRoutes = require('./routes/backlog');
const hierarchyRoutes = require('./routes/hierarchy');
const administrationRoutes = require('./routes/administration');
const targetRoutes = require('./routes/target');
const personalTargetRoutes = require('./routes/personalTarget');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/line', lineRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/test', testAssetRoutes);
app.use('/api/workorders', workOrderRoutes);
app.use('/api/workrequest', workRequestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/backlog', backlogRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/administration', administrationRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/personal-targets', personalTargetRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Mars Abnormal Finding System API is running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle multer errors with proper status codes and messages
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum file size allowed is 10MB.',
      code: 'LIMIT_FILE_SIZE',
      field: err.field || 'file'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
      code: 'LIMIT_UNEXPECTED_FILE',
      field: err.field
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files uploaded',
      code: 'LIMIT_FILE_COUNT'
    });
  }
  
  if (err.code === 'LIMIT_FIELD_KEY') {
    return res.status(400).json({
      success: false,
      message: 'Field name too long',
      code: 'LIMIT_FIELD_KEY'
    });
  }
  
  if (err.code === 'LIMIT_FIELD_VALUE') {
    return res.status(400).json({
      success: false,
      message: 'Field value too long',
      code: 'LIMIT_FIELD_VALUE'
    });
  }
  
  if (err.code === 'LIMIT_FIELD_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many fields',
      code: 'LIMIT_FIELD_COUNT'
    });
  }

  // Default error handling
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`📄 OpenAPI Spec: http://localhost:${PORT}/api-docs.json`);
});

module.exports = app; 
