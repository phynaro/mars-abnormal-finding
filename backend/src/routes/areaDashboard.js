const express = require('express');
const router = express.Router();
const areaDashboardController = require('../controllers/areaDashboardController');
const { authenticateToken, requireFormPermission, requireInternalUser } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);
router.use(requireInternalUser);

// Get Area Dashboard Metrics (requires TKT form view permission)
router.post('/metrics', requireFormPermission('TKT', 'view'), areaDashboardController.getAreaMetrics);

module.exports = router;
