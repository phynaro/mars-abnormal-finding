const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const emailService = require('../services/emailService');
const lineService = require('../services/lineService');
const fs = require('fs');
const path = require('path');

// Generate unique ticket number
const generateTicketNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TKT-${timestamp}-${random}`;
};

// Create a new ticket
const createTicket = async (req, res) => {
    try {
        const {
            title,
            description,
            machine_id,
            area_id,
            equipment_id,
            affected_point_type,
            affected_point_name,
            severity_level,
            priority,
            estimated_downtime_hours,
            suggested_assignee_id  // New field for pre-selecting assignee
        } = req.body;

        const reported_by = req.user.id; // From auth middleware
        const ticket_number = generateTicketNumber();

        const pool = await sql.connect(dbConfig);
        
        // Validate suggested assignee has L2+ permissions if provided
        let validatedAssigneeId = null;
        if (suggested_assignee_id) {
            const assigneeCheck = await pool.request()
                .input('assignee_id', sql.Int, suggested_assignee_id)
                .query(`
                    SELECT UserID, FirstName, LastName, Email, LineID 
                    FROM Users 
                    WHERE UserID = @assignee_id AND IsActive = 1
                `);
            
            if (assigneeCheck.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Suggested assignee not found or inactive'
                });
            }
            
            validatedAssigneeId = suggested_assignee_id;
        }
        
        const result = await pool.request()
            .input('ticket_number', sql.VarChar(20), ticket_number)
            .input('title', sql.NVarChar(255), title)
            .input('description', sql.NVarChar(sql.MAX), description)
            .input('machine_id', sql.Int, machine_id)
            .input('area_id', sql.Int, area_id)
            .input('equipment_id', sql.Int, equipment_id)
            .input('affected_point_type', sql.VarChar(50), affected_point_type)
            .input('affected_point_name', sql.NVarChar(255), affected_point_name)
            .input('severity_level', sql.VarChar(20), severity_level || 'medium')
            .input('priority', sql.VarChar(20), priority || 'normal')
            .input('estimated_downtime_hours', sql.Decimal(5,2), estimated_downtime_hours)
            .input('reported_by', sql.Int, reported_by)
            .input('assigned_to', sql.Int, validatedAssigneeId)
            .query(`
                INSERT INTO Tickets (
                    ticket_number, title, description, machine_id, area_id, equipment_id,
                    affected_point_type, affected_point_name, severity_level, priority,
                    estimated_downtime_hours, reported_by, assigned_to
                ) VALUES (
                    @ticket_number, @title, @description, @machine_id, @area_id, @equipment_id,
                    @affected_point_type, @affected_point_name, @severity_level, @priority,
                    @estimated_downtime_hours, @reported_by, @assigned_to
                );
                SELECT SCOPE_IDENTITY() as id;
            `);

        const ticketId = result.recordset[0].id;

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('new_status', sql.VarChar(20), 'open')
            .input('changed_by', sql.Int, reported_by)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, new_status, changed_by)
                VALUES (@ticket_id, @new_status, @changed_by)
            `);

        // Send email notification (for demo, sending to phynaro@hotmail.com)
        try {
            // Get reporter name for the email
            const reporterResult = await pool.request()
                .input('user_id', sql.Int, reported_by)
                .query(`
                    SELECT FirstName + ' ' + LastName as full_name, LineID, Email
                    FROM Users 
                    WHERE UserID = @user_id
                `);
            
            const reporterRow = reporterResult.recordset[0] || {};
            const reporterName = reporterRow.full_name || 'Unknown User';
            
            // Get assignee info if ticket was pre-assigned
            let assigneeInfo = null;
            if (validatedAssigneeId) {
                const assigneeResult = await pool.request()
                    .input('assignee_id', sql.Int, validatedAssigneeId)
                    .query(`
                        SELECT FirstName + ' ' + LastName as full_name, LineID, Email
                        FROM Users 
                        WHERE UserID = @assignee_id
                    `);
                assigneeInfo = assigneeResult.recordset[0] || {};
            }
            
            // Prepare ticket data for email
            const ticketDataForEmail = {
                id: ticketId,
                ticket_number: ticket_number,
                title,
                description,
                machine_id,
                area_id,
                equipment_id,
                affected_point_type,
                affected_point_name,
                severity_level: severity_level || 'medium',
                priority: priority || 'normal',
                estimated_downtime_hours,
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

            // Defer LINE notifications until after images are uploaded to avoid duplicates
            console.log('Ticket created successfully. Deferring LINE notifications until images upload.');
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
            search
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
            whereClause += ' AND (t.title LIKE @search OR t.description LIKE @search OR t.affected_point_name LIKE @search)';
            params.push({ name: 'search', value: `%${search}%`, type: sql.NVarChar(255) });
        }

        // Build the request with parameters
        let request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });

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
                r.FirstName + ' ' + r.LastName as reporter_name,
                r.Email as reporter_email,
                a.FirstName + ' ' + a.LastName as assignee_name,
                a.Email as assignee_email
            FROM Tickets t
            LEFT JOIN Users r ON t.reported_by = r.UserID
            LEFT JOIN Users a ON t.assigned_to = a.UserID
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
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    t.*,
                    r.FirstName + ' ' + r.LastName as reporter_name,
                    r.Email as reporter_email,
                    a.FirstName + ' ' + a.LastName as assignee_name,
                    a.Email as assignee_email
                FROM Tickets t
                LEFT JOIN Users r ON t.reported_by = r.UserID
                LEFT JOIN Users a ON t.assigned_to = a.UserID
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
                    u.FirstName + ' ' + u.LastName as user_name,
                    u.Email as user_email
                FROM TicketComments tc
                LEFT JOIN Users u ON tc.user_id = u.UserID
                WHERE tc.ticket_id = @ticket_id 
                ORDER BY tc.created_at
            `);

        // Get status history
        const historyResult = await pool.request()
            .input('ticket_id', sql.Int, id)
            .query(`
                SELECT 
                    tsh.*,
                    u.FirstName + ' ' + u.LastName as changed_by_name
                FROM TicketStatusHistory tsh
                LEFT JOIN Users u ON tsh.changed_by = u.UserID
                WHERE tsh.ticket_id = @ticket_id 
                ORDER BY tsh.changed_at
            `);

        const ticket = result.recordset[0];
        ticket.images = imagesResult.recordset;
        ticket.comments = commentsResult.recordset;
        ticket.status_history = historyResult.recordset;

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
        let request = pool.request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });

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
                            t.affected_point_type, t.affected_point_name
                        FROM Tickets t
                        WHERE t.id = @ticket_id;

                        SELECT FirstName + ' ' + LastName as full_name, Email, LineID 
                        FROM Users 
                        WHERE UserID = @reporter_id;
                    `);

                const ticketData = detailResult.recordsets[0][0];
                const reporter = detailResult.recordsets[1][0];
                const changedByName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

                if (reporter?.Email) {
                    await emailService.sendTicketStatusUpdateNotification(
                        ticketData,
                        oldStatus,
                        updateData.status,
                        changedByName,
                        reporter.Email
                    );
                }

                // LINE push to reporter
                try {
                    if (reporter?.LineID) {
                        const msg = lineService.buildStatusUpdateMessage(ticketData, oldStatus, updateData.status, changedByName);
                        await lineService.pushToUser(reporter.LineID, msg);
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

        // Update ticket assignment
        await pool.request()
            .input('id', sql.Int, id)
            .input('assigned_to', sql.Int, assigned_to)
            .input('assigned_by', sql.Int, assigned_by)
            .input('notes', sql.NVarChar(500), notes)
            .query(`
                UPDATE Tickets SET assigned_to = @assigned_to, updated_at = GETDATE() WHERE id = @id;
                INSERT INTO TicketAssignments (ticket_id, assigned_to, assigned_by, notes)
                VALUES (@id, @assigned_to, @assigned_by, @notes)
            `);

        // Update status to assigned if it was open
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE Tickets 
                SET status = 'assigned', updated_at = GETDATE()
                WHERE id = @id AND status = 'open'
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('new_status', sql.VarChar(20), 'assigned')
            .input('changed_by', sql.Int, assigned_by)
            .input('notes', sql.NVarChar(500), `Ticket assigned to user ID: ${assigned_to}`)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, new_status, changed_by, notes)
                VALUES (@ticket_id, @new_status, @changed_by, @notes)
            `);

        // Send assignment notification to assignee
        try {
            // Get ticket details and assignee info
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('assignee_id', sql.Int, assigned_to)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @assignee_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const assignee = detailResult.recordsets[1][0];

            if (assignee?.Email) {
                await emailService.sendTicketAssignmentNotification(
                    ticketData,
                    assignee.full_name || 'Assignee',
                    assignee.Email
                );
            }

            // LINE push to assignee
            try {
                if (assignee?.LineID) {
                    const msg = lineService.buildAssignmentMessage(ticketData);
                    await lineService.pushToUser(assignee.LineID, msg);
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
                INSERT INTO TicketImages (ticket_id, image_type, image_url, image_name, uploaded_by)
                VALUES (@ticket_id, @image_type, @image_url, @image_name, @uploaded_by);
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
                uploaded_at: new Date(),
                uploaded_by: user_id
            }
        });

        // Send delayed LINE notification with images after upload
        try {
            await sendDelayedTicketNotification(parseInt(id, 10));
        } catch (notificationErr) {
            console.error('Failed to send delayed LINE notification:', notificationErr);
            // Don't fail the upload if notification fails
        }
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
                    INSERT INTO TicketImages (ticket_id, image_type, image_url, image_name, uploaded_by)
                    VALUES (@ticket_id, @image_type, @image_url, @image_name, @uploaded_by);
                    SELECT SCOPE_IDENTITY() as id;
                `);
            inserted.push({
                id: result.recordset[0].id,
                ticket_id: parseInt(id, 10),
                image_type,
                image_url: relativePath,
                image_name: file.originalname,
                uploaded_at: new Date(),
                uploaded_by: user_id
            });
        }

        res.status(201).json({
            success: true,
            message: 'Images uploaded successfully',
            data: inserted
        });

        // Send delayed LINE notification with images after batch upload
        try {
            await sendDelayedTicketNotification(parseInt(id, 10));
        } catch (notificationErr) {
            console.error('Failed to send delayed LINE notification:', notificationErr);
            // Don't fail the upload if notification fails
        }
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
            .query('SELECT reported_by, assigned_to FROM Tickets WHERE id = @ticket_id');
        const ticketRow = ticketResult.recordset[0];
        const isOwner = ticketRow && (ticketRow.reported_by === req.user.id || ticketRow.assigned_to === req.user.id);
        const isL2Plus = (req.user.permissionLevel || 0) >= 2; // L2 or L3
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
        const { notes } = req.body;
        const accepted_by = req.user.id;
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

        // Update ticket status and assign to acceptor
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), newStatus)
            .input('assigned_to', sql.Int, accepted_by)
            .input('updated_at', sql.DateTime2, new Date())
            .query(`
                UPDATE Tickets 
                SET status = @status, assigned_to = @assigned_to, updated_at = @updated_at
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

        // Send notification to requestor
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @reporter_id;
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
                    const msg = lineService.buildTicketAcceptedMessage(ticketData, acceptorName);
                    await lineService.pushToUser(reporter.LineID, msg);
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

        // Get current ticket status
        const currentTicket = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT status, reported_by FROM Tickets WHERE id = @id');

        if (currentTicket.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = currentTicket.recordset[0];
        let newStatus = 'rejected_final';
        let statusNotes = 'Ticket rejected';

        // Handle different rejection scenarios
        if (escalate_to_l3 && req.user.permissionLevel < 3) {
            // L2 rejecting and escalating to L3
            newStatus = 'rejected_pending_l3_review';
            statusNotes = 'Ticket rejected by L2, escalated to L3 for review';
        } else if (req.user.permissionLevel >= 3) {
            // L3 rejecting (final)
            newStatus = 'rejected_final';
            statusNotes = 'Ticket rejected by L3 (final decision)';
        }

        // Update ticket status and rejection reason
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), newStatus)
            .input('rejection_reason', sql.NVarChar(500), rejection_reason)
            .input('updated_at', sql.DateTime2, new Date())
            .query(`
                UPDATE Tickets 
                SET status = @status, rejection_reason = @rejection_reason, updated_at = @updated_at
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

        // Send notification to requestor
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @reporter_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const reporter = detailResult.recordsets[1][0];
            const rejectorName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            if (reporter?.Email) {
                await emailService.sendTicketRejectedNotification(
                    ticketData,
                    rejectorName,
                    rejection_reason,
                    newStatus,
                    reporter.Email
                );
            }

            // LINE notification
            try {
                if (reporter?.LineID) {
                    const msg = lineService.buildTicketRejectedMessage(ticketData, rejectorName, rejection_reason, newStatus);
                    await lineService.pushToUser(reporter.LineID, msg);
                }
            } catch (lineErr) {
                console.error('Failed to send LINE rejection notification:', lineErr);
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
        const { completion_notes, actual_downtime_hours } = req.body;
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

        // Update ticket status to completed
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'completed')
            .input('actual_downtime_hours', sql.Decimal(5,2), actual_downtime_hours)
            .input('resolved_at', sql.DateTime2, new Date())
            .input('updated_at', sql.DateTime2, new Date())
            .query(`
                UPDATE Tickets 
                SET status = @status, actual_downtime_hours = @actual_downtime_hours, 
                    resolved_at = @resolved_at, updated_at = @updated_at
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

        // Send notification to requestor
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @reporter_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const reporter = detailResult.recordsets[1][0];
            const completerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            if (reporter?.Email) {
                await emailService.sendJobCompletedNotification(
                    ticketData,
                    completerName,
                    completion_notes,
                    actual_downtime_hours,
                    reporter.Email
                );
            }

            // LINE notification
            try {
                if (reporter?.LineID) {
                    const msg = lineService.buildJobCompletedMessage(ticketData, completerName, completion_notes, actual_downtime_hours);
                    await lineService.pushToUser(reporter.LineID, msg);
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
            data: { status: 'completed', actual_downtime_hours }
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

        // Update ticket status to escalated
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'escalated')
            .input('escalated_to', sql.Int, escalated_to)
            .input('escalation_reason', sql.NVarChar(500), escalation_reason)
            .input('updated_at', sql.DateTime2, new Date())
            .query(`
                UPDATE Tickets 
                SET status = @status, escalated_to = @escalated_to, 
                    escalation_reason = @escalation_reason, updated_at = @updated_at
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

        // Send notification to L3 and requestor
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('reporter_id', sql.Int, ticket.reported_by)
                .input('escalated_to_id', sql.Int, escalated_to)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @reporter_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @escalated_to_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const reporter = detailResult.recordsets[1][0];
            const escalatedTo = detailResult.recordsets[2][0];
            const escalatorName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            // Notify L3
            if (escalatedTo?.Email) {
                await emailService.sendTicketEscalatedNotification(
                    ticketData,
                    escalatorName,
                    escalation_reason,
                    escalatedTo.Email
                );
            }

            // Notify requestor
            if (reporter?.Email) {
                await emailService.sendTicketEscalatedToRequestorNotification(
                    ticketData,
                    escalatorName,
                    escalation_reason,
                    reporter.Email
                );
            }

            // LINE notifications
            try {
                if (escalatedTo?.LineID) {
                    const msg = lineService.buildTicketEscalatedMessage(ticketData, escalatorName, escalation_reason);
                    await lineService.pushToUser(escalatedTo.LineID, msg);
                }
                if (reporter?.LineID) {
                    const msg = lineService.buildTicketEscalatedToRequestorMessage(ticketData, escalatorName, escalation_reason);
                    await lineService.pushToUser(reporter.LineID, msg);
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

        // Update ticket status to closed
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'closed')
            .input('closed_at', sql.DateTime2, new Date())
            .input('updated_at', sql.DateTime2, new Date())
            .query(`
                UPDATE Tickets 
                SET status = @status, closed_at = @closed_at, updated_at = @updated_at
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

        // Send notification to assignee
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('assignee_id', sql.Int, ticket.assigned_to)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @assignee_id;
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
                    const msg = lineService.buildTicketClosedMessage(ticketData, closerName, close_reason, satisfaction_rating);
                    await lineService.pushToUser(assignee.LineID, msg);
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
            data: { status: 'closed', closed_at: new Date() }
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
        const { new_assignee_id, reassignment_reason } = req.body;
        const reassigned_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Check if user has L3 permissions
        if ((req.user.permissionLevel || 0) < 3) {
            return res.status(403).json({
                success: false,
                message: 'Only L3 managers can reassign tickets'
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

        // Check if ticket is in a state that allows reassignment
        if (!['rejected_pending_l3_review', 'escalated'].includes(ticket.status)) {
            return res.status(400).json({
                success: false,
                message: 'Ticket must be in rejected_pending_l3_review or escalated status to be reassigned'
            });
        }

        // Validate new assignee
        const assigneeCheck = await pool.request()
            .input('assignee_id', sql.Int, new_assignee_id)
            .query(`
                SELECT UserID, FirstName, LastName, Email, LineID 
                FROM Users 
                WHERE UserID = @assignee_id AND IsActive = 1
            `);
        
        if (assigneeCheck.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'New assignee not found or inactive'
            });
        }

        const newAssignee = assigneeCheck.recordset[0];

        // Update ticket assignment and status
        await pool.request()
            .input('id', sql.Int, id)
            .input('new_assignee_id', sql.Int, new_assignee_id)
            .input('status', sql.VarChar(50), 'open')
            .input('updated_at', sql.DateTime2, new Date())
            .query(`
                UPDATE Tickets 
                SET assigned_to = @new_assignee_id, status = @status, updated_at = @updated_at
                WHERE id = @id
            `);

        // Log status change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('old_status', sql.VarChar(50), ticket.status)
            .input('new_status', sql.VarChar(50), 'open')
            .input('changed_by', sql.Int, reassigned_by)
            .input('notes', sql.NVarChar(500), `Ticket reassigned to ${newAssignee.FirstName} ${newAssignee.LastName}: ${reassignment_reason || 'Reassigned by L3'}`)
            .query(`
                INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, notes)
                VALUES (@ticket_id, @old_status, @new_status, @changed_by, @notes)
            `);

        // Log assignment change
        await pool.request()
            .input('ticket_id', sql.Int, id)
            .input('assigned_to', sql.Int, new_assignee_id)
            .input('assigned_by', sql.Int, reassigned_by)
            .input('notes', sql.NVarChar(500), `Reassigned by L3: ${reassignment_reason || 'Ticket reassigned'}`)
            .query(`
                INSERT INTO TicketAssignments (ticket_id, assigned_to, assigned_by, notes)
                VALUES (@ticket_id, @assigned_to, @assigned_by, @notes)
            `);

        // Send notification to new assignee
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id
                `);

            const ticketData = detailResult.recordset[0];
            const reassignerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            if (newAssignee.Email) {
                await emailService.sendTicketReassignedNotification(
                    ticketData,
                    reassignerName,
                    reassignment_reason,
                    newAssignee.Email
                );
            }

            // LINE notification
            try {
                if (newAssignee.LineID) {
                    const msg = lineService.buildTicketReassignedMessage(ticketData, reassignerName, reassignment_reason);
                    await lineService.pushToUser(newAssignee.LineID, msg);
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
                new_assignee_name: `${newAssignee.FirstName} ${newAssignee.LastName}`
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

// Send delayed ticket notification with images (called after image uploads)
const sendDelayedTicketNotification = async (ticketId) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        // Get ticket information
        const ticketResult = await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .query(`
                SELECT t.*, 
                       r.FirstName + ' ' + r.LastName as reporter_name,
                       r.LineID as reporter_line_id,
                       r.Email as reporter_email,
                       a.FirstName + ' ' + a.LastName as assignee_name,
                       a.LineID as assignee_line_id,
                       a.Email as assignee_email
                FROM Tickets t
                LEFT JOIN Users r ON t.reported_by = r.UserID
                LEFT JOIN Users a ON t.assigned_to = a.UserID
                WHERE t.id = @ticket_id
            `);
        
        if (ticketResult.recordset.length === 0) {
            console.log(`Ticket ${ticketId} not found for delayed notification`);
            return;
        }
        
        const ticket = ticketResult.recordset[0];
        
        // Get all ticket images
        const imagesResult = await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .query(`
                SELECT image_url, image_name 
                FROM TicketImages 
                WHERE ticket_id = @ticket_id 
                ORDER BY uploaded_at ASC
            `);
        
        // Convert file paths to URLs
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        const ticketImages = imagesResult.recordset.map(img => ({
            url: `${baseUrl}${img.image_url}`,
            filename: img.image_name
        }));
        
        // Send LINE notification to pre-assigned user if applicable
        if (ticket.assigned_to && ticket.assignee_line_id) {
            try {
                const msg = lineService.buildTicketPreAssignedWithImagesMessage(ticket, ticket.reporter_name, ticketImages);
                
                // Log detailed image status for debugging
                if (ticketImages.length > 0) {
                    const debugInfo = lineService.debugImageAccessibility(ticketImages);
                    console.log(`Delayed LINE notification for ticket ${ticketId}:`, JSON.stringify(debugInfo, null, 2));
                }
                
                await lineService.pushToUser(ticket.assignee_line_id, msg);
                console.log(`Delayed LINE notification sent to assignee for ticket ${ticketId}`);
                
            } catch (assigneeLineErr) {
                console.error(`Failed to send delayed LINE notification to assignee for ticket ${ticketId}:`, assigneeLineErr);
            }
        }
        
        // Send LINE notification to reporter with images (if accessible)
        if (ticket.reporter_line_id) {
            try {
                const accessible = lineService.getAccessibleImages(ticketImages);
                const text = lineService.buildTicketCreatedMessage(ticket, ticket.reporter_name);
                const imageMsgs = lineService.buildImageMessages(accessible);
                const messagePayload = imageMsgs.length > 0 ? { text, images: imageMsgs } : text;
                await lineService.pushToUser(ticket.reporter_line_id, messagePayload);
                console.log(`Delayed LINE notification sent to reporter for ticket ${ticketId} with ${imageMsgs.length} images`);
            } catch (reporterLineErr) {
                console.error(`Failed to send delayed LINE notification to reporter for ticket ${ticketId}:`, reporterLineErr);
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
        const pool = await sql.connect(dbConfig);

        // Get all active users with L2+ permissions
        const result = await pool.request()
            .query(`
                SELECT 
                    u.UserID,
                    u.FirstName,
                    u.LastName,
                    u.Email,
                    u.Department,
                    u.EmployeeID,
                    r.RoleName,
                    r.PermissionLevel
                FROM Users u
                LEFT JOIN Roles r ON u.RoleID = r.RoleID
                WHERE u.IsActive = 1 
                AND r.PermissionLevel >= 2
                ORDER BY u.FirstName, u.LastName
            `);

        const assignees = result.recordset.map(user => ({
            id: user.UserID,
            name: `${user.FirstName} ${user.LastName}`,
            email: user.Email,
            department: user.Department,
            employeeId: user.EmployeeID,
            role: user.RoleName,
            permissionLevel: user.PermissionLevel
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

        // Update ticket status to reopened
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'reopened_in_progress')
            .input('updated_at', sql.DateTime2, new Date())
            .query(`
                UPDATE Tickets 
                SET status = @status, updated_at = @updated_at
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

        // Send notification to assignee
        try {
            const detailResult = await pool.request()
                .input('ticket_id', sql.Int, id)
                .input('assignee_id', sql.Int, ticket.assigned_to)
                .query(`
                    SELECT id, ticket_number, title, severity_level, priority, affected_point_type, affected_point_name
                    FROM Tickets WHERE id = @ticket_id;

                    SELECT FirstName + ' ' + LastName as full_name, Email, LineID
                    FROM Users WHERE UserID = @assignee_id;
                `);

            const ticketData = detailResult.recordsets[0][0];
            const assignee = detailResult.recordsets[1][0];
            const reopenerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

            if (assignee?.Email) {
                await emailService.sendTicketReopenedNotification(
                    ticketData,
                    reopenerName,
                    reopen_reason,
                    assignee.Email
                );
            }

            // LINE notification
            try {
                if (assignee?.LineID) {
                    const msg = lineService.buildTicketReopenedMessage(ticketData, reopenerName, reopen_reason);
                    await lineService.pushToUser(assignee.LineID, msg);
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

module.exports = {
    createTicket,
    getTickets,
    getTicketById,
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
    sendDelayedTicketNotification
};
