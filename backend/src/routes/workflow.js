const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get workflow types (requires WF form view permission)
router.get('/types', requireFormPermission('WF', 'view'), workflowController.getWorkflowTypes);

// Get workflow type by ID (requires WF form view permission)
router.get('/types/:id', requireFormPermission('WF', 'view'), workflowController.getWorkflowTypeById);

// Get workflow tracking (requires WF form view permission)
router.get('/tracking', requireFormPermission('WF', 'view'), workflowController.getWorkflowTracking);

// Get workflow tracking by document number (requires WF form view permission)
router.get('/tracking/doc/:docNo', requireFormPermission('WF', 'view'), workflowController.getWorkflowTrackingByDocNo);

module.exports = router;
