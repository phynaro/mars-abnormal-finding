const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all asset routes
router.use(authenticateToken);

// Sites
router.get('/sites', assetController.getSites);

// Departments
router.get('/sites/:siteNo/departments', assetController.getDepartments);

// Production Units
router.get('/production-units', assetController.getProductionUnits);
router.get('/production-units/:puNo', assetController.getProductionUnitDetails);

// Equipment
router.get('/equipment', assetController.getEquipment);
router.get('/equipment/:eqNo', assetController.getEquipmentDetails);

// Hierarchy
router.get('/hierarchy', assetController.getAssetHierarchy);
router.get('/hierarchy/department/:deptNo', assetController.getDepartmentHierarchyDetails);

// Lookup data
router.get('/lookup', assetController.getLookupData);

// Statistics
router.get('/statistics', assetController.getAssetStatistics);

module.exports = router;
