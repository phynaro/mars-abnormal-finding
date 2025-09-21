const express = require('express');
const router = express.Router();
const hierarchyController = require('../controllers/hierarchyController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Get all plants
router.get('/plants', authenticateToken, hierarchyController.getPlants);

// Get all areas
router.get('/areas', authenticateToken, hierarchyController.getAllAreas);

// Get areas by plant ID
router.get('/plants/:plantId/areas', authenticateToken, hierarchyController.getAreasByPlant);

// Get lines by area ID
router.get('/areas/:areaId/lines', authenticateToken, hierarchyController.getLinesByArea);

// Get machines by line ID
router.get('/lines/:lineId/machines', authenticateToken, hierarchyController.getMachinesByLine);

// Search PUCODE
router.get('/pucode/search', authenticateToken, hierarchyController.searchPUCODE);

// Get PUCODE details
router.get('/pucode/:pucode', authenticateToken, hierarchyController.getPUCODEDetails);

// Generate PUCODE from hierarchy
router.post('/pucode/generate', authenticateToken, hierarchyController.generatePUCODE);

module.exports = router;
