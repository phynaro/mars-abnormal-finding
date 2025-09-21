const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/workOrderController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all work orders with filtering and pagination (requires WO form view permission)
router.get('/', requireFormPermission('WO', 'view'), workOrderController.getWorkOrders);

// Get work order by ID (requires WO form view permission)
router.get('/:id', requireFormPermission('WO', 'view'), workOrderController.getWorkOrderById);

// Get work order statistics (requires WO form view permission)
router.get('/stats/overview', requireFormPermission('WO', 'view'), workOrderController.getWorkOrderStats);

// Get work order types (requires WO form view permission)
router.get('/types/list', requireFormPermission('WO', 'view'), workOrderController.getWorkOrderTypes);

// Get work order statuses (requires WO form view permission)
router.get('/statuses/list', requireFormPermission('WO', 'view'), workOrderController.getWorkOrderStatuses);

// Get work order priorities (requires WO form view permission)
router.get('/priorities/list', requireFormPermission('WO', 'view'), workOrderController.getWorkOrderPriorities);

// Get work order resources (requires WO form view permission)
router.get('/:id/resources', requireFormPermission('WO', 'view'), workOrderController.getWorkOrderResources);

// Get work order tasks (requires WO form view permission)
router.get('/:id/tasks', requireFormPermission('WO', 'view'), workOrderController.getWorkOrderTasks);

module.exports = router;
