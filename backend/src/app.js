const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Increase Node.js header size limits to prevent HTTP 431 errors
process.env.NODE_OPTIONS = '--max-http-header-size=16384';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://192.168.0.241:3000',
      'http://192.168.0.241:3001'
    ];

   // console.log(`CORS Check - Origin: ${origin}, FRONTEND_URL: ${process.env.FRONTEND_URL}`);
    
    // Allow localhost, 127.0.0.1, and local network IPs
    if (origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('192.168.0.') ||
        origin.includes('192.168.1.')) {
     // console.log(`CORS Allowed - Local network: ${origin}`);
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
     // console.log(`CORS Allowed - Explicit match: ${origin}`);
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
