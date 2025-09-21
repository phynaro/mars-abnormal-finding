const express = require('express');
const router = express.Router();
const workRequestController = require('../controllers/workRequestController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all work requests with filtering and pagination (requires WR form view permission)
router.get('/', requireFormPermission('WR', 'view'), workRequestController.getWorkRequests);

// Get work request by ID (requires WR form view permission)
router.get('/:id', requireFormPermission('WR', 'view'), workRequestController.getWorkRequestById);

// Get work request statistics (requires WR form view permission)
router.get('/stats/overview', requireFormPermission('WR', 'view'), workRequestController.getWorkRequestStats);

// Get work request types (requires WR form view permission)
router.get('/types/list', requireFormPermission('WR', 'view'), workRequestController.getWorkRequestTypes);

// Get work request statuses (requires WR form view permission)
router.get('/statuses/list', requireFormPermission('WR', 'view'), workRequestController.getWorkRequestStatuses);

// Get work request urgencies (requires WR form view permission)
router.get('/urgencies/list', requireFormPermission('WR', 'view'), workRequestController.getWorkRequestUrgencies);

// Get work request categories (requires WR form view permission)
router.get('/categories/list', requireFormPermission('WR', 'view'), workRequestController.getWorkRequestCategories);

// Get work request resources (requires WR form view permission)
router.get('/:id/resources', requireFormPermission('WR', 'view'), workRequestController.getWorkRequestResources);

// Create new work request (requires WR form save permission)
router.post('/', requireFormPermission('WR', 'save'), workRequestController.createWorkRequest);

// Execute workflow action (requires WR form save permission)
router.post('/:id/workflow/action', requireFormPermission('WR', 'save'), workRequestController.executeWorkflowAction);

// Get workflow status (requires WR form view permission)
router.get('/:id/workflow/status', requireFormPermission('WR', 'view'), workRequestController.getWorkflowStatus);

// Get my workflow tasks (requires WR form view permission)
router.get('/workflow/my-tasks', requireFormPermission('WR', 'view'), workRequestController.getMyWorkflowTasks);

module.exports = router;
