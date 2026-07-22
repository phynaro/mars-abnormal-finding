const express = require('express');
const router = express.Router();
const workGroupController = require('../controllers/workGroupController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateToken, workGroupController.getWorkGroups);
router.get('/all', authenticateToken, requireAdmin, workGroupController.getAllWorkGroups);
router.post('/', authenticateToken, requireAdmin, workGroupController.createWorkGroup);
router.put('/:id', authenticateToken, requireAdmin, workGroupController.updateWorkGroup);
router.delete('/:id', authenticateToken, requireAdmin, workGroupController.deleteWorkGroup);

module.exports = router;
