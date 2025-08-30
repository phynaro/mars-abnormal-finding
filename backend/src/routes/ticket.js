const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateToken, requireL1Operator, requireL2Engineer, requireL3Manager } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new ticket (L1+)
router.post('/', requireL1Operator, ticketController.createTicket);

// Get all tickets with filtering and pagination (L1+)
router.get('/', requireL1Operator, ticketController.getTickets);

// Get ticket by ID (L1+)
router.get('/:id', requireL1Operator, ticketController.getTicketById);

// Update ticket (L2+)
router.put('/:id', requireL2Engineer, ticketController.updateTicket);

// Add comment to ticket (L1+)
router.post('/:id/comments', requireL1Operator, ticketController.addComment);

// Assign ticket (L2+)
router.post('/:id/assign', requireL2Engineer, ticketController.assignTicket);

// Workflow endpoints
// Accept ticket (L2+)
router.post('/:id/accept', requireL2Engineer, ticketController.acceptTicket);

// Reject ticket (L2+)
router.post('/:id/reject', requireL2Engineer, ticketController.rejectTicket);

// Complete job (L2+)
router.post('/:id/complete', requireL2Engineer, ticketController.completeJob);

// Escalate ticket (L2+)
router.post('/:id/escalate', requireL2Engineer, ticketController.escalateTicket);

// Close ticket (Requestor only)
router.post('/:id/close', requireL1Operator, ticketController.closeTicket);

// Reopen ticket (Requestor only)
router.post('/:id/reopen', requireL1Operator, ticketController.reopenTicket);

// Reassign ticket (L3 only)
router.post('/:id/reassign', requireL3Manager, ticketController.reassignTicket);

// Get available assignees (L1+)
router.get('/assignees/available', requireL1Operator, ticketController.getAvailableAssignees);

// Trigger delayed notification manually (for testing)
router.post('/:id/trigger-notification', requireL1Operator, async (req, res) => {
    try {
        const { id } = req.params;
        await ticketController.sendDelayedTicketNotification(parseInt(id, 10));
        res.json({
            success: true,
            message: 'Delayed notification triggered successfully'
        });
    } catch (error) {
        console.error('Error triggering delayed notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger delayed notification',
            error: error.message
        });
    }
});

// Delete ticket (L3 only)
router.delete('/:id', requireL3Manager, ticketController.deleteTicket);

// Upload ticket image (L1+)
router.post('/:id/images', requireL1Operator, upload.single('image'), ticketController.uploadTicketImage);

// Delete ticket image (L1+)
router.delete('/:id/images/:imageId', requireL1Operator, ticketController.deleteTicketImage);

// Upload multiple images (L1+)
router.post('/:id/images/batch', requireL1Operator, upload.array('images', 10), ticketController.uploadTicketImages);

// Test email notification (for development/testing)
router.post('/test-email', async (req, res) => {
    try {
        const emailService = require('../services/emailService');
        
        // Test data
        const testTicketData = {
            id: 999, // Test ID for demo
            ticket_number: 'TKT-TEST-001',
            title: 'Test Ticket for Email Notification',
            description: 'This is a test ticket to verify email notifications are working.',
            affected_point_type: 'machine',
            affected_point_name: 'Test Machine A',
            priority: 'high',
            severity_level: 'critical',
            estimated_downtime_hours: 4,
            created_at: new Date().toISOString()
        };
        
        const result = await emailService.sendNewTicketNotification(testTicketData, 'Test User');
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            data: result
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
});

module.exports = router;
