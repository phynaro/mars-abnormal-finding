const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const emailService = require('../services/emailService');

// Helper function to validate PUCODE format
const validatePUCODE = (pucode) => {
    if (!pucode || typeof pucode !== 'string') {
        return { valid: false, error: 'PUCODE is required and must be a string' };
    }
    
    const parts = pucode.split('-');
    if (parts.length !== 5) {
        return { valid: false, error: 'PUCODE must have exactly 5 parts separated by dashes (PLANT-AREA-LINE-MACHINE-NUMBER)' };
    }
    
    const [plant, area, line, machine, number] = parts;
    
    // Validate each part
    if (!plant || plant.trim() === '') {
        return { valid: false, error: 'Plant code cannot be empty' };
    }
    if (!area || area.trim() === '') {
        return { valid: false, error: 'Area code cannot be empty' };
    }
    if (!line || line.trim() === '') {
        return { valid: false, error: 'Line code cannot be empty' };
    }
    if (!machine || machine.trim() === '') {
        return { valid: false, error: 'Machine code cannot be empty' };
    }
    if (!number || isNaN(parseInt(number))) {
        return { valid: false, error: 'Machine number must be a valid number' };
    }
    
    return { 
        valid: true, 
        parts: { plant, area, line, machine, number: parseInt(number) }
    };
};
const lineService = require('../services/lineService');
const abnFlexService = require('../services/abnormalFindingFlexService');
const fs = require('fs');
const path = require('path');

const DEFAULT_BASE_URL = 'http://localhost:3001';

const getBaseUrl = () => process.env.BACKEND_URL || process.env.FRONTEND_URL || DEFAULT_BASE_URL;

const createSqlRequest = (pool, inputs = []) => {
    const request = pool.request();
    inputs.forEach(({ name, type, value }) => {
        request.input(name, type, value);
    });
    return request;
};

const formatPersonName = (personRow, fallback = 'Unknown User') => {
    if (!personRow) return fallback;
    if (personRow.PERSON_NAME && personRow.PERSON_NAME.trim()) {
        return personRow.PERSON_NAME.trim();
    }
    const first = personRow.FIRSTNAME ? personRow.FIRSTNAME.trim() : '';
    const last = personRow.LASTNAME ? personRow.LASTNAME.trim() : '';
    const combined = `${first} ${last}`.trim();
    return combined || fallback;
};

const mapImagesToLinePayload = (records = [], baseUrl = getBaseUrl()) =>
    records.map((img) => ({
        url: `${baseUrl}${img.image_url}`,
        filename: img.image_name,
    }));

// Helper function to get hero image from ticket images
const getHeroImageUrl = (images, imageType = 'before') => {
    if (!images || images.length === 0) return null;
    
    // For ticket images array with full URLs
    if (images[0]?.url) {
        return images[0].url;
    }
    
    // For raw database records
    const baseUrl = getBaseUrl();
    const heroImage = images[0];
    if (heroImage?.image_url) {
        return `${baseUrl}${heroImage.image_url}`;
    }
    
    return null;
};

// Generate unique ticket number in format TKT-YYYYMMDD-Case number
const generateTicketNumber = async (pool) => {
    try {
        const today = new Date();
        const dateStr = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        // Get or create today's counter
        const counterResult = await pool.request()
            .input('date_str', sql.VarChar(8), dateStr)
            .query(`
                IF EXISTS (SELECT 1 FROM TicketDailyCounters WHERE date_str = @date_str)
                    UPDATE TicketDailyCounters 
                    SET case_number = case_number + 1 
                    WHERE date_str = @date_str;
                ELSE
                    INSERT INTO TicketDailyCounters (date_str, case_number) 
                    VALUES (@date_str, 1);
                
                SELECT case_number FROM TicketDailyCounters WHERE date_str = @date_str;
            `);
        
        const caseNumber = counterResult.recordset[0].case_number;
        return `TKT-${dateStr}-${caseNumber.toString().padStart(3, '0')}`;
        
    } catch (error) {
        console.error('Error generating ticket number:', error);
        // Fallback to timestamp-based generation if database fails
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `TKT-${timestamp}-${random}`;
    }
};

// Helper function to add status change comment
const addStatusChangeComment = async (pool, ticketId, userId, oldStatus, newStatus, actionNote) => {
    try {
        // Get user name for the comment
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT FIRSTNAME, LASTNAME FROM Person WHERE PERSONNO = @userId');
        
        const userName = userResult.recordset.length > 0 
            ? `${userResult.recordset[0].FIRSTNAME} ${userResult.recordset[0].LASTNAME}`
            : `User ${userId}`;
        
        // Create status change message
        const statusChangeMessage = `Status changed from ${oldStatus} to ${newStatus}${actionNote ? ` - ${actionNote}` : ''}`;
        
        // Add comment to TicketComments table
        await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('user_id', sql.Int, userId)
            .input('comment', sql.NVarChar(500), statusChangeMessage)
            .query(`
                INSERT INTO TicketComments (ticket_id, user_id, comment, created_at)
                VALUES (@ticket_id, @user_id, @comment, GETDATE())
            `);
    } catch (error) {
        console.error('Error adding status change comment:', error);
        // Don't throw error - this is supplementary functionality
    }
};

// Create a new ticket
const createTicket = async (req, res) => {
    try {
        const {
            title,
            description,
            pucode, // New field: PUCODE format (PLANT-AREA-LINE-MACHINE-NUMBER)
            pu_id, // New field: PU ID for direct reference
            severity_level,
            priority,
            cost_avoidance,
            downtime_avoidance_hours,
            failure_mode_id,
            suggested_assignee_id,
            scheduled_complete
        } = req.body;

        const reported_by = req.user.id; // From auth middleware

        // Validate PUCODE format
        const pucodeValidation = validatePUCODE(pucode);
        if (!pucodeValidation.valid) {
            return res.status(400).json({
                success: false,
                message: pucodeValidation.error,
                error: 'Invalid PUCODE format'
            });
        }

        const pool = await sql.connect(dbConfig);
        const ticket_number = await generateTicketNumber(pool);
        
        // Validate suggested assignee has L2+ permissions if provided
        let validatedAssigneeId = null;
        if (suggested_assignee_id) {
            const assigneeCheck = await pool.request()
                .input('assignee_id', sql.Int, suggested_assignee_id)
                .query(`
                    SELECT PERSONNO, FIRSTNAME, LASTNAME, EMAIL, DEPTNO 
                    FROM Person 
                    WHERE PERSONNO = @assignee_id AND FLAGDEL != 'Y'
                `);
            
            if (assigneeCheck.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Suggested assignee not found or inactive'
                });
            }
            
            validatedAssigneeId = suggested_assignee_id;
        }

        // Use stored procedure to create ticket with PUCODE validation
        const result = await pool.request()
            .input('ticket_number', sql.VarChar(20), ticket_number)
            .input('title', sql.NVarChar(255), title)
            .input('description', sql.NVarChar(sql.MAX), description)
            .input('pucode', sql.VarChar(100), pucode)
            .input('puid', sql.Int, pu_id)
            .input('severity_level', sql.VarChar(20), severity_level || 'medium')
            .input('priority', sql.VarChar(20), priority || 'normal')
            .input('cost_avoidance', sql.Decimal(15,2), cost_avoidance)
            .input('downtime_avoidance_hours', sql.Decimal(8,2), downtime_avoidance_hours)
            .input('failure_mode_id', sql.Int, failure_mode_id || 0)
            .input('reported_by', sql.Int, reported_by)
            .input('assigned_to', sql.Int, validatedAssigneeId)
            .input('scheduled_complete', sql.DateTime2, scheduled_complete)
            .execute('sp_CreateTicketWithPUCODE');

        const ticketResult = result.recordset[0];

        if (ticketResult.status === 'ERROR') {
            return res.status(400).json({
                success: false,
                message: ticketResult.message,
                error: 'PUCODE validation failed'
            });
        }

        const ticketId = ticketResult.ticket_id;

        // Send email notification (for demo, sending to phynaro@hotmail.com)
        try {
            // Get reporter name for the email
            const reporterResult = await pool.request()
                .input('user_id', sql.Int, reported_by)
                .query(`
                    SELECT p.PERSON_NAME, p.FIRSTNAME, p.LASTNAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @user_id
                `);
            
            const reporterRow = reporterResult.recordset[0] || {};
            const reporterName = formatPersonName(reporterRow);
            
            // Get assignee info if ticket was pre-assigned
            let assigneeInfo = null;
            if (validatedAssigneeId) {
                const assigneeResult = await pool.request()
                    .input('assignee_id', sql.Int, validatedAssigneeId)
                    .query(`
                        SELECT p.PERSON_NAME, p.FIRSTNAME, p.LASTNAME, p.EMAIL, p.DEPTNO, u.LineID
                        FROM Person p
                        LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                        WHERE p.PERSONNO = @assignee_id
                    `);
                const assigneeRow = assigneeResult.recordset[0] || {};
                assigneeInfo = {
                    full_name: formatPersonName(assigneeRow),
                    LineID: assigneeRow.LineID,
                    Email: assigneeRow.EMAIL
                };
            }
            
            // Prepare ticket data for email
            const ticketDataForEmail = {
                id: ticketId,
                ticket_number: ticket_number,
                title,
                description,
                pucode: pucode,
                plant_id: ticketResult.plant_id,
                area_id: ticketResult.area_id,
                line_id: ticketResult.line_id,
                machine_id: ticketResult.machine_id,
                machine_number: ticketResult.machine_number,
                severity_level: severity_level || 'medium',
                priority: priority || 'normal',
                cost_avoidance,
                downtime_avoidance_hours,
                failure_mode_id: failure_mode_id || 0,
                reported_by,
                assigned_to: validatedAssigneeId,
                created_at: new Date().toISOString()
            };
            
            // Send notification email
            await emailService.sendNewTicketNotification(ticketDataForEmail, reporterName);
            console.log('Email notification sent successfully for ticket:', ticket_number);

            // Send notification to pre-assigned user if applicable
            if (assigneeInfo && assigneeInfo.Email) {
                try {
                    await emailService.sendTicketPreAssignedNotification(ticketDataForEmail, reporterName, assigneeInfo.Email);
                    console.log('Pre-assignment notification sent to:', assigneeInfo.full_name);
                } catch (assigneeEmailErr) {
                    console.error('Failed to send pre-assignment email:', assigneeEmailErr);
                }
            }

            // Note: LINE notification will be triggered after image uploads
            // This ensures images are included in the notification
            console.log('Ticket created successfully. LINE notification will be sent after image uploads.');
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
            // Don't fail the ticket creation if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: {
                id: ticketId,
                ticket_number: ticket_number,
                title,
                pucode: pucode,
                plant_id: ticketResult.plant_id,
                area_id: ticketResult.area_id,
                line_id: ticketResult.line_id,
                machine_id: ticketResult.machine_id,
                machine_number: ticketResult.machine_number,
                status: 'open'
            }
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket',
            error: error.message
        });
    }
};

// Get all tickets with filtering and pagination
const getTickets = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            severity_level,
            assigned_to,
            reported_by,
            search,
            area_id
        } = req.query;

        const offset = (page - 1) * limit;
        const pool = await sql.connect(dbConfig);

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND t.status = @status';
            params.push({ name: 'status', value: status, type: sql.VarChar(20) });
        }

        if (priority) {
            whereClause += ' AND t.priority = @priority';
            params.push({ name: 'priority', value: priority, type: sql.VarChar(20) });
        }

        if (severity_level) {
            whereClause += ' AND t.severity_level = @severity_level';
            params.push({ name: 'severity_level', value: severity_level, type: sql.VarChar(20) });
        }

        if (assigned_to) {
            whereClause += ' AND t.assigned_to = @assigned_to';
            params.push({ name: 'assigned_to', value: assigned_to, type: sql.Int });
        }

        if (reported_by) {
            whereClause += ' AND t.reported_by = @reported_by';
            params.push({ name: 'reported_by', value: reported_by, type: sql.Int });
        }

        if (search) {
            whereClause += ' AND (t.title LIKE @search OR t.description LIKE @search OR t.ticket_number LIKE @search)';
            params.push({ name: 'search', value: `%${search}%`, type: sql.NVarChar(255) });
        }

        if (area_id) {
            whereClause += ' AND t.area_id = @area_id';
            params.push({ name: 'area_id', value: area_id, type: sql.Int });
        }

        // Build the request with parameters
        let request = createSqlRequest(pool, params);

        // Add offset and limit parameters
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, parseInt(limit));

        // Get total count
        const countResult = await request.query(`
            SELECT COUNT(*) as total FROM Tickets t ${whereClause}
        `);
        const total = countResult.recordset[0].total;

        // Get tickets with user information
        const ticketsResult = await request.query(`
            SELECT 
                t.*,
                r.PERSON_NAME as reporter_name,
                r.EMAIL as reporter_email,
                a.PERSON_NAME as assignee_name,
                a.EMAIL as assignee_email,
                -- Plant information
                p.name as plant_name,
                p.code as plant_code,
                -- Area information
                ar.name as area_name,
                ar.code as area_code,
                -- Line information
                l.name as line_name,
                l.code as line_code,
                -- Machine information
                m.name as machine_name,
                m.code as machine_code
            FROM Tickets t
            LEFT JOIN Person r ON t.reported_by = r.PERSONNO
            LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
            LEFT JOIN Plant p ON t.plant_id = p.id
            LEFT JOIN Area ar ON t.area_id = ar.id
            LEFT JOIN Line l ON t.line_id = l.id
            LEFT JOIN Machine m ON t.machine_id = m.id
            ${whereClause}
            ORDER BY t.created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        const tickets = ticketsResult.recordset;

        res.json({
            success: true,
            data: {
                tickets,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets',
            error: error.message
        });
    }
};

// Get ticket by ID
const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // Get current user ID for approval level calculation
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    t.*,
                    r.PERSON_NAME as reporter_name,
                    r.EMAIL as reporter_email,
                    a.PERSON_NAME as assignee_name,
                    a.EMAIL as assignee_email,
                    -- Workflow tracking fields
                    accepted_user.PERSON_NAME as accepted_by_name,
                    rejected_user.PERSON_NAME as rejected_by_name,
                    completed_user.PERSON_NAME as completed_by_name,
                    escalated_user.PERSON_NAME as escalated_by_name,
                    closed_user.PERSON_NAME as closed_by_name,
                    reopened_user.PERSON_NAME as reopened_by_name,
                    l3_override_user.PERSON_NAME as l3_override_by_name,
                    -- Plant information
                    p.name as plant_name,
                    p.code as plant_code,
                    -- Area information
                    ar.name as area_name,
                    ar.code as area_code,
                    -- Line information
                    l.name as line_name,
                    l.code as line_code,
                    -- Machine information
                    m.name as machine_name,
                    m.code as machine_code,
                    -- User's relationship to this ticket
                    CASE 
                        WHEN t.reported_by = @userId THEN 'creator'
                        WHEN ta.approval_level > 2 THEN 'approver'
                        ELSE 'viewer'
                    END as user_relationship,
                    ta.approval_level as user_approval_level
                FROM Tickets t
                LEFT JOIN Person r ON t.reported_by = r.PERSONNO
                LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
                LEFT JOIN Person accepted_user ON t.accepted_by = accepted_user.PERSONNO
                LEFT JOIN Person rejected_user ON t.rejected_by = rejected_user.PERSONNO
                LEFT JOIN Person completed_user ON t.completed_by = completed_user.PERSONNO
                LEFT JOIN Person escalated_user ON t.escalated_by = escalated_user.PERSONNO
                LEFT JOIN Person closed_user ON t.closed_by = closed_user.PERSONNO
                LEFT JOIN Person reopened_user ON t.reopened_by = reopened_user.PERSONNO
                LEFT JOIN Person l3_override_user ON t.l3_override_by = l3_override_user.PERSONNO
                LEFT JOIN Plant p ON t.plant_id = p.id
                LEFT JOIN Area ar ON t.area_id = ar.id
                LEFT JOIN Line l ON t.line_id = l.id
                LEFT JOIN Machine m ON t.machine_id = m.id
                LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.area_id = t.area_id
                WHERE t.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Get ticket images
        const imagesResult = await pool.request()
            .input('ticket_id', sql.Int, id)
            .query(`
                SELECT * FROM TicketImages WHERE ticket_id = @ticket_id ORDER BY uploaded_at
            `);

        // Get ticket comments
        const commentsResult = await pool.request()
            .input('ticket_id', sql.Int, id)
            .query(`
                SELECT 
                    tc.*,
                    u.PERSON_NAME as user_name,
                    u.EMAIL as user_email,
                    s.AvatarUrl as user_avatar_url
                FROM TicketComments tc
                LEFT JOIN Person u ON tc.user_id = u.PERSONNO
                LEFT JOIN _secUsers s ON u.PERSONNO = s.PersonNo
                WHERE tc.ticket_id = @ticket_id 
                ORDER BY tc.created_at
            `);

        // Get comprehensive status history (including assignments)
        const historyResult = await pool.request()
            .input('ticket_id', sql.Int, id)
            .query(`
                SELECT 
                    tsh.*,
                    u.PERSON_NAME as changed_by_name,
                    to_user_person.PERSON_NAME as to_user_name,
                    to_user_person.EMAIL as to_user_email
                FROM TicketStatusHistory tsh
                LEFT JOIN Person u ON tsh.changed_by = u.PERSONNO
                LEFT JOIN Person to_user_person ON tsh.to_user = to_user_person.PERSONNO
                WHERE tsh.ticket_id = @ticket_id 
                ORDER BY tsh.changed_at
            `);

        const ticket = result.recordset[0];
        ticket.images = imagesResult.recordset;
        ticket.comments = commentsResult.recordset;
        ticket.status_history = historyResult.recordset;
        
        // Include user relationship and approval level
        ticket.user_relationship = ticket.user_relationship;
        ticket.user_approval_level = ticket.user_approval_level;

        res.json({
            success: true,
            data: ticket
        });

    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket',
            error: error.message
        });
    }
};

// Update ticket
const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const pool = await sql.connect(dbConfig);

        // Get current ticket to check status changes
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT status, reported_by FROM Tickets WHERE id = @id');

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const oldStatus = currentTicket.recordset[0].status;
        const reporterId = currentTicket.recordset[0].reported_by;

        // Build update query dynamically
        const updateFields = [];
        const params = [{ name: 'id', value: id, type: sql.Int }];

        Object.keys(updateData).forEach(key => {
            if (key !== 'id' && key !== 'ticket_number' && key !== 'reported_by') {
                updateFields.push(`${key} = @${key}`);
                params.push({ name: key, value: updateData[key], type: sql.VarChar(255) });
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updateFields.push('updated_at = GETDATE()');

        // Build the request with parameters
        let request = createSqlRequest(pool, params);

        await request.query(`
            UPDATE Tickets 
            SET ${updateFields.join(', ')}
            WHERE id = @id
        `);

        // Log status change if status was updated
        if (updateData.status && updateData.status !== oldStatus) {
            await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('old_status', sql.VarChar(20), oldStatus)
                .input('new_status', sql.VarChar(20), updateData.status)
                .input('changed_by', sql.Int, req.user.id)
                .input('notes', sql.NVarChar(500), updateData.status_notes || 'Status updated')
                .query(`
                    INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                    VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
                `);

            // Send status update notification to reporter
            try {
                // Get reporter info and ticket details
                const detailResult = await pool.request()
                    .input('ticket_id', sql.Int, id)
                    .input('reporter_id', sql.Int, reporterId)
                    .query(`
                        SELECT 
                            t.id, t.ticket_number, t.title, t.severity_level, t.priority,
                            t.plant_id, t.area_id, t.line_id, t.machine_id, t.machine_number
                        FROM Tickets t
                        WHERE t.id = @ticket_id;

                        SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID 
                        FROM Person p
                        LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                        WHERE p.PERSONNO = @reporter_id;
                    `);

                const ticketData = detailResult.recordsets[0][0];
                const reporter = detailResult.recordsets[1][0];
                const changedByName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

                if (reporter?.EMAIL) {
                    await emailService.sendTicketStatusUpdateNotification(
                        ticketData,
                        oldStatus,
                        updateData.status,
                        changedByName,
                        reporter.EMAIL
                    );
                }

                // LINE push to reporter
                try {
                    if (reporter?.LineID) {
                        // Get ticket images for FLEX message
                        const imagesResult = await pool.request()
                            .input('ticket_id', sql.Int, id)
                            .query(`
                                SELECT image_url, image_name 
                                FROM TicketImages 
                                WHERE ticket_id = @ticket_id 
                                ORDER BY uploaded_at ASC
                            `);
                        
                        const ticketImages = mapImagesToLinePayload(imagesResult.recordset);
                        
                        // Determine state based on new status
                        let abnState;
                        switch (updateData.status) {
                            case 'accepted': case 'in_progress':
                                abnState = abnFlexService.AbnCaseState.ACCEPTED;
                                break;
                            case 'completed':
                                abnState = abnFlexService.AbnCaseState.COMPLETED;
                                break;
                            case 'rejected_final':
                                abnState = abnFlexService.AbnCaseState.REJECT_FINAL;
                                break;
                            case 'rejected_pending_l3_review':
                                abnState = abnFlexService.AbnCaseState.REJECT_TO_MANAGER;
                                break;
                            case 'escalated':
                                abnState = abnFlexService.AbnCaseState.ESCALATED;
                                break;
                            case 'closed':
                                abnState = abnFlexService.AbnCaseState.CLOSED;
                                break;
                            case 'reopened_in_progress':
                                abnState = abnFlexService.AbnCaseState.REOPENED;
                                break;
                            default:
                                abnState = abnFlexService.AbnCaseState.CREATED;
                        }
                        
                        const flexMsg = abnFlexService.buildAbnFlexMinimal(abnState, {
                            caseNo: ticketData.ticket_number,
                            assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                            problem: ticketData.title || "No description",
                            actionBy: changedByName,
                            comment: updateData.status_notes || `สถานะเปลี่ยนจาก ${oldStatus} เป็น ${updateData.status}`,
                            detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                        });
                        await abnFlexService.pushToUser(reporter.LineID, flexMsg);
                    }
                } catch (lineErr) {
                    console.error('Failed to send LINE status update notification:', lineErr);
                }
            } catch (emailErr) {
                console.error('Failed to send status update email:', emailErr);
            }
        }

        res.json({
            success: true,
            message: 'Ticket updated successfully'
        });

    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket',
            error: error.message
        });
    }
};

// Add comment to ticket
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const user_id = req.user.id;

        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('user_id', sql.Int, user_id)
            .input('comment', sql.NVarChar(sql.MAX), comment)
            .query(`
                INSERT INTO TicketComments (ticket_id, user_id, comment)
                VALUES (@ticket_id, @user_id, @comment);
                SELECT SCOPE_IDENTITY() as id;
            `);

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: {
                id: result.recordset[0].id,
                comment,
                user_id,
                created_at: new Date()
            }
        });

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment',
            error: error.message
        });
    }
};

// Assign ticket
const assignTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_to, notes } = req.body;
        const assigned_by = req.user.id;

        const pool = await sql.connect(dbConfig);

        // Update ticket assignment and log in status history
        await pool.request()
            .input('id', sql.Int, id)
            .input('assigned_to', sql.Int, assigned_to)
            .input('assigned_by', sql.Int, assigned_by)
            .input('notes', sql.NVarChar(500), notes)
            .query(`
                UPDATE Tickets SET assigned_to = @assigned_to, updated_at = GETDATE() WHERE id = @id;
                UPDATE Tickets 
                SET status = 'assigned', updated_at = GETDATE()
                WHERE id = @id AND status = 'open';
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, to_user, notes)
                VALUES (@id, 'open', 'assigned', @assigned_by, @assigned_to, @notes)
            `);

        // Send assignment notification to assignee
        try {
            // Get ticket details and assignee info
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('assignee_id', sql.Int, assigned_to)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, plant_id, area_id, line_id, machine_id, machine_number
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT PERSON_NAME, EMAIL, DEPTNO
                    FROM Person WHERE PERSONNO = @assignee_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const assignee = detailResult.recordsets[1][0];
            const assigneeDisplayName = formatPersonName(assignee, 'Assignee');

            if (assignee?.EMAIL) {
                await emailService.sendTicketAssignmentNotification(
                    ticketData,
                    assigneeDisplayName,
                    assignee.EMAIL
                );
            }

            // LINE push to assignee
            try {
                if (assignee?.DEPTNO) {
                    // Get ticket images for FLEX message
                    const imagesResult = await pool.request()
                        .input('ticket_id', sql.Int, id)
                        .query(`
                            SELECT image_url, image_name 
                            FROM TicketImages 
                            WHERE ticket_id = @ticket_id 
                            ORDER BY uploaded_at ASC
                        `);
                    
                    const ticketImages = mapImagesToLinePayload(imagesResult.recordset);
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.REASSIGNED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: assigneeDisplayName,
                        comment: notes || "งานได้รับการมอบหมายให้คุณแล้ว",
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(assignee.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE assignment notification:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send assignment email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Ticket assigned successfully'
        });

    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign ticket',
            error: error.message
        });
    }
};

// Delete ticket
const deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Tickets WHERE id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete ticket',
            error: error.message
        });
    }
};

// Upload ticket image
const uploadTicketImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { image_type = 'other', image_name } = req.body;
        const user_id = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file uploaded' });
        }

        // Build public URL path for the uploaded file
        const relativePath = `/uploads/tickets/${id}/${req.file.filename}`;

        const pool = await sql.connect(dbConfig);

        // Ensure ticket exists
        const exists = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id FROM Tickets WHERE id = @id');
        if (exists.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Insert image record
        const result = await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('image_type', sql.VarChar(20), image_type)
            .input('image_url', sql.NVarChar(500), relativePath)
            .input('image_name', sql.NVarChar(255), image_name || req.file.originalname)
            .input('uploaded_by', sql.Int, user_id)
            .query(`
                INSERT INTO TicketImages (ticket_id, image_type, image_url, image_name, uploaded_by, uploaded_at)
                VALUES (@ticket_id, @image_type, @image_url, @image_name, @uploaded_by, GETDATE());
                SELECT SCOPE_IDENTITY() as id;
            `);

        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                id: result.recordset[0].id,
                ticket_id: parseInt(id, 10),
                image_type,
                image_url: relativePath,
                image_name: image_name || req.file.originalname,
                uploaded_at: new Date().toISOString(),
                uploaded_by: user_id
            }
        });
    } catch (error) {
        console.error('Error uploading ticket image:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image', error: error.message });
    }
};

// Upload multiple ticket images
const uploadTicketImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { image_type = 'other' } = req.body; // single type applied to all
        const user_id = req.user.id;

        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ success: false, message: 'No image files uploaded' });
        }

        const pool = await sql.connect(dbConfig);

        // Ensure ticket exists
        const exists = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id FROM Tickets WHERE id = @id');
        if (exists.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const inserted = [];
        for (const file of files) {
            const relativePath = `/uploads/tickets/${id}/${file.filename}`;
            const result = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('image_type', sql.VarChar(20), image_type)
                .input('image_url', sql.NVarChar(500), relativePath)
                .input('image_name', sql.NVarChar(255), file.originalname)
                .input('uploaded_by', sql.Int, user_id)
                .query(`
                    INSERT INTO TicketImages (ticket_id, image_type, image_url, image_name, uploaded_by, uploaded_at)
                    VALUES (@ticket_id, @image_type, @image_url, @image_name, @uploaded_by, GETDATE());
                    SELECT SCOPE_IDENTITY() as id;
                `);
            inserted.push({
                id: result.recordset[0].id,
                ticket_id: parseInt(id, 10),
                image_type,
                image_url: relativePath,
                image_name: file.originalname,
                uploaded_at: new Date().toISOString(),
                uploaded_by: user_id
            });
        }

        res.status(201).json({
            success: true,
            message: 'Images uploaded successfully',
            data: inserted
        });
    } catch (error) {
        console.error('Error uploading ticket images:', error);
        res.status(500).json({ success: false, message: 'Failed to upload images', error: error.message });
    }
};

// Delete ticket image (DB record and file if present)
const deleteTicketImage = async (req, res) => {
    try {
        const { id, imageId } = req.params; // id is ticket id
        const pool = await sql.connect(dbConfig);

        // Fetch image record and validate ownership
        const imgResult = await pool.request()
            .input('imageId', sql.Int, imageId)
            .input('ticket_id', sql.Int, id)
            .query(`
                SELECT id, ticket_id, image_url 
                FROM TicketImages 
                WHERE id = @imageId AND ticket_id = @ticket_id
            `);

        if (imgResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        const image = imgResult.recordset[0];

        // Ownership/role check: reporter, assignee, or L2+ can delete
        const ticketResult = await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT 
                    t.reported_by, 
                    t.assigned_to,
                    t.area_id,
                    ta.approval_level as user_approval_level
                FROM Tickets t
                LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.area_id = t.area_id
                WHERE t.id = @ticket_id
            `);
        const ticketRow = ticketResult.recordset[0];
        const isOwner = ticketRow && (ticketRow.reported_by === req.user.id || ticketRow.assigned_to === req.user.id);
        const isL2Plus = (ticketRow?.user_approval_level || 0) >= 2; // L2 or L3
        if (!isOwner && !isL2Plus) {
            return res.status(403).json({ success: false, message: 'Not permitted to delete this image' });
        }

        // Delete DB record first (so UI reflects state even if file removal fails)
        await pool.request()
            .input('imageId', sql.Int, image.id)
            .query('DELETE FROM TicketImages WHERE id = @imageId');

        // Attempt to remove file from disk
        try {
            if (image.image_url) {
                // image_url starts with /uploads/... Map it to filesystem under backend/uploads
                const normalized = image.image_url.replace(/^\\+/g, '/');
                const relative = normalized.startsWith('/uploads/') ? normalized.substring('/uploads/'.length) : normalized;
                const filePathPrimary = path.join(__dirname, '..', 'uploads', relative);
                const filePathAlt = path.join(__dirname, 'uploads', relative); // legacy location

                if (fs.existsSync(filePathPrimary)) {
                    fs.unlink(filePathPrimary, () => {});
                } else if (fs.existsSync(filePathAlt)) {
                    fs.unlink(filePathAlt, () => {});
                }
            }
        } catch (fileErr) {
            console.warn('Failed to remove image file:', fileErr.message);
        }

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket image:', error);
        res.status(500).json({ success: false, message: 'Failed to delete image', error: error.message });
    }
};

// Accept ticket (L2 or L3)
const acceptTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, scheduled_complete } = req.body;
        const accepted_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Validate required fields
        if (!scheduled_complete) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled completion date is required'
            });
        }

        // Get current ticket status
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id');

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];
        let newStatus = 'in_progress';
        let statusNotes = 'Ticket accepted and work started';

        // Handle different acceptance scenarios
        if (ticket.status === 'open') {
            // L2 accepting new ticket
            newStatus = 'in_progress';
            statusNotes = 'Ticket accepted by L2 and work started';
        } else if (ticket.status === 'rejected_pending_l3_review') {
            // L3 overriding L2 rejection
            newStatus = 'in_progress';
            statusNotes = 'Ticket accepted by L3 after L2 rejection';
        } else if (ticket.status === 'reopened_in_progress') {
            // L2 accepting reopened ticket
            newStatus = 'in_progress';
            statusNotes = 'Reopened ticket accepted and work restarted';
        }

        // Update ticket status and assign to acceptor with workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), newStatus)
            .input('assigned_to', sql.Int, accepted_by)
            .input('accepted_by', sql.Int, accepted_by)
            .input('scheduled_complete', sql.DateTime2, scheduled_complete)
            .query(`
                UPDATE Tickets 
                SET status = @status, 
                    assigned_to = @assigned_to, 
                    accepted_at = GETDATE(),
                    accepted_by = @accepted_by,
                    scheduled_complete = @scheduled_complete,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), newStatus)
            .input('changed_by', sql.Int, accepted_by)
            .input('notes', sql.NVarChar(500), notes || statusNotes)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Add status change comment
        await addStatusChangeComment(pool, id, accepted_by, ticket.status, newStatus, notes);

        // Send notification to requestor
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .query(`
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.plant_id, t.area_id, t.line_id, t.machine_id, t.machine_number, t.status, t.pu_id,
                           pu.PUCODE, pu.PUNAME
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.pu_id = pu.PUNO AND pu.FLAGDEL != 'Y'
                    WHERE t.id = @ticket_id;

                    SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @reporter_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const reporter = detailResult.recordsets[1][0];
            const acceptorName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            if (reporter?.Email) {
                await emailService.sendTicketAcceptedNotification(
                    ticketData,
                    acceptorName,
                    reporter.Email
                );
            }

            // LINE notification
            try {
                if (reporter?.LineID) {
                    // Get ticket images for FLEX message
                    // const imagesResult = await pool.request()
                    //     .input('ticket_id', sql.Int, id)
                    //     .query(`
                    //         SELECT image_url, image_name 
                    //         FROM TicketImages 
                    //         WHERE ticket_id = @ticket_id 
                    //         ORDER BY uploaded_at ASC
                    //     `);
                    
                    // const ticketImages = imagesResult.recordset.map(img => ({
                    //     url: `${baseUrl}${img.image_url}`,
                    //     filename: img.image_name
                    // }));
                    
                    // NEW: Using clean abnormal finding flex service
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ACCEPTED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: acceptorName,
                        comment: notes || `งานได้รับการยอมรับแล้ว โดย ${acceptorName}`,
                        extraKVs: scheduled_complete ? [
                            { label: "Scheduled Complete", value: new Date(scheduled_complete).toLocaleDateString('th-TH') }
                        ] : [],
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(reporter.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE acceptance notification:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send acceptance email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Ticket accepted successfully',
            data: { status: newStatus, assigned_to: accepted_by }
        });

    } catch (error) {
        console.error('Error accepting ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept ticket',
            error: error.message
        });
    }
};

// Reject ticket (L2 or L3)
const rejectTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason, escalate_to_l3 } = req.body;
        const rejected_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status and user's area-specific approval level
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, rejected_by)
            .query(`
                SELECT 
                    t.status, 
                    t.reported_by,
                    t.area_id,
                    ta.approval_level as user_approval_level
                FROM Tickets t
                LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.area_id = t.area_id
                WHERE t.id = @id
            `);

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];
        let newStatus = 'rejected_pending_l3_review'; // Default to L3 review for L2 rejections
        let statusNotes = 'Ticket rejected by L2, escalated to L3 for review';

        // Handle different rejection scenarios
        if ((ticket.user_approval_level || 0) >= 3) {
            // L3 rejecting (final) - only L3 can make final rejections
            newStatus = 'rejected_final';
            statusNotes = 'Ticket rejected by L3 (final decision)';
        } else {
            // L2 rejecting - always goes to L3 review
            newStatus = 'rejected_pending_l3_review';
            statusNotes = 'Ticket rejected by L2, escalated to L3 for review';
        }

        // Update ticket status and rejection reason with workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), newStatus)
            .input('rejection_reason', sql.NVarChar(500), rejection_reason)
            .input('rejected_by', sql.Int, rejected_by)
            .query(`
                UPDATE Tickets 
                SET status = @status, 
                    rejection_reason = @rejection_reason, 
                    rejected_at = GETDATE(),
                    rejected_by = @rejected_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), newStatus)
            .input('changed_by', sql.Int, rejected_by)
            .input('notes', sql.NVarChar(500), rejection_reason || statusNotes)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Add status change comment
        await addStatusChangeComment(pool, id, rejected_by, ticket.status, newStatus, rejection_reason);

        // Send notification to requestor and assignee
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .input('assignee_id', sql.Int, ticket.assigned_to)
                .query(`
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.plant_id, t.area_id, t.line_id, t.machine_id, t.machine_number, t.pu_id, t.assigned_to,
                           pu.PUCODE, pu.PUNAME
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.pu_id = pu.PUNO AND pu.FLAGDEL != 'Y'
                    WHERE t.id = @ticket_id;

                    SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @reporter_id;

                    SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @assignee_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const reporter = detailResult.recordsets[1][0];
            const assignee = detailResult.recordsets[2][0];
            const rejectorName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;
            const reporterDisplayName = formatPersonName(reporter, 'ไม่ระบุ');
            const assigneeDisplayName = assignee ? formatPersonName(assignee, 'ไม่ระบุ') : null;

            // hydrate names for flex payloads
            ticketData.reporter_name = reporterDisplayName;
            if (assigneeDisplayName) {
                ticketData.assignee_name = assigneeDisplayName;
            }

            // Note: Using simple rejection message format without images

            // Send email notification to reporter
            if (reporter?.Email) {
                await emailService.sendTicketRejectedNotification(
                    ticketData,
                    rejectorName,
                    rejection_reason,
                    newStatus,
                    reporter.Email
                );
            }

            // Send email notification to assignee (if exists)
            if (assignee?.Email && assignee.PERSON_NAME) {
                await emailService.sendTicketRejectedNotification(
                    ticketData,
                    rejectorName,
                    rejection_reason,
                    newStatus,
                    assignee.Email
                );
            }

            // LINE notification to reporter
            try {
                if (reporter?.LineID) {
                    // Determine rejection state based on user level
                    const rejectionState = (ticket.user_approval_level || 0) >= 3 
                        ? abnFlexService.AbnCaseState.REJECT_FINAL 
                        : abnFlexService.AbnCaseState.REJECT_TO_MANAGER;
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(rejectionState, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: rejectorName,
                        comment: rejection_reason || "งานถูกปฏิเสธ",
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(reporter.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE rejection notification to reporter:', lineErr);
            }

            // LINE notification to assignee (if exists)
            try {
                if (assignee?.LineID && assignee.PERSON_NAME) {
                    // Determine rejection state based on user level
                    const rejectionState = (ticket.user_approval_level || 0) >= 3 
                        ? abnFlexService.AbnCaseState.REJECT_FINAL 
                        : abnFlexService.AbnCaseState.REJECT_TO_MANAGER;
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(rejectionState, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: rejectorName,
                        comment: rejection_reason || "งานถูกปฏิเสธ",
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(assignee.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE rejection notification to assignee:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send rejection email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Ticket rejected successfully',
            data: { status: newStatus, rejection_reason }
        });

    } catch (error) {
        console.error('Error rejecting ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject ticket',
            error: error.message
        });
    }
};

// Complete job (L2)
const completeJob = async (req, res) => {
    try {
        const { id } = req.params;
        const { completion_notes, downtime_avoidance_hours, cost_avoidance, failure_mode_id } = req.body;
        const completed_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id');

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];

        // Check if user is assigned to this ticket
        if (ticket.assigned_to !== completed_by) {
            return res.status(403).json({
                success: false,
                message: 'Only the assigned user can complete this ticket'
            });
        }

        // Check if ticket is in a completable status
        if (ticket.status !== 'in_progress' && ticket.status !== 'reopened_in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Only in-progress or reopened tickets can be completed'
            });
        }

        // Update ticket status to completed with new fields and workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'completed')
            .input('downtime_avoidance_hours', sql.Decimal(8,2), downtime_avoidance_hours)
            .input('cost_avoidance', sql.Decimal(15,2), cost_avoidance)
            .input('failure_mode_id', sql.Int, failure_mode_id)
            .input('completed_by', sql.Int, completed_by)
            .query(`
                UPDATE Tickets 
                SET status = @status, 
                    downtime_avoidance_hours = @downtime_avoidance_hours,
                    cost_avoidance = @cost_avoidance,
                    failure_mode_id = @failure_mode_id,
                    completed_at = GETDATE(),
                    completed_by = @completed_by,
                    resolved_at = GETDATE(), 
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), 'completed')
            .input('changed_by', sql.Int, completed_by)
            .input('notes', sql.NVarChar(500), completion_notes || 'Job completed')
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Add status change comment
        await addStatusChangeComment(pool, id, completed_by, ticket.status, 'completed', completion_notes);

        // Send notification to requestor
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .query(`
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.plant_id, t.area_id, t.line_id, t.machine_id, t.machine_number, t.status, t.downtime_avoidance_hours, t.cost_avoidance, t.pu_id, t.failure_mode_id,
                           fm.FailureModeCode, fm.FailureModeName,
                           pu.PUCODE, pu.PUNAME
                    FROM Tickets t
                    LEFT JOIN FailureModes fm ON t.failure_mode_id = fm.FailureModeNo AND fm.FlagDel != 'Y'
                    LEFT JOIN PU pu ON t.pu_id = pu.PUNO AND pu.FLAGDEL != 'Y'
                    WHERE t.id = @ticket_id;

                    SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @reporter_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const reporter = detailResult.recordsets[1][0];
            const completerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            if (reporter?.Email) {
                await emailService.sendJobCompletedNotification(
                    ticketData,
                    completerName,
                    completion_notes,
                    downtime_avoidance_hours,
                    cost_avoidance,
                    reporter.Email
                );
            }

            // LINE notification
            try {
                if (reporter?.LineID) {
                    // Get ticket images for FLEX message (after images for completion)
                    const imagesResult = await pool.request()
                        .input('ticket_id', sql.Int, id)
                        .query(`
                            SELECT image_url, image_name, image_type
                            FROM TicketImages 
                            WHERE ticket_id = @ticket_id 
                            ORDER BY uploaded_at ASC
                        `);
                    
                    // Get hero image from "after" images, fallback to any image
                    const afterImages = imagesResult.recordset.filter(img => img.image_type === 'after');
                    const heroImageUrl = getHeroImageUrl(afterImages.length > 0 ? afterImages : imagesResult.recordset);
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.COMPLETED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: completerName,
                        comment: completion_notes || "งานเสร็จสมบูรณ์แล้ว",
                        heroImageUrl: heroImageUrl,
                        extraKVs: [
                            { label: "Cost Avoidance", value: cost_avoidance ? `${cost_avoidance.toLocaleString()} บาท` : "-" },
                            { label: "Downtime Avoidance", value: downtime_avoidance_hours ? `${downtime_avoidance_hours} ชั่วโมง` : "-" },
                            { label: "Failure Mode", value: ticketData.FailureModeName || "-" }
                        ],
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(reporter.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE completion notification:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send completion email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Job completed successfully',
            data: { 
                status: 'completed', 
                downtime_avoidance_hours,
                cost_avoidance,
                failure_mode_id
            }
        });

    } catch (error) {
        console.error('Error completing job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete job',
            error: error.message
        });
    }
};

// Escalate ticket (L2 to L3)
const escalateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { escalation_reason, escalated_to } = req.body;
        const escalated_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id');

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];

        // Check if user is assigned to this ticket
        if (ticket.assigned_to !== escalated_by) {
            return res.status(403).json({
                success: false,
                message: 'Only the assigned user can escalate this ticket'
            });
        }

        // Check if ticket is in an escalatable status
        if (ticket.status !== 'in_progress' && ticket.status !== 'reopened_in_progress') {
            return res.status(400).json({
                success: false,
                message: 'Only in-progress or reopened tickets can be escalated'
            });
        }

        // Update ticket status to escalated with workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'escalated')
            .input('escalated_to', sql.Int, escalated_to)
            .input('escalation_reason', sql.NVarChar(500), escalation_reason)
            .input('escalated_by', sql.Int, escalated_by)
            .query(`
                UPDATE Tickets 
                SET status = @status, 
                    escalated_to = @escalated_to, 
                    escalation_reason = @escalation_reason, 
                    escalated_at = GETDATE(),
                    escalated_by = @escalated_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), 'escalated')
            .input('changed_by', sql.Int, escalated_by)
            .input('notes', sql.NVarChar(500), `Escalated to L3: ${escalation_reason}`)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Add status change comment
        await addStatusChangeComment(pool, id, escalated_by, ticket.status, 'escalated', escalation_reason);

        // Send notification to L3 and requestor
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .input('escalated_to_id', sql.Int, escalated_to)
                .query(`
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.plant_id, t.area_id, t.line_id, t.machine_id, t.machine_number, t.pu_id,
                           pu.PUCODE, pu.PUNAME
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.pu_id = pu.PUNO AND pu.FLAGDEL != 'Y'
                    WHERE t.id = @ticket_id;

                    SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @reporter_id;

                    SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @escalated_to_id;

                    SELECT image_name as filename, image_url as url, uploaded_at, uploaded_by
                    FROM TicketImages 
                    WHERE ticket_id = @ticket_id
                    ORDER BY uploaded_at ASC;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const reporter = detailResult.recordsets[1][0];
            const escalatedTo = detailResult.recordsets[2][0];
            const images = detailResult.recordsets[3] || [];
            const escalatorName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            // Email notifications
            const sentToEmails = new Set();
            
            // Notify L3
            if (escalatedTo?.Email) {
                await emailService.sendTicketEscalatedNotification(
                    ticketData,
                    escalatorName,
                    escalation_reason,
                    escalatedTo.Email
                );
                sentToEmails.add(escalatedTo.Email);
            }

            // Notify requestor (only if different from L3)
            if (reporter?.Email && !sentToEmails.has(reporter.Email)) {
                await emailService.sendTicketEscalatedToRequestorNotification(
                    ticketData,
                    escalatorName,
                    escalation_reason,
                    reporter.Email
                );
            }

            // LINE notifications
            try {
                // Check for duplicate notifications (if escalatedTo and reporter are the same person)
                const sentToUsers = new Set();
                
                if (escalatedTo?.LineID) {
                    // Get hero image from before images
                    const heroImageUrl = getHeroImageUrl(images);
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ESCALATED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: escalatorName,
                        comment: escalation_reason || "งานถูกส่งต่อให้หัวหน้างานพิจารณา",
                        heroImageUrl: heroImageUrl,
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(escalatedTo.LineID, flexMsg);
                    sentToUsers.add(escalatedTo.LineID);
                }
                
                // Only send to reporter if they haven't already received a notification
                if (reporter?.LineID && !sentToUsers.has(reporter.LineID)) {
                    // Get hero image from before images
                    const heroImageUrl = getHeroImageUrl(images);
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ESCALATED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: escalatorName,
                        comment: escalation_reason || "งานของคุณถูกส่งต่อให้หัวหน้างานพิจารณา",
                        heroImageUrl: heroImageUrl,
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(reporter.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE escalation notification:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send escalation email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Ticket escalated successfully',
            data: { status: 'escalated', escalated_to, escalation_reason }
        });

    } catch (error) {
        console.error('Error escalating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to escalate ticket',
            error: error.message
        });
    }
};

// Close ticket (Requestor)
const closeTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { close_reason, satisfaction_rating } = req.body;
        const closed_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id');

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];

        // Check if user is the requestor
        if (ticket.reported_by !== closed_by) {
            return res.status(403).json({
                success: false,
                message: 'Only the requestor can close this ticket'
            });
        }

        // Check if ticket is in completed status
        if (ticket.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Only completed tickets can be closed'
            });
        }

        // Update ticket status to closed with workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'closed')
            .input('closed_by', sql.Int, closed_by)
            .input('satisfaction_rating', sql.Int, satisfaction_rating)
            .query(`
                UPDATE Tickets 
                SET status = @status, 
                    closed_at = GETDATE(),
                    closed_by = @closed_by,
                    satisfaction_rating = @satisfaction_rating,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), 'closed')
            .input('changed_by', sql.Int, closed_by)
            .input('notes', sql.NVarChar(500), close_reason || 'Ticket closed by requestor')
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Add status change comment
        await addStatusChangeComment(pool, id, closed_by, ticket.status, 'closed', close_reason);

        // Send notification to assignee
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('assignee_id', sql.Int, ticket.assigned_to)
                .query(`
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.plant_id, t.area_id, t.line_id, t.machine_id, t.machine_number, t.status, t.pu_id,
                           pu.PUCODE, pu.PUNAME
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.pu_id = pu.PUNO AND pu.FLAGDEL != 'Y'
                    WHERE t.id = @ticket_id;

                    
                    SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @assignee_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const assignee = detailResult.recordsets[1][0];
            const closerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;
            if (assignee?.Email) {
                await emailService.sendTicketClosedNotification(
                    ticketData,
                    closerName,
                    close_reason,
                    satisfaction_rating,
                    assignee.Email
                );
            }

            // LINE notification
            try {
                if (assignee?.LineID) {
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.CLOSED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: closerName,
                        comment: close_reason || "เคสถูกปิดโดยผู้ร้องขอ",
                        extraKVs: [
                            { label: "Satisfaction Rating", value: satisfaction_rating ? `${satisfaction_rating}/5 ดาว` : "ไม่ระบุ" }
                        ],
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(assignee.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE closure notification:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send closure email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Ticket closed successfully',
            data: { status: 'closed', closed_at: new Date().toISOString() }
        });

    } catch (error) {
        console.error('Error closing ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to close ticket',
            error: error.message
        });
    }
};

// Reassign ticket (L3 only)
const reassignTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_to: new_assignee_id, reassignment_reason } = req.body;
        const reassigned_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status and user's area-specific approval level
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, reassigned_by)
            .query(`
                SELECT 
                    t.status, 
                    t.reported_by, 
                    t.assigned_to,
                    t.area_id,
                    ta.approval_level as user_approval_level
                FROM Tickets t
                LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.area_id = t.area_id
                WHERE t.id = @id
            `);

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];

        // Check if user has L3+ approval level for this area
        if ((ticket.user_approval_level || 0) < 3) {
            return res.status(403).json({
                success: false,
                message: 'Only L3+ managers can reassign tickets in this area'
            });
        }

        // Check if ticket is in a state that allows reassignment
        // L3 can reassign tickets in any status except rejected_final and closed
        if (['rejected_final', 'closed'].includes(ticket.status)) {
            return res.status(400).json({
                success: false,
                message: 'Ticket cannot be reassigned when it is rejected_final or closed'
            });
        }

        // No need to validate new assignee - we trust the area-filtered list from frontend
        // The frontend only shows users who have L2+ approval level for this ticket's area
        
        // Get assignee name for logging (simple query since we trust the ID)
        const assigneeNameResult = await pool.request()
            .input('assignee_id', sql.Int, new_assignee_id)
            .query(`
                SELECT p.FIRSTNAME, p.LASTNAME, p.EMAIL, u.LineID 
                FROM Person p 
                LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo 
                WHERE p.PERSONNO = @assignee_id
            `);
        
        const assigneeRow = assigneeNameResult.recordset[0];
        const assigneeName = assigneeRow
            ? formatPersonName(assigneeRow, `User ${new_assignee_id}`)
            : `User ${new_assignee_id}`;

        // Update ticket assignment and status
        await pool.request()
            .input('id', sql.Int, id)
            .input('new_assignee_id', sql.Int, new_assignee_id)
            .input('status', sql.VarChar(50), 'open')
            .query(`
                UPDATE Tickets 
                SET assigned_to = @new_assignee_id, status = @status, updated_at = GETDATE()
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), 'open')
            .input('changed_by', sql.Int, reassigned_by)
            .input('notes', sql.NVarChar(500), `Ticket reassigned to ${assigneeName}: ${reassignment_reason || 'Reassigned by L3'}`)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Add status change comment
        await addStatusChangeComment(pool, id, reassigned_by, ticket.status, 'open', reassignment_reason);

        // Log assignment change in status history
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), 'assigned')
            .input('changed_by', sql.Int, reassigned_by)
            .input('to_user', sql.Int, new_assignee_id)
            .input('notes', sql.NVarChar(500), `Reassigned by L3: ${reassignment_reason || 'Ticket reassigned'}`)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, to_user, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @to_user, @notes)
            `);

        // Send notification to new assignee
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, plant_id, area_id, line_id, machine_id, machine_number
                    FROM Tickets WHERE id = @ticket_id
                `);

            const ticketData = detailResult.recordset[0];
            const reassignerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;
            const assigneeEmail = assigneeRow ? assigneeRow.EMAIL : null;

            if (assigneeEmail) {
                await emailService.sendTicketReassignedNotification(
                    ticketData,
                    reassignerName,
                    reassignment_reason,
                    assigneeEmail
                );
            }

            // LINE notification
            try {
            const assigneeLineID = assigneeRow ? assigneeRow.LineID : null;
                if (assigneeLineID) {
                    // Get ticket images for FLEX message
                    const imagesResult = await pool.request()
                        .input('ticket_id', sql.Int, id)
                        .query(`
                            SELECT image_url, image_name 
                            FROM TicketImages 
                            WHERE ticket_id = @ticket_id 
                            ORDER BY uploaded_at ASC
                        `);
                    
                    const ticketImages = mapImagesToLinePayload(imagesResult.recordset);
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.REASSIGNED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: reassignerName,
                        comment: reassignment_reason || "งานได้รับการมอบหมายใหม่ให้คุณ",
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(assigneeLineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE reassignment notification:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send reassignment email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Ticket reassigned successfully',
            data: { 
                status: 'open', 
                assigned_to: new_assignee_id,
                new_assignee_name: assigneeName
            }
        });

    } catch (error) {
        console.error('Error reassigning ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reassign ticket',
            error: error.message
        });
    }
};

// Helper function to get L2+ authorized users for an area
const getL2AuthorizedUsersForArea = async (pool, areaId) => {
    try {
        const result = await pool.request()
            .input('area_id', sql.Int, areaId)
            .query(`
                SELECT DISTINCT
                    p.PERSONNO,
                    p.PERSON_NAME,
                    p.FIRSTNAME,
                    p.LASTNAME,
                    p.EMAIL,
                    u.LineID
                FROM TicketApproval ta
                INNER JOIN Person p ON ta.personno = p.PERSONNO
                LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                WHERE ta.area_id = @area_id
                AND ta.approval_level >= 2
                AND ta.is_active = 1
                AND p.FLAGDEL != 'Y'
                AND u.LineID IS NOT NULL
                AND u.LineID != ''
            `);
        
        return result.recordset;
    } catch (error) {
        console.error('Error getting L2 authorized users for area:', error);
        return [];
    }
};

// Send delayed ticket notification with images (called after image uploads)
const sendDelayedTicketNotification = async (ticketId) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        // Get ticket information
        const ticketResult = await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .query(`
                SELECT t.*, 
                       r.PERSON_NAME as reporter_name,
                       ur.LineID as reporter_line_id,
                       r.EMAIL as reporter_email,
                       a.PERSON_NAME as assignee_name,
                       ua.LineID as assignee_line_id,
                       a.EMAIL as assignee_email,
                       pu.PUCODE, pu.PUNAME
                FROM Tickets t
                LEFT JOIN Person r ON t.reported_by = r.PERSONNO
                LEFT JOIN _secUsers ur ON r.PERSONNO = ur.PersonNo
                LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
                LEFT JOIN _secUsers ua ON a.PERSONNO = ua.PersonNo
                LEFT JOIN PU pu ON t.pu_id = pu.PUNO AND pu.FLAGDEL != 'Y'
                WHERE t.id = @ticket_id
            `);
        
        if (ticketResult.recordset.length === 0) {
            console.log(`Ticket ${ticketId} not found for delayed notification`);
            return;
        }
        
        const ticket = ticketResult.recordset[0];
        
        // Get all ticket images (before images for hero)
        const imagesResult = await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .query(`
                SELECT image_url, image_name, image_type
                FROM TicketImages 
                WHERE ticket_id = @ticket_id 
                ORDER BY uploaded_at ASC
            `);
        
        // Convert file paths to URLs
        const baseUrl = getBaseUrl();
        const ticketImages = mapImagesToLinePayload(imagesResult.recordset, baseUrl);
        
        // Get hero image (first "before" image or first image if no "before" type)
        const beforeImages = imagesResult.recordset.filter(img => img.image_type === 'before');
        const heroImageUrl = getHeroImageUrl(beforeImages.length > 0 ? beforeImages : imagesResult.recordset);
        
        // 1. Send LINE notification to requester (reporter)
        if (ticket.reporter_line_id) {
            try {
                const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.CREATED, {
                    caseNo: ticket.ticket_number,
                    assetName: ticket.PUNAME || ticket.machine_number || "Unknown Asset",
                    problem: ticket.title || "No description",
                    actionBy: ticket.reporter_name,
                    comment: "เคสใหม่ รอการยอมรับจากผู้รับผิดชอบ",
                    heroImageUrl: heroImageUrl,
                    extraKVs: [
                        { label: "Priority", value: ticket.priority || "normal" },
                        { label: "Severity", value: ticket.severity_level || "medium" }
                    ],
                    detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
                });
                await abnFlexService.pushToUser(ticket.reporter_line_id, flexMsg);
                console.log(`LINE notification sent to requester for ticket ${ticketId}`);
            } catch (reporterLineErr) {
                console.error(`Failed to send LINE notification to requester for ticket ${ticketId}:`, reporterLineErr);
            }
        }
        
        // 2. Send LINE notification to all L2+ authorized users in the area
        const l2Users = await getL2AuthorizedUsersForArea(pool, ticket.area_id);
        console.log(`Found ${l2Users.length} L2+ authorized users for area ${ticket.area_id}:`, 
            l2Users.map(u => `${u.PERSON_NAME} (${u.PERSONNO})`).join(', '));
        
        for (const user of l2Users) {
            // Skip if this is the same person as the reporter (already notified above)
            if (user.PERSONNO === ticket.reported_by) {
                console.log(`Skipping L2 notification for reporter (already notified): ${user.PERSON_NAME}`);
                continue;
            }
            
            try {
                const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.CREATED, {
                    caseNo: ticket.ticket_number,
                    assetName: ticket.PUNAME || ticket.machine_number || "Unknown Asset",
                    problem: ticket.title || "No description",
                    actionBy: ticket.reporter_name,
                    comment: "เคสใหม่ รอการยอมรับจากผู้รับผิดชอบ",
                    heroImageUrl: heroImageUrl,
                    extraKVs: [
                        { label: "Priority", value: ticket.priority || "normal" },
                        { label: "Severity", value: ticket.severity_level || "medium" }
                    ],
                    detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
                });
                await abnFlexService.pushToUser(user.LineID, flexMsg);
                console.log(`LINE notification sent to L2 user ${user.PERSON_NAME} (${user.PERSONNO}) for ticket ${ticketId}`);
            } catch (l2UserLineErr) {
                console.error(`Failed to send LINE notification to L2 user ${user.PERSON_NAME} for ticket ${ticketId}:`, l2UserLineErr);
            }
        }
        
        // 3. Send LINE notification to pre-assigned user if applicable (separate from L2 users)
        if (ticket.assigned_to && ticket.assignee_line_id) {
            // Check if assignee is already in L2 users list to avoid duplicate notifications
            const isAssigneeInL2Users = l2Users.some(user => user.PERSONNO === ticket.assigned_to);
            
            if (!isAssigneeInL2Users) {
                try {
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.CREATED, {
                        caseNo: ticket.ticket_number,
                        assetName: ticket.PUNAME || ticket.machine_number || "Unknown Asset",
                        problem: ticket.title || "No description",
                        actionBy: ticket.reporter_name,
                        comment: "เคสใหม่ - คุณได้รับมอบหมายงานนี้แล้ว",
                        heroImageUrl: heroImageUrl,
                        extraKVs: [
                            { label: "Priority", value: ticket.priority || "normal" },
                            { label: "Severity", value: ticket.severity_level || "medium" }
                        ],
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
                    });
                    
                    await abnFlexService.pushToUser(ticket.assignee_line_id, flexMsg);
                    console.log(`LINE notification sent to pre-assigned user for ticket ${ticketId}`);
                    
                } catch (assigneeLineErr) {
                    console.error(`Failed to send LINE notification to pre-assigned user for ticket ${ticketId}:`, assigneeLineErr);
                }
            } else {
                console.log(`Pre-assigned user already notified as L2 user for ticket ${ticketId}`);
            }
        }
        
    } catch (error) {
        console.error(`Error sending delayed ticket notification for ticket ${ticketId}:`, error);
        throw error;
    }
};

// Get available L2+ users for assignment
const getAvailableAssignees = async (req, res) => {
    try {
        const { search, ticket_id, escalation_only } = req.query;
        const pool = await sql.connect(dbConfig);

        // Get ticket's area_id if ticket_id is provided
        let areaFilter = '';
        let request = pool.request();
        
        if (ticket_id) {
            const ticketResult = await pool.request()
                .input('ticket_id', sql.Int, ticket_id)
                .query('SELECT area_id FROM Tickets WHERE id = @ticket_id');
            
            if (ticketResult.recordset.length > 0) {
                const areaId = ticketResult.recordset[0].area_id;
                if (areaId) {
                    // For escalation, only show L3 users (approval_level >= 3)
                    // For reassign, show L2+ users (approval_level >= 2)
                    const minApprovalLevel = escalation_only === 'true' ? 3 : 2;
                    
                    areaFilter = `AND EXISTS (
                        SELECT 1 FROM TicketApproval ta 
                        WHERE ta.personno = p.PERSONNO 
                        AND ta.area_id = @area_id 
                        AND ta.approval_level >= @min_approval_level
                    )`;
                    request.input('area_id', sql.Int, areaId);
                    request.input('min_approval_level', sql.Int, minApprovalLevel);
                }
            }
        }

        // Build search condition
        let searchCondition = '';
        if (search) {
            searchCondition = `AND (p.FIRSTNAME LIKE @search OR p.LASTNAME LIKE @search OR p.PERSON_NAME LIKE @search OR p.EMAIL LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        // Get all active persons with user groups (excluding basic Requesters)
        // Filter by area-specific approval levels if ticket_id is provided
        const result = await request.query(`
            SELECT DISTINCT
                p.PERSONNO,
                p.FIRSTNAME,
                p.LASTNAME,
                p.PERSON_NAME,
                p.EMAIL,
                p.PHONE,
                p.TITLE,
                p.DEPTNO,
                -- Get the first non-null user group name for display
                (SELECT TOP 1 vpug2.USERGROUPNAME 
                 FROM V_PERSON_USERGROUP vpug2 
                 WHERE vpug2.PERSONNO = p.PERSONNO 
                 AND vpug2.USERGROUPNAME IS NOT NULL
                 AND vpug2.USERGROUPNAME != 'Requester'
                 AND (
                     vpug2.USERGROUPNAME LIKE '%Manager%' 
                     OR vpug2.USERGROUPNAME LIKE '%Owner%'
                     OR vpug2.USERGROUPNAME LIKE '%Technician%'
                     OR vpug2.USERGROUPNAME LIKE '%Planner%'
                     OR vpug2.USERGROUPNAME LIKE '%Approval%'
                 )
                 ORDER BY vpug2.USERGROUPNAME) AS USERGROUPNAME
            FROM Person p
            WHERE p.FLAGDEL != 'Y'
            AND EXISTS (
                SELECT 1 FROM V_PERSON_USERGROUP vpug 
                WHERE vpug.PERSONNO = p.PERSONNO
                AND vpug.USERGROUPNAME IS NOT NULL
                AND vpug.USERGROUPNAME != 'Requester'
                AND (
                    vpug.USERGROUPNAME LIKE '%Manager%' 
                    OR vpug.USERGROUPNAME LIKE '%Owner%'
                    OR vpug.USERGROUPNAME LIKE '%Technician%'
                    OR vpug.USERGROUPNAME LIKE '%Planner%'
                    OR vpug.USERGROUPNAME LIKE '%Approval%'
                )
            )
            ${areaFilter}
            ${searchCondition}
            ORDER BY p.FIRSTNAME, p.LASTNAME
        `);

        const assignees = result.recordset.map(person => ({
            id: person.PERSONNO,
            name: person.PERSON_NAME || `${person.FIRSTNAME} ${person.LASTNAME}`,
            email: person.EMAIL,
            phone: person.PHONE,
            title: person.TITLE,
            department: person.DEPTNO,
            userGroup: person.USERGROUPNAME
        }));

        res.json({
            success: true,
            data: assignees
        });

    } catch (error) {
        console.error('Error fetching available assignees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available assignees',
            error: error.message
        });
    }
};

// Reopen ticket (Requestor)
const reopenTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { reopen_reason } = req.body;
        const reopened_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id');

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];

        // Check if user is the requestor
        if (ticket.reported_by !== reopened_by) {
            return res.status(403).json({
                success: false,
                message: 'Only the requestor can reopen this ticket'
            });
        }

        // Check if ticket is in completed status
        if (ticket.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Only completed tickets can be reopened'
            });
        }

        // Update ticket status to reopened with workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'reopened_in_progress')
            .input('reopened_by', sql.Int, reopened_by)
            .query(`
                UPDATE Tickets 
                SET status = @status,
                    reopened_at = GETDATE(),
                    reopened_by = @reopened_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), 'reopened_in_progress')
            .input('changed_by', sql.Int, reopened_by)
            .input('notes', sql.NVarChar(500), reopen_reason || 'Ticket reopened by requestor')
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Add status change comment
        await addStatusChangeComment(pool, id, reopened_by, ticket.status, 'reopened_in_progress', reopen_reason);

        // Send notification to assignee
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('assignee_id', sql.Int, ticket.assigned_to)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, plant_id, area_id, line_id, machine_id, machine_number
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT PERSON_NAME, EMAIL, DEPTNO
                    FROM Person WHERE PERSONNO = @assignee_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const assignee = detailResult.recordsets[1][0];
            const reopenerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            if (assignee?.EMAIL) {
                await emailService.sendTicketReopenedNotification(
                    ticketData,
                    reopenerName,
                    reopen_reason,
                    assignee.EMAIL
                );
            }

            // LINE notification
            try {
                if (assignee?.DEPTNO) {
                    // Get ticket images for FLEX message
                    const imagesResult = await pool.request()
                        .input('ticket_id', sql.Int, id)
                        .query(`
                            SELECT image_url, image_name 
                            FROM TicketImages 
                            WHERE ticket_id = @ticket_id 
                            ORDER BY uploaded_at ASC
                        `);
                    
                    const ticketImages = mapImagesToLinePayload(imagesResult.recordset);
                    
                    const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.REOPENED, {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                        problem: ticketData.title || "No description",
                        actionBy: reopenerName,
                        comment: reopen_reason || "งานถูกเปิดใหม่ กรุณาดำเนินการต่อ",
                        detailUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}`
                    });
                    await abnFlexService.pushToUser(assignee.LineID, flexMsg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE reopen notification:', lineErr);
            }
        } catch (emailErr) {
            console.error('Failed to send reopen email:', emailErr);
        }

        res.json({
            success: true,
            message: 'Ticket reopened successfully',
            data: { status: 'reopened_in_progress' }
        });

    } catch (error) {
        console.error('Error reopening ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reopen ticket',
            error: error.message
        });
    }
};

// Get user-related pending tickets
const getUserPendingTickets = async (req, res) => {
    try {
        const userId = req.user.id; // Changed from req.user.personno to req.user.id
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        // Query to get tickets related to the user:
        // 1. Tickets created by the user
        // 2. Tickets where user has approval_level > 2 for the ticket's area_id
        // Status should not be 'closed', 'completed', or 'canceled'
        const query = `
            SELECT
                t.id,
                t.ticket_number,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.severity_level,
                t.created_at,
                t.updated_at,
                t.assigned_to,
                t.reported_by,
                t.area_id,
                a.name as area_name,
                a.code as area_code,
                p.name as plant_name,
                p.code as plant_code,
                -- Creator info
                creator.FIRSTNAME + ' ' + creator.LASTNAME as creator_name,
                creator.PERSONNO as creator_id,
                -- Assignee info
                assignee.FIRSTNAME + ' ' + assignee.LASTNAME as assignee_name,
                assignee.PERSONNO as assignee_id,
                -- User's relationship to this ticket
                CASE 
                    WHEN t.reported_by = @userId THEN 'creator'
                    WHEN ta.approval_level > 2 THEN 'approver'
                    ELSE 'viewer'
                END as user_relationship,
                ta.approval_level as user_approval_level,
                -- Add priority and created_at to SELECT for ORDER BY
                CASE t.priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END as priority_order,
                t.created_at as created_at_order
            FROM Tickets t
            LEFT JOIN Area a ON a.id = t.area_id
            LEFT JOIN Plant p ON p.id = a.plant_id
            LEFT JOIN Person creator ON creator.PERSONNO = t.reported_by
            LEFT JOIN Person assignee ON assignee.PERSONNO = t.assigned_to
            LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.area_id = t.area_id
            WHERE (
                -- Tickets created by the user
                t.reported_by = @userId
                OR 
                -- Tickets where user has approval_level > 2 for the area
                (ta.approval_level > 2 AND ta.is_active = 1)
            )
            AND t.status NOT IN ('closed', 'completed', 'canceled', 'rejected_final')
            ORDER BY 
                priority_order,
                created_at_order DESC
        `;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        const tickets = result.recordset.map(ticket => ({
            id: ticket.id,
            ticket_number: ticket.ticket_number,
            title: ticket.title,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            severity_level: ticket.severity_level,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            assigned_to: ticket.assigned_to,
            reported_by: ticket.reported_by,
            area_id: ticket.area_id,
            area_name: ticket.area_name,
            area_code: ticket.area_code,
            plant_name: ticket.plant_name,
            plant_code: ticket.plant_code,
            creator_name: ticket.creator_name,
            creator_id: ticket.creator_id,
            assignee_name: ticket.assignee_name,
            assignee_id: ticket.assignee_id,
            user_relationship: ticket.user_relationship,
            user_approval_level: ticket.user_approval_level
        }));

        res.json({
            success: true,
            data: tickets,
            count: tickets.length
        });

    } catch (error) {
        console.error('Error fetching user pending tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending tickets',
            error: error.message
        });
    }
};

// Trigger LINE notification for ticket (called after image uploads)
const triggerTicketNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);

        // Verify ticket exists
        const ticketCheck = await pool.request()
            .input('ticket_id', sql.Int, id)
            .query('SELECT id FROM Tickets WHERE id = @ticket_id');

        if (ticketCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Send delayed notification with images
        await sendDelayedTicketNotification(id);
        
        res.json({
            success: true,
            message: 'LINE notification sent successfully'
        });

    } catch (error) {
        console.error('Error triggering ticket notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send LINE notification',
            error: error.message
        });
    }
};

// Get failure modes for dropdown
const getFailureModes = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .query(`
                SELECT 
                    FailureModeNo as id,
                    FailureModeCode as code,
                    FailureModeName as name
                FROM FailureModes 
                WHERE FlagDel != 'Y'
                ORDER BY FailureModeName
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching failure modes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch failure modes',
            error: error.message
        });
    }
};

// Get user ticket count per period for personal dashboard
const getUserTicketCountPerPeriod = async (req, res) => {
    try {
        const userId = req.user.id; // Get current user ID
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const {
            year = new Date().getFullYear(),
            startDate,
            endDate
        } = req.query;

        const pool = await sql.connect(dbConfig);
        
        // Build WHERE clause for user's tickets
        let whereClause = `WHERE t.reported_by = @userId AND YEAR(t.created_at) = @year`;
        
        // Add date range filter if provided
        if (startDate && endDate) {
            whereClause += ` AND t.created_at >= @startDate AND t.created_at <= @endDate`;
        }
        
        // Exclude canceled tickets
        whereClause += ` AND t.status != 'canceled'`;

        // Get tickets count per period (monthly periods P1-P12)
        const query = `
            SELECT 
                CASE 
                    WHEN MONTH(t.created_at) = 1 THEN 'P1'
                    WHEN MONTH(t.created_at) = 2 THEN 'P2'
                    WHEN MONTH(t.created_at) = 3 THEN 'P3'
                    WHEN MONTH(t.created_at) = 4 THEN 'P4'
                    WHEN MONTH(t.created_at) = 5 THEN 'P5'
                    WHEN MONTH(t.created_at) = 6 THEN 'P6'
                    WHEN MONTH(t.created_at) = 7 THEN 'P7'
                    WHEN MONTH(t.created_at) = 8 THEN 'P8'
                    WHEN MONTH(t.created_at) = 9 THEN 'P9'
                    WHEN MONTH(t.created_at) = 10 THEN 'P10'
                    WHEN MONTH(t.created_at) = 11 THEN 'P11'
                    WHEN MONTH(t.created_at) = 12 THEN 'P12'
                    ELSE 'P13'
                END as period,
                COUNT(*) as tickets
            FROM Tickets t
            ${whereClause}
            GROUP BY 
                CASE 
                    WHEN MONTH(t.created_at) = 1 THEN 'P1'
                    WHEN MONTH(t.created_at) = 2 THEN 'P2'
                    WHEN MONTH(t.created_at) = 3 THEN 'P3'
                    WHEN MONTH(t.created_at) = 4 THEN 'P4'
                    WHEN MONTH(t.created_at) = 5 THEN 'P5'
                    WHEN MONTH(t.created_at) = 6 THEN 'P6'
                    WHEN MONTH(t.created_at) = 7 THEN 'P7'
                    WHEN MONTH(t.created_at) = 8 THEN 'P8'
                    WHEN MONTH(t.created_at) = 9 THEN 'P9'
                    WHEN MONTH(t.created_at) = 10 THEN 'P10'
                    WHEN MONTH(t.created_at) = 11 THEN 'P11'
                    WHEN MONTH(t.created_at) = 12 THEN 'P12'
                    ELSE 'P13'
                END
            ORDER BY period
        `;

        // Build the request with parameters
        let request = pool.request()
            .input('userId', sql.Int, userId)
            .input('year', sql.Int, parseInt(year));
            
        if (startDate && endDate) {
            request = request
                .input('startDate', sql.DateTime, new Date(startDate))
                .input('endDate', sql.DateTime, new Date(endDate));
        }

        const result = await request.query(query);
        
        // Create a map of data by period
        const dataMap = {};
        result.recordset.forEach(row => {
            dataMap[row.period] = row.tickets;
        });

        // Generate all periods P1-P13 and fill with data or 0
        const allPeriods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13'];
        
        const responseData = allPeriods.map(period => ({
            period,
            tickets: dataMap[period] || 0,
            target: 15 // Mock target data as requested
        }));

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error in getUserTicketCountPerPeriod:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user completed ticket count per period for personal dashboard (L2+ users only)
const getUserCompletedTicketCountPerPeriod = async (req, res) => {
    try {
        const userId = req.user.id; // Get current user ID
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const {
            year = new Date().getFullYear(),
            startDate,
            endDate
        } = req.query;

        const pool = await sql.connect(dbConfig);
        
        // First, check if user has L2+ approval level in any area
        const l2CheckQuery = `
            SELECT COUNT(*) as l2_count
            FROM TicketApproval ta
            WHERE ta.personno = @userId 
            AND ta.approval_level >= 2 
            AND ta.is_active = 1
        `;
        
        const l2Result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(l2CheckQuery);
        
        if (l2Result.recordset[0].l2_count === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Requires L2+ approval level.'
            });
        }
        
        // Build WHERE clause for user's completed tickets
        let whereClause = `WHERE t.completed_by = @userId AND YEAR(t.completed_at) = @year`;
        
        // Add date range filter if provided (based on completed_at)
        if (startDate && endDate) {
            whereClause += ` AND t.completed_at >= @startDate AND t.completed_at <= @endDate`;
        }
        
        // Only include tickets with status "closed" or "completed"
        whereClause += ` AND t.status IN ('closed', 'completed')`;

        // Get completed tickets count per period (monthly periods P1-P12)
        const query = `
            SELECT 
                CASE 
                    WHEN MONTH(t.completed_at) = 1 THEN 'P1'
                    WHEN MONTH(t.completed_at) = 2 THEN 'P2'
                    WHEN MONTH(t.completed_at) = 3 THEN 'P3'
                    WHEN MONTH(t.completed_at) = 4 THEN 'P4'
                    WHEN MONTH(t.completed_at) = 5 THEN 'P5'
                    WHEN MONTH(t.completed_at) = 6 THEN 'P6'
                    WHEN MONTH(t.completed_at) = 7 THEN 'P7'
                    WHEN MONTH(t.completed_at) = 8 THEN 'P8'
                    WHEN MONTH(t.completed_at) = 9 THEN 'P9'
                    WHEN MONTH(t.completed_at) = 10 THEN 'P10'
                    WHEN MONTH(t.completed_at) = 11 THEN 'P11'
                    WHEN MONTH(t.completed_at) = 12 THEN 'P12'
                    ELSE 'P13'
                END as period,
                COUNT(*) as tickets
            FROM Tickets t
            ${whereClause}
            GROUP BY 
                CASE 
                    WHEN MONTH(t.completed_at) = 1 THEN 'P1'
                    WHEN MONTH(t.completed_at) = 2 THEN 'P2'
                    WHEN MONTH(t.completed_at) = 3 THEN 'P3'
                    WHEN MONTH(t.completed_at) = 4 THEN 'P4'
                    WHEN MONTH(t.completed_at) = 5 THEN 'P5'
                    WHEN MONTH(t.completed_at) = 6 THEN 'P6'
                    WHEN MONTH(t.completed_at) = 7 THEN 'P7'
                    WHEN MONTH(t.completed_at) = 8 THEN 'P8'
                    WHEN MONTH(t.completed_at) = 9 THEN 'P9'
                    WHEN MONTH(t.completed_at) = 10 THEN 'P10'
                    WHEN MONTH(t.completed_at) = 11 THEN 'P11'
                    WHEN MONTH(t.completed_at) = 12 THEN 'P12'
                    ELSE 'P13'
                END
            ORDER BY period
        `;

        // Build the request with parameters
        let request = pool.request()
            .input('userId', sql.Int, userId)
            .input('year', sql.Int, parseInt(year));
            
        if (startDate && endDate) {
            request = request
                .input('startDate', sql.DateTime, new Date(startDate))
                .input('endDate', sql.DateTime, new Date(endDate));
        }

        const result = await request.query(query);
        
        // Create a map of data by period
        const dataMap = {};
        result.recordset.forEach(row => {
            dataMap[row.period] = row.tickets;
        });

        // Generate all periods P1-P13 and fill with data or 0
        const allPeriods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13'];
        
        const responseData = allPeriods.map(period => ({
            period,
            tickets: dataMap[period] || 0,
            target: 10 // Mock target data for completed tickets
        }));

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error in getUserCompletedTicketCountPerPeriod:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get personal KPI data for personal dashboard (role-specific)
const getPersonalKPIData = async (req, res) => {
    try {
        const userId = req.user.id; // Get current user ID
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const {
            startDate,
            endDate,
            compare_startDate,
            compare_endDate
        } = req.query;

        const pool = await sql.connect(dbConfig);
        
        // First, check if user has L2+ approval level in any area
        const l2CheckQuery = `
            SELECT COUNT(*) as l2_count
            FROM TicketApproval ta
            WHERE ta.personno = @userId 
            AND ta.approval_level >= 2 
            AND ta.is_active = 1
        `;
        
        const l2Result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(l2CheckQuery);
        
        const isL2Plus = l2Result.recordset[0].l2_count > 0;
        
        // Get current period data - REPORTER metrics (for all users)
        const reporterMetricsQuery = `
            SELECT 
                COUNT(*) as totalReportsThisPeriod,
                SUM(CASE WHEN status IN ('closed', 'completed') THEN 1 ELSE 0 END) as resolvedReportsThisPeriod,
                SUM(CASE WHEN status NOT IN ('closed', 'completed', 'canceled') THEN 1 ELSE 0 END) as pendingReportsThisPeriod,
                SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                    COALESCE(downtime_avoidance_hours, 0) 
                ELSE 0 END) as downtimeAvoidedByReportsThisPeriod,
                SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                    COALESCE(cost_avoidance, 0) 
                ELSE 0 END) as costAvoidedByReportsThisPeriod
            FROM Tickets t
            WHERE t.reported_by = @userId
            AND t.created_at >= @startDate 
            AND t.created_at <= @endDate
        `;

        // Get comparison period data - REPORTER metrics
        const reporterComparisonQuery = `
            SELECT 
                COUNT(*) as totalReportsLastPeriod,
                SUM(CASE WHEN status IN ('closed', 'completed') THEN 1 ELSE 0 END) as resolvedReportsLastPeriod,
                SUM(CASE WHEN status NOT IN ('closed', 'completed', 'canceled') THEN 1 ELSE 0 END) as pendingReportsLastPeriod,
                SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                    COALESCE(downtime_avoidance_hours, 0) 
                ELSE 0 END) as downtimeAvoidedByReportsLastPeriod,
                SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                    COALESCE(cost_avoidance, 0) 
                ELSE 0 END) as costAvoidedByReportsLastPeriod
            FROM Tickets t
            WHERE t.reported_by = @userId
            AND t.created_at >= @compare_startDate 
            AND t.created_at <= @compare_endDate
        `;

        // Execute reporter queries
        const reporterCurrentResult = await pool.request()
            .input('userId', sql.Int, userId)
            .input('startDate', sql.DateTime, new Date(startDate))
            .input('endDate', sql.DateTime, new Date(endDate))
            .query(reporterMetricsQuery);

        const reporterComparisonResult = await pool.request()
            .input('userId', sql.Int, userId)
            .input('compare_startDate', sql.DateTime, new Date(compare_startDate))
            .input('compare_endDate', sql.DateTime, new Date(compare_endDate))
            .query(reporterComparisonQuery);

        const reporterCurrentData = reporterCurrentResult.recordset[0];
        const reporterComparisonData = reporterComparisonResult.recordset[0];

        let actionPersonData = null;
        let actionPersonComparisonData = null;

        // If L2+, get ACTION PERSON metrics
        if (isL2Plus) {
            const actionPersonMetricsQuery = `
                SELECT 
                    COUNT(*) as totalCasesFixedThisPeriod,
                    SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                        COALESCE(downtime_avoidance_hours, 0) 
                    ELSE 0 END) as downtimeAvoidedByFixesThisPeriod,
                    SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                        COALESCE(cost_avoidance, 0) 
                    ELSE 0 END) as costAvoidedByFixesThisPeriod
                FROM Tickets t
                WHERE t.completed_by = @userId
                AND t.completed_at >= @startDate 
                AND t.completed_at <= @endDate
            `;

            const actionPersonComparisonQuery = `
                SELECT 
                    COUNT(*) as totalCasesFixedLastPeriod,
                    SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                        COALESCE(downtime_avoidance_hours, 0) 
                    ELSE 0 END) as downtimeAvoidedByFixesLastPeriod,
                    SUM(CASE WHEN status IN ('closed', 'completed') THEN 
                        COALESCE(cost_avoidance, 0) 
                    ELSE 0 END) as costAvoidedByFixesLastPeriod
                FROM Tickets t
                WHERE t.completed_by = @userId
                AND t.completed_at >= @compare_startDate 
                AND t.completed_at <= @compare_endDate
            `;

            const actionPersonCurrentResult = await pool.request()
                .input('userId', sql.Int, userId)
                .input('startDate', sql.DateTime, new Date(startDate))
                .input('endDate', sql.DateTime, new Date(endDate))
                .query(actionPersonMetricsQuery);

            const actionPersonComparisonResult = await pool.request()
                .input('userId', sql.Int, userId)
                .input('compare_startDate', sql.DateTime, new Date(compare_startDate))
                .input('compare_endDate', sql.DateTime, new Date(compare_endDate))
                .query(actionPersonComparisonQuery);

            actionPersonData = actionPersonCurrentResult.recordset[0];
            actionPersonComparisonData = actionPersonComparisonResult.recordset[0];
        }

        // Calculate growth rates
        const calculateGrowthRate = (current, previous) => {
            if (previous === 0) {
                return current > 0 ? 100 : 0;
            }
            return ((current - previous) / previous) * 100;
        };

        // Reporter growth rates
        const reportGrowthRate = calculateGrowthRate(
            reporterCurrentData.totalReportsThisPeriod, 
            reporterComparisonData.totalReportsLastPeriod
        );

        const resolvedReportsGrowthRate = calculateGrowthRate(
            reporterCurrentData.resolvedReportsThisPeriod, 
            reporterComparisonData.resolvedReportsLastPeriod
        );

        const downtimeAvoidedByReportsGrowth = calculateGrowthRate(
            reporterCurrentData.downtimeAvoidedByReportsThisPeriod, 
            reporterComparisonData.downtimeAvoidedByReportsLastPeriod
        );

        const costAvoidedByReportsGrowth = calculateGrowthRate(
            reporterCurrentData.costAvoidedByReportsThisPeriod, 
            reporterComparisonData.costAvoidedByReportsLastPeriod
        );

        // Calculate impact score (combination of metrics)
        const reporterImpactScore = Math.round(
            (reporterCurrentData.resolvedReportsThisPeriod / Math.max(reporterCurrentData.totalReportsThisPeriod, 1)) * 100
        );

        let actionPersonGrowthRates = null;
        let actionPersonImpactScore = null;

        if (isL2Plus && actionPersonData) {
            actionPersonGrowthRates = {
                casesFixedGrowthRate: calculateGrowthRate(
                    actionPersonData.totalCasesFixedThisPeriod, 
                    actionPersonComparisonData.totalCasesFixedLastPeriod
                ),
                downtimeAvoidedByFixesGrowth: calculateGrowthRate(
                    actionPersonData.downtimeAvoidedByFixesThisPeriod, 
                    actionPersonComparisonData.downtimeAvoidedByFixesLastPeriod
                ),
                costAvoidedByFixesGrowth: calculateGrowthRate(
                    actionPersonData.costAvoidedByFixesThisPeriod, 
                    actionPersonComparisonData.costAvoidedByFixesLastPeriod
                )
            };

            actionPersonImpactScore = Math.round(
                (actionPersonData.totalCasesFixedThisPeriod / Math.max(reporterCurrentData.totalReportsThisPeriod, 1)) * 100
            );
        }

        const response = {
            success: true,
            data: {
                userRole: isL2Plus ? 'L2+' : 'L1',
                reporterMetrics: {
                    totalReportsThisPeriod: reporterCurrentData.totalReportsThisPeriod || 0,
                    resolvedReportsThisPeriod: reporterCurrentData.resolvedReportsThisPeriod || 0,
                    pendingReportsThisPeriod: reporterCurrentData.pendingReportsThisPeriod || 0,
                    downtimeAvoidedByReportsThisPeriod: reporterCurrentData.downtimeAvoidedByReportsThisPeriod || 0,
                    costAvoidedByReportsThisPeriod: reporterCurrentData.costAvoidedByReportsThisPeriod || 0,
                    impactScore: reporterImpactScore
                },
                actionPersonMetrics: isL2Plus ? {
                    totalCasesFixedThisPeriod: actionPersonData.totalCasesFixedThisPeriod || 0,
                    downtimeAvoidedByFixesThisPeriod: actionPersonData.downtimeAvoidedByFixesThisPeriod || 0,
                    costAvoidedByFixesThisPeriod: actionPersonData.costAvoidedByFixesThisPeriod || 0,
                    impactScore: actionPersonImpactScore
                } : null,
                summary: {
                    reporterComparisonMetrics: {
                        reportGrowthRate: {
                            percentage: reportGrowthRate,
                            description: `${reportGrowthRate >= 0 ? '+' : ''}${reportGrowthRate.toFixed(1)}% from last period`,
                            type: reportGrowthRate > 0 ? 'increase' : reportGrowthRate < 0 ? 'decrease' : 'no_change'
                        },
                        resolvedReportsGrowthRate: {
                            percentage: resolvedReportsGrowthRate,
                            description: `${resolvedReportsGrowthRate >= 0 ? '+' : ''}${resolvedReportsGrowthRate.toFixed(1)}% from last period`,
                            type: resolvedReportsGrowthRate > 0 ? 'increase' : resolvedReportsGrowthRate < 0 ? 'decrease' : 'no_change'
                        },
                        downtimeAvoidedByReportsGrowth: {
                            percentage: downtimeAvoidedByReportsGrowth,
                            description: `${downtimeAvoidedByReportsGrowth >= 0 ? '+' : ''}${downtimeAvoidedByReportsGrowth.toFixed(1)}% from last period`,
                            type: downtimeAvoidedByReportsGrowth > 0 ? 'increase' : downtimeAvoidedByReportsGrowth < 0 ? 'decrease' : 'no_change'
                        },
                        costAvoidedByReportsGrowth: {
                            percentage: costAvoidedByReportsGrowth,
                            description: `${costAvoidedByReportsGrowth >= 0 ? '+' : ''}${costAvoidedByReportsGrowth.toFixed(1)}% from last period`,
                            type: costAvoidedByReportsGrowth > 0 ? 'increase' : costAvoidedByReportsGrowth < 0 ? 'decrease' : 'no_change'
                        }
                    },
                    actionPersonComparisonMetrics: actionPersonGrowthRates ? {
                        casesFixedGrowthRate: {
                            percentage: actionPersonGrowthRates.casesFixedGrowthRate,
                            description: `${actionPersonGrowthRates.casesFixedGrowthRate >= 0 ? '+' : ''}${actionPersonGrowthRates.casesFixedGrowthRate.toFixed(1)}% from last period`,
                            type: actionPersonGrowthRates.casesFixedGrowthRate > 0 ? 'increase' : actionPersonGrowthRates.casesFixedGrowthRate < 0 ? 'decrease' : 'no_change'
                        },
                        downtimeAvoidedByFixesGrowth: {
                            percentage: actionPersonGrowthRates.downtimeAvoidedByFixesGrowth,
                            description: `${actionPersonGrowthRates.downtimeAvoidedByFixesGrowth >= 0 ? '+' : ''}${actionPersonGrowthRates.downtimeAvoidedByFixesGrowth.toFixed(1)}% from last period`,
                            type: actionPersonGrowthRates.downtimeAvoidedByFixesGrowth > 0 ? 'increase' : actionPersonGrowthRates.downtimeAvoidedByFixesGrowth < 0 ? 'decrease' : 'no_change'
                        },
                        costAvoidedByFixesGrowth: {
                            percentage: actionPersonGrowthRates.costAvoidedByFixesGrowth,
                            description: `${actionPersonGrowthRates.costAvoidedByFixesGrowth >= 0 ? '+' : ''}${actionPersonGrowthRates.costAvoidedByFixesGrowth.toFixed(1)}% from last period`,
                            type: actionPersonGrowthRates.costAvoidedByFixesGrowth > 0 ? 'increase' : actionPersonGrowthRates.costAvoidedByFixesGrowth < 0 ? 'decrease' : 'no_change'
                        }
                    } : null
                }
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Error in getPersonalKPIData:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    createTicket,
    getTickets,
    getTicketById,
    getFailureModes,
    updateTicket,
    addComment,
    assignTicket,
    deleteTicket,
    uploadTicketImage,
    uploadTicketImages,
    deleteTicketImage,
    acceptTicket,
    rejectTicket,
    completeJob,
    escalateTicket,
    closeTicket,
    reopenTicket,
    reassignTicket,
    getAvailableAssignees,
    sendDelayedTicketNotification,
    getUserPendingTickets,
    getUserTicketCountPerPeriod,
    getUserCompletedTicketCountPerPeriod,
    getPersonalKPIData,
    triggerTicketNotification
};
