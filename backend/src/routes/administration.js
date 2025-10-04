const express = require('express');
const router = express.Router();
const administrationController = require('../controllers/administrationController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all administration routes
router.use(authenticateToken);

// ==================== HIERARCHY VIEW ROUTES ====================
router.get('/hierarchy', administrationController.getHierarchyView);

// ==================== TICKET APPROVAL ROUTES ====================
router.get('/ticket-approvals', administrationController.getTicketApprovals);
router.get('/ticket-approvals/:id', administrationController.getTicketApprovalById);
router.get('/ticket-approvals/person/:personno/level/:approval_level', administrationController.getTicketApprovalsByPersonAndLevel);
router.post('/ticket-approvals', administrationController.createTicketApproval);
router.post('/ticket-approvals/bulk', administrationController.createMultipleTicketApprovals);
router.put('/ticket-approvals/:id', administrationController.updateTicketApproval);
router.delete('/ticket-approvals/:id', administrationController.deleteTicketApproval);
router.delete('/ticket-approvals/person/:personno/level/:approval_level', administrationController.deleteTicketApprovalsByPersonAndLevel);

// ==================== LOOKUP DATA ====================
router.get('/lookup', administrationController.getLookupData);

// Person Search Route
router.get('/persons/search', administrationController.searchPersons);

module.exports = router;