const express = require('express');
const router = express.Router();
const {
    syncTicketToCedar,
    getCedarWorkOrderStatus,
    updateCedarWorkOrder,
    getTicketIntegrationStatus,
    getTicketIntegrationLogs,
    getTicketsWithCedarStatus,
    retryFailedIntegrations,
    getCedarIntegrationStatistics,
    getCedarIntegrationHealth
} = require('../controllers/cedarIntegrationController');

// Middleware for authentication (if needed)
const authenticateToken = (req, res, next) => {
    // Add your authentication logic here
    // For now, we'll skip authentication for testing
    next();
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/cedar/health
 * @desc Health check for Cedar integration
 * @access Public
 */
router.get('/health', getCedarIntegrationHealth);

/**
 * @route GET /api/cedar/statistics
 * @desc Get Cedar integration statistics
 * @access Public
 */
router.get('/statistics', getCedarIntegrationStatistics);

/**
 * @route POST /api/cedar/retry-failed
 * @desc Retry failed Cedar integrations
 * @access Public
 * @body {number[]} ticketIds - Optional array of ticket IDs to retry
 */
router.post('/retry-failed', retryFailedIntegrations);

/**
 * @route GET /api/cedar/tickets
 * @desc Get all tickets with Cedar integration status
 * @access Public
 * @query {string} status - Filter by sync status (success, error, pending)
 * @query {number} limit - Number of records to return (default: 100)
 * @query {number} offset - Number of records to skip (default: 0)
 */
router.get('/tickets', getTicketsWithCedarStatus);

/**
 * @route GET /api/cedar/tickets/:ticketId/status
 * @desc Get integration status for a specific ticket
 * @access Public
 * @param {number} ticketId - Ticket ID
 */
router.get('/tickets/:ticketId/status', getTicketIntegrationStatus);

/**
 * @route GET /api/cedar/tickets/:ticketId/logs
 * @desc Get integration logs for a specific ticket
 * @access Public
 * @param {number} ticketId - Ticket ID
 * @query {number} limit - Number of records to return (default: 50)
 * @query {number} offset - Number of records to skip (default: 0)
 */
router.get('/tickets/:ticketId/logs', getTicketIntegrationLogs);

/**
 * @route POST /api/cedar/tickets/:ticketId/sync
 * @desc Sync ticket to Cedar CMMS
 * @access Public
 * @param {number} ticketId - Ticket ID
 * @body {string} action - Action performed on ticket (accept, reject, finish, etc.)
 * @body {object} actionData - Additional data for the action
 */
router.post('/tickets/:ticketId/sync', syncTicketToCedar);

/**
 * @route GET /api/cedar/work-orders/:wono/status
 * @desc Get Cedar Work Order status
 * @access Public
 * @param {number} wono - Cedar Work Order number
 */
router.get('/work-orders/:wono/status', getCedarWorkOrderStatus);

/**
 * @route POST /api/cedar/work-orders/:wono/update
 * @desc Update Cedar Work Order directly
 * @access Public
 * @param {number} wono - Cedar Work Order number
 * @body {object} updateData - Data to update
 */
router.post('/work-orders/:wono/update', updateCedarWorkOrder);

module.exports = router;
