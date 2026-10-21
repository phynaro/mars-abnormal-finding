const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateToken, requireFormPermission, requireDeleteTicketPermission, requireInternalUser, requireExternalTicketOwner } = require('../middleware/auth');
const { upload, uploadMemory } = require('../middleware/upload');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new ticket (requires TKT form save permission)
router.post('/', requireFormPermission('TKT', 'save'), uploadMemory.array('images', 10), ticketController.createTicket);

// Get all tickets with filtering and pagination (requires TKT form view permission)
router.get('/', requireFormPermission('TKT', 'view'), ticketController.getTickets);

// Get user-related pending tickets (requires TKT form view permission)
router.get('/pending/user', requireFormPermission('TKT', 'view'), ticketController.getUserPendingTickets);

// Personal dashboard metrics are internal-only
router.get('/user/count-per-period', requireInternalUser, requireFormPermission('TKT', 'view'), ticketController.getUserTicketCountPerPeriod);
router.get('/user/Finished-count-per-period', requireInternalUser, requireFormPermission('TKT', 'view'), ticketController.getUserFinishedTicketCountPerPeriod);
router.get('/user/closure-rate-per-period', requireInternalUser, requireFormPermission('TKT', 'view'), ticketController.getUserClosureRatePerPeriod);
router.get('/user/personal-kpi', requireInternalUser, requireFormPermission('TKT', 'view'), ticketController.getPersonalKPIData);

// Get failure modes (requires TKT form view permission)
router.get('/failure-modes', requireFormPermission('TKT', 'view'), ticketController.getFailureModes);

// Send pending ticket notification to specific user (requires TKT form view permission)
router.post('/notifications/pending/:userId', requireInternalUser, requireFormPermission('TKT', 'view'), ticketController.sendPendingTicketNotification);

// Send pending ticket notifications to all users (requires TKT form save permission)
router.post('/notifications/pending', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.sendPendingTicketNotificationsToAll);

// Get ticket-scoped users for filters (requires TKT form view permission)
router.get('/filter-users', requireInternalUser, requireFormPermission('TKT', 'view'), ticketController.getTicketFilterUsers);

// Get ticket by ID (requires TKT form view permission). External users only receive tickets they created.
router.get('/:id', requireFormPermission('TKT', 'view'), requireExternalTicketOwner, ticketController.getTicketById);

// Update ticket detail (L3/L4 with PU right, any status)
router.patch('/:id/detail', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.updateTicketDetail);

// Update ticket (requires TKT form save permission)
router.put('/:id', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.updateTicket);

// Add comment to ticket (requires TKT form save permission)
router.post('/:id/comments', requireExternalTicketOwner, requireFormPermission('TKT', 'save'), ticketController.addComment);

// Assign ticket (requires TKT form save permission)
router.post('/:id/assign', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.assignTicket);

// Workflow endpoints
router.post('/:id/accept', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.acceptTicket);
router.post('/:id/plan', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.planTicket);
router.post('/:id/start', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.startTicket);
router.post('/:id/reject', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.rejectTicket);
router.post('/:id/finish', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.finishTicket);
router.post('/:id/escalate', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.escalateTicket);

// Approve review ticket (requestor, including an external creator of this ticket)
router.post('/:id/approve-review', requireExternalTicketOwner, requireFormPermission('TKT', 'save'), ticketController.approveReview);

router.post('/:id/approve-close', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.approveClose);
router.post('/:id/review-and-close', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.reviewAndClose);
router.post('/:id/reopen', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.reopenTicket);
router.post('/:id/reassign', requireInternalUser, requireFormPermission('TKT', 'save'), ticketController.reassignTicket);

router.get('/assignees/available', requireInternalUser, requireFormPermission('TKT', 'view'), ticketController.getAvailableAssignees);

// Test notification recipients (requires admin level 3+)
const { requirePermissionLevel } = require('../middleware/auth');
router.post('/test-notification-recipients', requireInternalUser, requirePermissionLevel(3), ticketController.testNotificationRecipients);

// Delete ticket (requires TKT delete permission OR user is ticket creator)
router.delete('/:id', requireExternalTicketOwner, requireDeleteTicketPermission, ticketController.deleteTicket);

router.post('/:id/images', requireExternalTicketOwner, requireFormPermission('TKT', 'save'), upload.single('image'), ticketController.uploadTicketImage);
router.delete('/:id/images/:imageId', requireExternalTicketOwner, requireFormPermission('TKT', 'save'), ticketController.deleteTicketImage);

// Test email notification (for development/testing)
router.post('/test-email', requireInternalUser, async (req, res) => {
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
