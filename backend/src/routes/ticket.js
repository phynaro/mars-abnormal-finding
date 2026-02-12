const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateToken, requireFormPermission, requireDeleteTicketPermission } = require('../middleware/auth');
const { upload, uploadMemory } = require('../middleware/upload');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new ticket (requires TKT form save permission)
router.post('/', requireFormPermission('TKT', 'save'), uploadMemory.array('images', 10), ticketController.createTicket);

// Get all tickets with filtering and pagination (requires TKT form view permission)
router.get('/', requireFormPermission('TKT', 'view'), ticketController.getTickets);

// Get user-related pending tickets (requires TKT form view permission)
router.get('/pending/user', requireFormPermission('TKT', 'view'), ticketController.getUserPendingTickets);

// Get user ticket count per period for personal dashboard (requires TKT form view permission)
router.get('/user/count-per-period', requireFormPermission('TKT', 'view'), ticketController.getUserTicketCountPerPeriod);

// Get user Finished ticket count per period for personal dashboard (L2+ users only, requires TKT form view permission)
router.get('/user/Finished-count-per-period', requireFormPermission('TKT', 'view'), ticketController.getUserFinishedTicketCountPerPeriod);

// Get personal KPI data for personal dashboard (requires TKT form view permission)
router.get('/user/personal-kpi', requireFormPermission('TKT', 'view'), ticketController.getPersonalKPIData);

// Get failure modes (requires TKT form view permission)
router.get('/failure-modes', requireFormPermission('TKT', 'view'), ticketController.getFailureModes);

// Send pending ticket notification to specific user (requires TKT form view permission)
router.post('/notifications/pending/:userId', requireFormPermission('TKT', 'view'), ticketController.sendPendingTicketNotification);

// Send pending ticket notifications to all users (requires TKT form save permission)
router.post('/notifications/pending', requireFormPermission('TKT', 'save'), ticketController.sendPendingTicketNotificationsToAll);

// Get ticket by ID (requires TKT form view permission)
router.get('/:id', requireFormPermission('TKT', 'view'), ticketController.getTicketById);

// Update ticket (requires TKT form save permission)
router.put('/:id', requireFormPermission('TKT', 'save'), ticketController.updateTicket);

// Add comment to ticket (requires TKT form save permission)
router.post('/:id/comments', requireFormPermission('TKT', 'save'), ticketController.addComment);

// Assign ticket (requires TKT form save permission)
router.post('/:id/assign', requireFormPermission('TKT', 'save'), ticketController.assignTicket);

// Workflow endpoints
// Accept ticket (requires TKT form save permission)
router.post('/:id/accept', requireFormPermission('TKT', 'save'), ticketController.acceptTicket);

// Plan ticket (requires TKT form save permission) - NEW WORKFLOW
router.post('/:id/plan', requireFormPermission('TKT', 'save'), ticketController.planTicket);

// Start ticket (requires TKT form save permission) - NEW WORKFLOW
router.post('/:id/start', requireFormPermission('TKT', 'save'), ticketController.startTicket);

// Reject ticket (requires TKT form save permission)
router.post('/:id/reject', requireFormPermission('TKT', 'save'), ticketController.rejectTicket);

// Finish job (requires TKT form save permission)
router.post('/:id/finish', requireFormPermission('TKT', 'save'), ticketController.finishTicket);

// Escalate ticket (requires TKT form save permission)
router.post('/:id/escalate', requireFormPermission('TKT', 'save'), ticketController.escalateTicket);

// Approve review ticket (L1 - Requestor only, requires TKT form save permission)
router.post('/:id/approve-review', requireFormPermission('TKT', 'save'), ticketController.approveReview);

// Approve close ticket (L4+ Managers only, requires TKT form save permission)
router.post('/:id/approve-close', requireFormPermission('TKT', 'save'), ticketController.approveClose);

// Reopen ticket (requires TKT form save permission)
router.post('/:id/reopen', requireFormPermission('TKT', 'save'), ticketController.reopenTicket);

// Reassign ticket (requires TKT form save permission)
router.post('/:id/reassign', requireFormPermission('TKT', 'save'), ticketController.reassignTicket);

// Get available assignees (requires TKT form view permission)
router.get('/assignees/available', requireFormPermission('TKT', 'view'), ticketController.getAvailableAssignees);

// Test notification recipients (requires admin level 3+)
const { requirePermissionLevel } = require('../middleware/auth');
router.post('/test-notification-recipients', requirePermissionLevel(3), ticketController.testNotificationRecipients);

// Delete ticket (requires TKT delete permission OR user is ticket creator)
router.delete('/:id', requireDeleteTicketPermission, ticketController.deleteTicket);

// Upload ticket image (requires TKT form save permission)
router.post('/:id/images', requireFormPermission('TKT', 'save'), upload.single('image'), ticketController.uploadTicketImage);

// Delete ticket image (requires TKT form save permission)
router.delete('/:id/images/:imageId', requireFormPermission('TKT', 'save'), ticketController.deleteTicketImage);

// Upload multiple images (requires TKT form save permission)
router.post('/:id/images/batch', requireFormPermission('TKT', 'save'), upload.array('images', 10), ticketController.uploadTicketImages);

// Test email notification (for development/testing)
router.post('/test-email', async (req, res) => {
    try {
        const emailService = require('../services/emailService');
        
        // Test data
        const testTicketData = {
            id: 999, // Test ID for demo
            ticket_number: 'AB25-00001',
            title: 'Test Ticket for Email Notification',
            description: 'This is a test ticket to verify email notifications are working.',
            affected_point_type: 'machine',
            affected_point_name: 'Test Machine A',
            priority: 'high',
            severity_level: 'critical',
            estimated_downtime_hours: 4,
            created_at: new Date().toISOString()
        };

        // Send test email
        await emailService.sendTicketCreatedNotification(
            testTicketData,
            'Test User',
            'test@example.com'
        );

        res.json({
            success: true,
            message: 'Test email sent successfully'
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
});

module.exports = router;
