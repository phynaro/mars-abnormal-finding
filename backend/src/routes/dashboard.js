const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Public endpoints (before authentication middleware)
// Get Current Period and Week (public endpoint, no authentication required)
router.get('/current-period-week', dashboardController.getCurrentPeriodAndWeek);

// Apply authentication middleware to all other routes
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

// Get Tickets Closed Per Period (requires TKT form view permission)
router.get('/tickets-closed-per-period', requireFormPermission('TKT', 'view'), dashboardController.getTicketsClosedPerPeriod);

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

// Debug endpoint for plant/area data consistency
router.get('/debug-plant-area-data', requireFormPermission('TKT', 'view'), dashboardController.debugPlantAreaData);

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

// Get Personal KPI Comparison Data (requires TKT form view permission)
router.get('/personal-kpi-comparison', requireFormPermission('TKT', 'view'), dashboardController.getPersonalKPIComparison);

// Get Department User KPI - Tickets Created (requires TKT form view permission)
router.get('/department-user-kpi/tickets-created', requireFormPermission('TKT', 'view'), dashboardController.getDepartmentUserKPITicketsCreated);

// Get Department User KPI - Tickets Assigned (requires TKT form view permission)
router.get('/department-user-kpi/tickets-assigned', requireFormPermission('TKT', 'view'), dashboardController.getDepartmentUserKPITicketsAssigned);

// Get Case Count by PU (requires TKT form view permission)
router.get('/case-count-by-pu', requireFormPermission('TKT', 'view'), dashboardController.getCaseCountByPU);

module.exports = router;
