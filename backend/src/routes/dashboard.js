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

// Get Tickets Count Per Period (requires TKT form view permission)
router.get('/tickets-count-per-period', requireFormPermission('TKT', 'view'), dashboardController.getTicketsCountPerPeriod);

// Get Area Activity Data (requires TKT form view permission)
router.get('/area-activity', requireFormPermission('TKT', 'view'), dashboardController.getAreaActivityData);

// Get User Activity Data (requires TKT form view permission)
router.get('/user-activity', requireFormPermission('TKT', 'view'), dashboardController.getUserActivityData);

// Get Calendar Heatmap Data (requires TKT form view permission)
router.get('/calendar-heatmap', requireFormPermission('TKT', 'view'), dashboardController.getCalendarHeatmapData);

// Get Downtime Avoidance Trend Data (requires TKT form view permission)
router.get('/downtime-avoidance-trend', requireFormPermission('TKT', 'view'), dashboardController.getDowntimeAvoidanceTrend);

// Get Cost Avoidance Data (requires TKT form view permission)
router.get('/cost-avoidance', requireFormPermission('TKT', 'view'), dashboardController.getCostAvoidanceData);

// Get Downtime Impact Leaderboard Data (requires TKT form view permission)
router.get('/downtime-impact-leaderboard', requireFormPermission('TKT', 'view'), dashboardController.getDowntimeImpactLeaderboard);

// Get Cost Impact Leaderboard Data (requires TKT form view permission)
router.get('/cost-impact-leaderboard', requireFormPermission('TKT', 'view'), dashboardController.getCostImpactLeaderboard);

// Get Ontime Rate by Area Data (requires TKT form view permission)
router.get('/ontime-rate-by-area', requireFormPermission('TKT', 'view'), dashboardController.getOntimeRateByArea);

// Get Ontime Rate by User Data (requires TKT form view permission)
router.get('/ontime-rate-by-user', requireFormPermission('TKT', 'view'), dashboardController.getOntimeRateByUser);

// Get Ticket Resolve Duration by User Data (requires TKT form view permission)
router.get('/ticket-resolve-duration-by-user', requireFormPermission('TKT', 'view'), dashboardController.getTicketResolveDurationByUser);

// Get Ticket Resolve Duration by Area Data (requires TKT form view permission)
router.get('/ticket-resolve-duration-by-area', requireFormPermission('TKT', 'view'), dashboardController.getTicketResolveDurationByArea);

// Get Cost Impact by Failure Mode Data (requires TKT form view permission)
router.get('/cost-impact-by-failure-mode', requireFormPermission('TKT', 'view'), dashboardController.getCostImpactByFailureMode);

// Get Downtime Impact by Failure Mode Data (requires TKT form view permission)
router.get('/downtime-impact-by-failure-mode', requireFormPermission('TKT', 'view'), dashboardController.getDowntimeImpactByFailureMode);

// Get Cost Impact Reporter Leaderboard Data (requires TKT form view permission)
router.get('/cost-impact-reporter-leaderboard', requireFormPermission('TKT', 'view'), dashboardController.getCostImpactReporterLeaderboard);

// Get Downtime Impact Reporter Leaderboard Data (requires TKT form view permission)
router.get('/downtime-impact-reporter-leaderboard', requireFormPermission('TKT', 'view'), dashboardController.getDowntimeImpactReporterLeaderboard);

module.exports = router;
