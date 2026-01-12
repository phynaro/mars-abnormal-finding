const express = require('express');
const router = express.Router();
const areaDashboardController = require('../controllers/areaDashboardController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);

// Get Area Dashboard Metrics (requires TKT form view permission)
router.post('/metrics', requireFormPermission('TKT', 'view'), areaDashboardController.getAreaMetrics);

module.exports = router;
