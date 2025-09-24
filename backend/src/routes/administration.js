const express = require('express');
const router = express.Router();
const administrationController = require('../controllers/administrationController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all administration routes
router.use(authenticateToken);

// ==================== PLANT ROUTES ====================
router.get('/plants', administrationController.getPlants);
router.get('/plants/:id', administrationController.getPlantById);
router.post('/plants', administrationController.createPlant);
router.put('/plants/:id', administrationController.updatePlant);
router.delete('/plants/:id', administrationController.deletePlant);

// ==================== AREA ROUTES ====================
router.get('/areas', administrationController.getAreas);
router.get('/areas/:id', administrationController.getAreaById);
router.post('/areas', administrationController.createArea);
router.put('/areas/:id', administrationController.updateArea);
router.delete('/areas/:id', administrationController.deleteArea);

// ==================== LINE ROUTES ====================
router.get('/lines', administrationController.getLines);
router.get('/lines/:id', administrationController.getLineById);
router.post('/lines', administrationController.createLine);
router.put('/lines/:id', administrationController.updateLine);
router.delete('/lines/:id', administrationController.deleteLine);

// ==================== MACHINE ROUTES ====================
router.get('/machines', administrationController.getMachines);
router.get('/machines/:id', administrationController.getMachineById);
router.post('/machines', administrationController.createMachine);
router.put('/machines/:id', administrationController.updateMachine);
router.delete('/machines/:id', administrationController.deleteMachine);

// ==================== TICKET APPROVAL ROUTES ====================
router.get('/ticket-approvals', administrationController.getTicketApprovals);
router.get('/ticket-approvals/:id', administrationController.getTicketApprovalById);
router.post('/ticket-approvals', administrationController.createTicketApproval);
router.put('/ticket-approvals/:id', administrationController.updateTicketApproval);
router.delete('/ticket-approvals/:id', administrationController.deleteTicketApproval);

// ==================== LOOKUP DATA ====================
router.get('/lookup', administrationController.getLookupData);

// Person Search Route
router.get('/persons/search', administrationController.searchPersons);

module.exports = router;
