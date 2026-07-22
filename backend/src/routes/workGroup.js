const express = require('express');
const router = express.Router();
const workGroupController = require('../controllers/workGroupController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateToken, workGroupController.getWorkGroups);
router.get('/all', authenticateToken, requireAdmin, workGroupController.getAllWorkGroups);
router.get('/:id/departments', authenticateToken, requireAdmin, workGroupController.getWorkGroupDepartments);
router.post('/', authenticateToken, requireAdmin, workGroupController.createWorkGroup);
router.put('/:id', authenticateToken, requireAdmin, workGroupController.updateWorkGroup);
router.put('/:id/departments', authenticateToken, requireAdmin, workGroupController.updateWorkGroupDepartments);
router.delete('/:id', authenticateToken, requireAdmin, workGroupController.deleteWorkGroup);

module.exports = router;
