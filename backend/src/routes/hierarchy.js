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

// Get distinct plants from PUExtension (for filters)
router.get('/distinct/plants', authenticateToken, hierarchyController.getDistinctPlants);

// Get distinct areas from PUExtension (for filters)
router.get('/distinct/areas', authenticateToken, hierarchyController.getDistinctAreas);

// Get PUCritical levels
router.get('/pucritical', authenticateToken, hierarchyController.getPUCriticalLevels);

// PUExtension hierarchy endpoints
router.get('/puextension/machines', authenticateToken, hierarchyController.getMachinesByHierarchy);
router.get('/puextension/plants', authenticateToken, hierarchyController.getDistinctPlantsFromPUExtension);
router.get('/puextension/plants/:plant/areas', authenticateToken, hierarchyController.getDistinctAreasFromPUExtension);
router.get('/puextension/plants/:plant/areas/:area/lines', authenticateToken, hierarchyController.getDistinctLinesFromPUExtension);
router.get('/puextension/plants/:plant/areas/:area/lines/:line/machines', authenticateToken, hierarchyController.getDistinctMachinesFromPUExtension);
router.get('/puextension/plants/:plant/areas/:area/machines-without-lines', authenticateToken, hierarchyController.getDistinctMachinesWithoutLinesFromPUExtension);
router.get('/puextension/plants/:plant/areas/:area/lines/:line/machines/:machine/numbers', authenticateToken, hierarchyController.getDistinctNumbersFromPUExtension);

module.exports = router;
