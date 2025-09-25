const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new ticket (requires TKT form save permission)
router.post('/', requireFormPermission('TKT', 'save'), ticketController.createTicket);

// Get all tickets with filtering and pagination (requires TKT form view permission)
router.get('/', requireFormPermission('TKT', 'view'), ticketController.getTickets);

// Get user-related pending tickets (requires TKT form view permission)
router.get('/pending/user', requireFormPermission('TKT', 'view'), ticketController.getUserPendingTickets);

// Get user ticket count per period for personal dashboard (requires TKT form view permission)
router.get('/user/count-per-period', requireFormPermission('TKT', 'view'), ticketController.getUserTicketCountPerPeriod);

// Get user completed ticket count per period for personal dashboard (L2+ users only, requires TKT form view permission)
router.get('/user/completed-count-per-period', requireFormPermission('TKT', 'view'), ticketController.getUserCompletedTicketCountPerPeriod);

// Get personal KPI data for personal dashboard (requires TKT form view permission)
router.get('/user/personal-kpi', requireFormPermission('TKT', 'view'), ticketController.getPersonalKPIData);

// Get failure modes (requires TKT form view permission)
router.get('/failure-modes', requireFormPermission('TKT', 'view'), ticketController.getFailureModes);

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

// Reject ticket (requires TKT form save permission)
router.post('/:id/reject', requireFormPermission('TKT', 'save'), ticketController.rejectTicket);

// Complete job (requires TKT form save permission)
router.post('/:id/complete', requireFormPermission('TKT', 'save'), ticketController.completeJob);

// Escalate ticket (requires TKT form save permission)
router.post('/:id/escalate', requireFormPermission('TKT', 'save'), ticketController.escalateTicket);

// Close ticket (requires TKT form save permission)
router.post('/:id/close', requireFormPermission('TKT', 'save'), ticketController.closeTicket);

// Reopen ticket (requires TKT form save permission)
router.post('/:id/reopen', requireFormPermission('TKT', 'save'), ticketController.reopenTicket);

// Reassign ticket (requires TKT form save permission)
router.post('/:id/reassign', requireFormPermission('TKT', 'save'), ticketController.reassignTicket);

// Get available assignees (requires TKT form view permission)
router.get('/assignees/available', requireFormPermission('TKT', 'view'), ticketController.getAvailableAssignees);

// Trigger LINE notification for ticket (called after image uploads)
router.post('/:id/trigger-notification', requireFormPermission('TKT', 'save'), ticketController.triggerTicketNotification);

// Test L2 users for an area (for testing)
router.get('/test-l2-users/:area_id', requireFormPermission('TKT', 'view'), async (req, res) => {
    try {
        const { area_id } = req.params;
        const sql = require('mssql');
        const dbConfig = require('../config/dbConfig');
        const pool = await sql.connect(dbConfig);
        
        // Use the same query as in the helper function
        const result = await pool.request()
            .input('area_id', sql.Int, area_id)
            .query(`
                SELECT DISTINCT
                    p.PERSONNO,
                    p.PERSON_NAME,
                    p.FIRSTNAME,
                    p.LASTNAME,
                    p.EMAIL,
                    u.LineID,
                    ta.approval_level
                FROM TicketApproval ta
                INNER JOIN Person p ON ta.personno = p.PERSONNO
                LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                WHERE ta.area_id = @area_id
                AND ta.approval_level >= 2
                AND ta.is_active = 1
                AND p.FLAGDEL != 'Y'
                ORDER BY ta.approval_level DESC, p.PERSON_NAME
            `);
        
        res.json({
            success: true,
            message: `Found ${result.recordset.length} L2+ users for area ${area_id}`,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error getting L2 users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get L2 users',
            error: error.message
        });
    }
});

// Delete ticket (requires TKT form delete permission)
router.delete('/:id', requireFormPermission('TKT', 'delete'), ticketController.deleteTicket);

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
