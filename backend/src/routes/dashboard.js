const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get Work Order Volume Trend (requires WO form view permission)
router.get('/workorder-volume-trend', requireFormPermission('WO', 'view'), dashboardController.getWorkOrderVolumeTrend);

// Get Work Order Volume Statistics (requires WO form view permission)
router.get('/workorder-volume', requireFormPermission('WO', 'view'), dashboardController.getWorkOrderVolume);

// Get Personal Work Order Volume Statistics (requires WO form view permission)
router.get('/workorder-volume/personal', requireFormPermission('WO', 'view'), dashboardController.getPersonalWorkOrderVolume);

// Get Personal Work Order Volume Statistics by Period (requires WO form view permission)
router.get('/workorder-volume/personal/period', requireFormPermission('WO', 'view'), dashboardController.getPersonalWorkOrderVolumeByPeriod);

// Get Work Order Volume Filter Options (requires WO form view permission)
router.get('/workorder-volume/filter-options', requireFormPermission('WO', 'view'), dashboardController.getWorkOrderVolumeFilterOptions);

// Get Current Company Year (requires WO form view permission)
router.get('/current-company-year', requireFormPermission('WO', 'view'), dashboardController.getCurrentCompanyYear);

// Get Abnormal Finding KPIs (requires TKT form view permission)
router.get('/af', requireFormPermission('TKT', 'view'), dashboardController.getAbnormalFindingKPIs);

module.exports = router;
