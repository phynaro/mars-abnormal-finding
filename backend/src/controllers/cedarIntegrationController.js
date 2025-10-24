const cedarIntegrationService = require('../services/cedarIntegrationService');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

/**
 * Cedar Integration Controller
 * Handles API endpoints for Cedar CMMS integration
 */

/**
 * Sync ticket to Cedar CMMS
 * POST /api/cedar/tickets/:ticketId/sync
 */
const syncTicketToCedar = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { action, actionData } = req.body;

        console.log(`🔄 Syncing ticket ${ticketId} to Cedar (action: ${action})`);

        const result = await cedarIntegrationService.syncTicketToCedar(
            parseInt(ticketId), 
            action, 
            actionData
        );

        res.json({
            success: true,
            message: 'Ticket synced to Cedar successfully',
            data: result
        });

    } catch (error) {
        console.error('Cedar sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync ticket to Cedar',
            error: error.message
        });
    }
};

/**
 * Get Cedar Work Order status
 * GET /api/cedar/work-orders/:wono/status
 */
const getCedarWorkOrderStatus = async (req, res) => {
    try {
        const { wono } = req.params;

        console.log(`🔍 Getting Cedar WO ${wono} status`);

        const result = await cedarIntegrationService.getWorkOrderStatus(parseInt(wono));

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Get Cedar WO status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Cedar Work Order status',
            error: error.message
        });
    }
};

/**
 * Update Cedar Work Order
 * POST /api/cedar/work-orders/:wono/update
 */
const updateCedarWorkOrder = async (req, res) => {
    try {
        const { wono } = req.params;
        const updateData = req.body;

        console.log(`🔄 Updating Cedar WO ${wono}`);

        // This would be used for direct Cedar WO updates
        // For now, we'll redirect to ticket-based updates
        res.json({
            success: false,
            message: 'Direct Cedar WO updates not implemented. Use ticket-based sync instead.',
            suggestion: 'Use POST /api/cedar/tickets/:ticketId/sync to update via ticket status changes'
        });

    } catch (error) {
        console.error('Update Cedar WO error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update Cedar Work Order',
            error: error.message
        });
    }
};

/**
 * Get integration status for a ticket
 * GET /api/cedar/tickets/:ticketId/status
 */
const getTicketIntegrationStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('ticketId', sql.Int, ticketId)
            .query(`
                SELECT 
                    t.id as ticket_id,
                    t.ticket_number,
                    t.status as ticket_status,
                    t.cedar_wono,
                    t.cedar_wocode,
                    t.cedar_sync_status,
                    t.cedar_last_sync,
                    t.cedar_sync_error,
                    wo.WOStatusNo as cedar_wo_status_no,
                    wo.WFStatusCode as cedar_wf_status_code
                FROM IgxTickets t
                LEFT JOIN WO wo ON t.cedar_wono = wo.WONO
                WHERE t.id = @ticketId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = result.recordset[0];

        res.json({
            success: true,
            data: {
                ticketId: ticket.ticket_id,
                ticketNumber: ticket.ticket_number,
                ticketStatus: ticket.ticket_status,
                cedarIntegration: {
                    wono: ticket.cedar_wono,
                    wocode: ticket.cedar_wocode,
                    syncStatus: ticket.cedar_sync_status,
                    lastSync: ticket.cedar_last_sync,
                    syncError: ticket.cedar_sync_error,
                    cedarWoStatusNo: ticket.cedar_wo_status_no,
                    cedarWfStatusCode: ticket.cedar_wf_status_code
                }
            }
        });

    } catch (error) {
        console.error('Get ticket integration status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ticket integration status',
            error: error.message
        });
    }
};

/**
 * Get integration logs for a ticket
 * GET /api/cedar/tickets/:ticketId/logs
 */
const getTicketIntegrationLogs = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('ticketId', sql.Int, ticketId)
            .input('limit', sql.Int, parseInt(limit))
            .input('offset', sql.Int, parseInt(offset))
            .query(`
                SELECT *
                FROM (
                    SELECT 
                        id,
                        ticket_id,
                        wono,
                        action,
                        status,
                        request_data,
                        response_data,
                        error_message,
                        created_at,
                        created_by,
                        ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
                    FROM IgxCedarIntegrationLog
                    WHERE ticket_id = @ticketId
                ) AS paginated_results
                WHERE row_num > @offset AND row_num <= @offset + @limit
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get ticket integration logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ticket integration logs',
            error: error.message
        });
    }
};

/**
 * Get all tickets with Cedar integration status
 * GET /api/cedar/tickets
 */
const getTicketsWithCedarStatus = async (req, res) => {
    try {
        const { status, limit = 100, offset = 0 } = req.query;
        const pool = await sql.connect(dbConfig);

        let whereClause = '';
        const params = [
            { name: 'limit', type: sql.Int, value: parseInt(limit) },
            { name: 'offset', type: sql.Int, value: parseInt(offset) }
        ];

        if (status) {
            whereClause = 'AND t.cedar_sync_status = @status';
            params.push({ name: 'status', type: sql.VarChar(20), value: status });
        }

        const result = await pool.request()
            .input('limit', sql.Int, parseInt(limit))
            .input('offset', sql.Int, parseInt(offset))
            .query(`
                SELECT *
                FROM (
                    SELECT 
                        t.id as ticket_id,
                        t.ticket_number,
                        t.title,
                        t.status as ticket_status,
                        t.cedar_wono,
                        t.cedar_wocode,
                        t.cedar_sync_status,
                        t.cedar_last_sync,
                        t.cedar_sync_error,
                        wo.WOStatusNo as cedar_wo_status_no,
                        wo.WFStatusCode as cedar_wf_status_code,
                        pu.PUCODE,
                        pu.PUNAME,
                        ROW_NUMBER() OVER (ORDER BY t.created_at DESC) as row_num
                    FROM IgxTickets t
                    LEFT JOIN WO wo ON t.cedar_wono = wo.WONO
                    LEFT JOIN PU pu ON t.puno = pu.PUNO
                    WHERE 1=1 ${whereClause}
                ) AS paginated_results
                WHERE row_num > @offset AND row_num <= @offset + @limit
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get tickets with Cedar status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tickets with Cedar status',
            error: error.message
        });
    }
};

/**
 * Retry failed Cedar integrations
 * POST /api/cedar/retry-failed
 */
const retryFailedIntegrations = async (req, res) => {
    try {
        const { ticketIds } = req.body;
        const pool = await sql.connect(dbConfig);

        // Get failed tickets
        let whereClause = "t.cedar_sync_status = 'error'";
        const params = [];

        if (ticketIds && Array.isArray(ticketIds) && ticketIds.length > 0) {
            whereClause += ' AND t.id IN (' + ticketIds.map((_, index) => `@ticketId${index}`).join(',') + ')';
            ticketIds.forEach((id, index) => {
                params.push({ name: `ticketId${index}`, type: sql.Int, value: id });
            });
        }

        const failedTicketsResult = await pool.request()
            .query(`
                SELECT 
                    t.id,
                    t.ticket_number,
                    t.status,
                    t.cedar_sync_error
                FROM IgxTickets t
                WHERE ${whereClause}
            `);

        const failedTickets = failedTicketsResult.recordset;
        const results = [];

        // Retry each failed ticket
        for (const ticket of failedTickets) {
            try {
                console.log(`🔄 Retrying Cedar integration for ticket ${ticket.id}`);
                
                const result = await cedarIntegrationService.syncTicketToCedar(
                    ticket.id, 
                    'retry', 
                    { retryReason: 'Manual retry from API' }
                );

                results.push({
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticket_number,
                    success: true,
                    result
                });

            } catch (error) {
                console.error(`❌ Failed to retry ticket ${ticket.id}:`, error.message);
                results.push({
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticket_number,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        res.json({
            success: true,
            message: `Retry Finished: ${successCount} successful, ${failureCount} failed`,
            data: {
                totalProcessed: results.length,
                successful: successCount,
                failed: failureCount,
                results
            }
        });

    } catch (error) {
        console.error('Retry failed integrations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retry failed integrations',
            error: error.message
        });
    }
};

/**
 * Get Cedar integration statistics
 * GET /api/cedar/statistics
 */
const getCedarIntegrationStatistics = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const statsResult = await pool.request().query(`
            SELECT 
                COUNT(*) as total_tickets,
                SUM(CASE WHEN cedar_wono IS NOT NULL THEN 1 ELSE 0 END) as tickets_with_cedar_wo,
                SUM(CASE WHEN cedar_sync_status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
                SUM(CASE WHEN cedar_sync_status = 'error' THEN 1 ELSE 0 END) as failed_syncs,
                SUM(CASE WHEN cedar_sync_status = 'pending' THEN 1 ELSE 0 END) as pending_syncs
            FROM IgxTickets
        `);

        const logsResult = await pool.request().query(`
            SELECT 
                action,
                status,
                COUNT(*) as count
            FROM IgxCedarIntegrationLog
            WHERE created_at >= DATEADD(day, -30, GETDATE())
            GROUP BY action, status
            ORDER BY action, status
        `);

        const recentErrorsResult = await pool.request().query(`
            SELECT TOP 10
                ticket_id,
                action,
                error_message,
                created_at
            FROM IgxCedarIntegrationLog
            WHERE status = 'error'
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            data: {
                overview: statsResult.recordset[0],
                recentActivity: logsResult.recordset,
                recentErrors: recentErrorsResult.recordset
            }
        });

    } catch (error) {
        console.error('Get Cedar integration statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Cedar integration statistics',
            error: error.message
        });
    }
};

/**
 * Health check for Cedar integration
 * GET /api/cedar/health
 */
const getCedarIntegrationHealth = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        // Test database connection
        const dbTestResult = await pool.request().query('SELECT 1 as test');
        const dbHealthy = dbTestResult.recordset.length > 0;

        // Test Cedar WO table access
        let cedarHealthy = false;
        try {
            const cedarTestResult = await pool.request().query('SELECT TOP 1 WONO FROM WO');
            cedarHealthy = true;
        } catch (cedarError) {
            console.error('Cedar table access test failed:', cedarError.message);
        }

        // Get recent integration activity
        const recentActivityResult = await pool.request().query(`
            SELECT TOP 5
                ticket_id,
                action,
                status,
                created_at
            FROM IgxCedarIntegrationLog
            ORDER BY created_at DESC
        `);

        const healthStatus = {
            database: dbHealthy ? 'healthy' : 'unhealthy',
            cedar: cedarHealthy ? 'healthy' : 'unhealthy',
            overall: dbHealthy && cedarHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            recentActivity: recentActivityResult.recordset
        };

        const statusCode = healthStatus.overall === 'healthy' ? 200 : 503;

        res.status(statusCode).json({
            success: healthStatus.overall === 'healthy',
            data: healthStatus
        });

    } catch (error) {
        console.error('Cedar integration health check error:', error);
        res.status(503).json({
            success: false,
            message: 'Cedar integration health check failed',
            error: error.message
        });
    }
};

module.exports = {
    syncTicketToCedar,
    getCedarWorkOrderStatus,
    updateCedarWorkOrder,
    getTicketIntegrationStatus,
    getTicketIntegrationLogs,
    getTicketsWithCedarStatus,
    retryFailedIntegrations,
    getCedarIntegrationStatistics,
    getCedarIntegrationHealth
};
