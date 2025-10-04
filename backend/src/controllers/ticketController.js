const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const emailService = require('../services/emailService');
const abnFlexService = require('../services/abnormalFindingFlexService');
const fs = require('fs');
const path = require('path');

const {
    addStatusChangeComment,
    checkUserActionPermission,
    createSqlRequest,
    firstRecord,
    formatPersonName,
    generateTicketNumber,
    getBackendBaseUrl,
    getHeroImageUrl,
    getTicketDetailUrl,
    getTicketNotificationRecipients,
    getUserDisplayNameFromRequest,
    getUserMaxApprovalLevelForPU,
    getAvailableAssigneesForPU,
    insertStatusHistory,
    mapImagesToLinePayload,
    mapRecordset,
    safeSendEmail,
    safeSendLineNotification,
    runQuery
} = require('./ticketController/helpers');

// Create a new ticket
const createTicket = async (req, res) => {
    const fsPromises = fs.promises;

    try {
        const rawBody = req.body ? { ...req.body } : {};
        if (typeof rawBody.payload === 'string') {
            try {
                const parsedPayload = JSON.parse(rawBody.payload);
                Object.assign(rawBody, parsedPayload);
            } catch (parseErr) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ticket payload format',
                    error: parseErr.message
                });
            }
            delete rawBody.payload;
        }

        const parseOptionalInt = (value) => {
            if (value === undefined || value === null || value === '') return null;
            if (typeof value === 'number') {
                return Number.isNaN(value) ? null : value;
            }
            const parsed = parseInt(value, 10);
            return Number.isNaN(parsed) ? null : parsed;
        };

        const title = typeof rawBody.title === 'string' ? rawBody.title : rawBody.title?.toString?.();
        const description = typeof rawBody.description === 'string' ? rawBody.description : rawBody.description?.toString?.();
        const pucode = typeof rawBody.pucode === 'string' ? rawBody.pucode : rawBody.pucode?.toString?.();
        const puno = parseOptionalInt(rawBody.puno);
        const equipmentIdInput = parseOptionalInt(rawBody.equipment_id);
        const severityLevel = typeof rawBody.severity_level === 'string' ? rawBody.severity_level : rawBody.severity_level?.toString?.();
        const priorityLevel = typeof rawBody.priority === 'string' ? rawBody.priority : rawBody.priority?.toString?.();
        const imageType = typeof rawBody.image_type === 'string' && rawBody.image_type.trim()
            ? rawBody.image_type.trim()
            : 'before';

        const files = Array.isArray(req.files) ? req.files : [];
        const reported_by = req.user.id; // From auth middleware

        if (!title || !description || !puno) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, and PU ID are required'
            });
        }

        const pool = await sql.connect(dbConfig);
        const ticket_number = await generateTicketNumber(pool);

        // Validate equipment_id if provided
        let validatedEquipmentId = null;
        if (equipmentIdInput) {
            const equipmentCheck = await runQuery(pool, `
                SELECT EQNO, EQCODE, EQNAME, PUNO
                FROM EQ 
                WHERE EQNO = @equipment_id AND PUNO = @puno AND FLAGDEL = 'F'
            `, [
                { name: 'equipment_id', type: sql.Int, value: equipmentIdInput },
                { name: 'puno', type: sql.Int, value: puno }
            ]);

            if (mapRecordset(equipmentCheck).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Equipment not found or does not belong to the selected production unit'
                });
            }

            validatedEquipmentId = equipmentIdInput;
        }

        // Create ticket record
        const ticketInsertResult = await runQuery(pool, `
            INSERT INTO Tickets (
                ticket_number, title, description, puno, equipment_id,
                severity_level, priority,
                reported_by,
                status, created_at, updated_at
            )
            VALUES (
                @ticket_number, @title, @description, @puno, @equipment_id,
                @severity_level, @priority,
                @reported_by,
                'open', GETDATE(), GETDATE()
            );
            SELECT SCOPE_IDENTITY() as ticket_id;
        `, [
            { name: 'ticket_number', type: sql.VarChar(20), value: ticket_number },
            { name: 'title', type: sql.NVarChar(255), value: title },
            { name: 'description', type: sql.NVarChar(sql.MAX), value: description },
            { name: 'puno', type: sql.Int, value: puno },
            { name: 'equipment_id', type: sql.Int, value: validatedEquipmentId },
            { name: 'severity_level', type: sql.VarChar(20), value: severityLevel || 'medium' },
            { name: 'priority', type: sql.VarChar(20), value: priorityLevel || 'normal' },
            { name: 'reported_by', type: sql.Int, value: reported_by }
        ]);

        const ticketId = firstRecord(ticketInsertResult)?.ticket_id;
        if (!ticketId) {
            throw new Error('Failed to retrieve ticket identifier');
        }

        // Get ticket with hierarchy information via PUExtension
        const ticketWithHierarchy = await runQuery(pool, `
            SELECT 
                t.*,
                pe.pucode,
                pe.plant as plant_code,
                pe.area as area_code,
                pe.line as line_code,
                pe.machine as machine_code,
                pe.number as machine_number,
                pe.puname as plant_name,
                pe.pudescription as pudescription,
                pe.digit_count,
                pu.PUCODE as pu_pucode,
                pu.PUNAME as pu_name,
                eq.EQNO as equipment_id,
                eq.EQCODE as equipment_code,
                eq.EQNAME as equipment_name
            FROM Tickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
            LEFT JOIN EQ eq ON t.equipment_id = eq.EQNO AND eq.FLAGDEL = 'F'
            WHERE t.id = @ticket_id
        `, [
            { name: 'ticket_id', type: sql.Int, value: ticketId }
        ]);

        const ticketData = firstRecord(ticketWithHierarchy);

        if (!ticketData) {
            throw new Error('Failed to load ticket details after creation');
        }

        // Persist uploaded images (if any) and rollback ticket if this fails
        if (files.length > 0) {
            const uploadDir = path.join(__dirname, '..', 'uploads', 'tickets', String(ticketId));
            const savedFilePaths = [];

            try {
                await fsPromises.mkdir(uploadDir, { recursive: true });

                for (const file of files) {
                    const ext = path.extname(file.originalname) || '.jpg';
                    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_') || 'image';
                    const unique = `${Date.now()}_${Math.random().toString(36).slice(-6)}`;
                    const fileName = `${unique}_${safeBase}${ext.toLowerCase()}`;
                    const fullPath = path.join(uploadDir, fileName);

                    await fsPromises.writeFile(fullPath, file.buffer);
                    savedFilePaths.push(fullPath);

                    const relativePath = `/uploads/tickets/${ticketId}/${fileName}`;
                    await runQuery(pool, `
                        INSERT INTO TicketImages (ticket_id, image_type, image_url, image_name, uploaded_by, uploaded_at)
                        VALUES (@ticket_id, @image_type, @image_url, @image_name, @uploaded_by, GETDATE());
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: ticketId },
                        { name: 'image_type', type: sql.VarChar(20), value: imageType },
                        { name: 'image_url', type: sql.NVarChar(500), value: relativePath },
                        { name: 'image_name', type: sql.NVarChar(255), value: file.originalname || fileName },
                        { name: 'uploaded_by', type: sql.Int, value: reported_by }
                    ]);
                }
            } catch (imageErr) {
                console.error('Failed to persist ticket images, rolling back ticket creation:', imageErr);

                for (const fullPath of savedFilePaths) {
                    fs.unlink(fullPath, () => {});
                }

                try {
                    await runQuery(pool, 'DELETE FROM TicketImages WHERE ticket_id = @ticket_id', [
                        { name: 'ticket_id', type: sql.Int, value: ticketId }
                    ]);
                    await runQuery(pool, 'DELETE FROM Tickets WHERE id = @ticket_id', [
                        { name: 'ticket_id', type: sql.Int, value: ticketId }
                    ]);
                } catch (rollbackErr) {
                    console.error('Failed to rollback ticket after image error:', rollbackErr);
                }

                return res.status(500).json({
                    success: false,
                    message: 'Failed to save ticket images. Ticket creation has been rolled back.',
                    error: imageErr.message
                });
            }
        }

        // Send notifications according to new workflow logic: L2ForPU + actor (creator)
        await safeSendEmail('send new ticket notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(ticketId, 'create', reported_by);
                console.log(`\n=== TICKET CREATION NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${ticket_number} (ID: ${ticketId})`);
                console.log(`Action: CREATE`);
                // Get reporter information for notifications
                const reporterResult = await runQuery(pool, `
                    SELECT p.PERSON_NAME, p.FIRSTNAME, p.LASTNAME, p.EMAIL, p.DEPTNO, u.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                    WHERE p.PERSONNO = @user_id
                `, [
                    { name: 'user_id', type: sql.Int, value: reported_by }
                ]);

                const reporterRow = firstRecord(reporterResult) || {};
                const reporterName = formatPersonName(reporterRow);

                console.log(`Reported by: ${reported_by} (${reporterName})`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for create action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: ticketId,
                    ticket_number: ticket_number,
                    title,
                    description,
                    pucode: ticketData.pucode,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.pudescription,
                    equipment_id: validatedEquipmentId,
                    equipment_name: ticketData.equipment_name,
                    equipment_code: ticketData.equipment_code,
                    PUNAME: ticketData.pudescription, // For email template compatibility
                    severity_level: severityLevel || 'medium',
                    priority: priorityLevel || 'normal',
                    reported_by,
                    assigned_to: null,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendNewTicketNotification(ticketDataForNotifications, reporterName, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    // Prepare flexible message for LINE
                    const linePayload = {
                        caseNo: ticket_number,
                        assetName: ticketData.equipment_name || ticketData.pudescription || 'Unknown Asset',
                        problem: title,
                        actionBy: reporterName,
                        comment: description,
                        extraKVs: [
                            { label: 'Severity', value: (severityLevel || 'medium').toUpperCase() },
                            { label: 'Priority', value: (priorityLevel || 'normal').toUpperCase() },
                            { label: 'Reported by', value: reporterName }
                        ]
                    };

                    const linePromises = lineRecipients.map(user => {
                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal('open', linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;
                    
                    console.log(`LINE notifications sent successfully for ticket ${ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket creation:', error);
                throw error;
            }
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: {
                id: ticketId,
                ticket_number: ticket_number,
                title,
                pucode: pucode,
                plant_id: ticketData.plant_id,
                area_id: ticketData.area_id,
                line_id: ticketData.line_id,
                machine_id: ticketData.machine_id,
                machine_number: ticketData.machine_number,
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
            plant,
            area
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

        if (plant) {
            whereClause += ' AND pe.plant = @plant';
            params.push({ name: 'plant', value: plant, type: sql.VarChar(50) });
        }

        if (area) {
            whereClause += ' AND pe.area = @area';
            params.push({ name: 'area', value: area, type: sql.VarChar(50) });
        }

        // Build the request with parameters
        let request = createSqlRequest(pool, params);

        // Add offset and limit parameters
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, parseInt(limit));

        // Get total count (with PUExtension join for plant/area filters)
        const countResult = await request.query(`
            SELECT COUNT(*) as total 
            FROM Tickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
            ${whereClause}
        `);
        const total = countResult.recordset[0].total;

        // Get tickets with user information and hierarchy via PUExtension
        const ticketsResult = await request.query(`
            SELECT 
                t.*,
                r.PERSON_NAME as reporter_name,
                r.EMAIL as reporter_email,
                a.PERSON_NAME as assignee_name,
                a.EMAIL as assignee_email,
                -- Hierarchy information from PUExtension
                pe.pucode,
                pe.plant as plant_code,
                pe.area as area_code,
                pe.line as line_code,
                pe.machine as machine_code,
                pe.number as machine_number,
                pe.puname as plant_name,
                pe.pudescription as pudescription,
                pe.digit_count,
                -- Hierarchy codes from PUExtension
                -- PU information
                pu.PUCODE as pu_pucode,
                pu.PUNAME as pu_name
            FROM Tickets t
            LEFT JOIN Person r ON t.reported_by = r.PERSONNO
            LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
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

        // Simplified query without TicketApproval JOIN
        const result = await pool.request()
            .input('id', sql.Int, id)
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
                    -- Hierarchy information from PUExtension
                    pe.pucode,
                    pe.plant as plant_code,
                    pe.area as area_code,
                    pe.line as line_code,
                    pe.machine as machine_code,
                    pe.number as machine_number,
                    pe.puname as plant_name,
                    pe.pudescription as pudescription,
                    pe.digit_count,
                    -- PU information
                    pu.PUCODE as pu_pucode,
                    pu.PUNAME as pu_name,
                    -- Failure mode information
                    fm.FailureModeCode as failure_mode_code,
                    fm.FailureModeName as failure_mode_name
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
                LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                LEFT JOIN FailureModes fm ON t.failure_mode_id = fm.FailureModeNo AND fm.FlagDel != 'Y'
                WHERE t.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const ticket = result.recordset[0];

        // Get user's max approval level for this ticket's PU using the helper function
        const userApprovalLevel = await getUserMaxApprovalLevelForPU(userId, ticket.puno);

        // Determine user relationship to the ticket
        let userRelationship = 'viewer';
        if (ticket.reported_by === userId) {
            userRelationship = 'creator';
        } else if (userApprovalLevel >= 2) {
            userRelationship = 'approver';
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

        ticket.images = imagesResult.recordset;
        ticket.comments = commentsResult.recordset;
        ticket.status_history = historyResult.recordset;
        
        // Add user relationship and approval level (calculated from helper)
        ticket.user_relationship = userRelationship;
        ticket.user_approval_level = userApprovalLevel;

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

        const currentTicketResult = await runQuery(pool, 'SELECT status, reported_by FROM Tickets WHERE id = @id', [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const currentTicket = firstRecord(currentTicketResult);
        if (!currentTicket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const { status: oldStatus, reported_by: reporterId } = currentTicket;

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
            await insertStatusHistory(pool, {
                ticketId: id,
                oldStatus,
                newStatus: updateData.status,
                changedBy: req.user.id,
                notes: updateData.status_notes || 'Status updated'
            });

            const detailResult = await runQuery(pool, `
                SELECT 
                    t.id, t.ticket_number, t.title, t.severity_level, t.priority,
                    t.puno,
                    pe.plant as plant_code,
                    pe.area as area_code,
                    pe.line as line_code,
                    pe.machine as machine_code,
                    pe.number as machine_number
                FROM Tickets t
                LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                WHERE t.id = @ticket_id;

                SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID 
                FROM Person p
                LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
                WHERE p.PERSONNO = @reporter_id;
            `, [
                { name: 'ticket_id', type: sql.Int, value: id },
                { name: 'reporter_id', type: sql.Int, value: reporterId }
            ]);

            const ticketData = detailResult.recordsets[0]?.[0];
            const reporter = detailResult.recordsets[1]?.[0];
            const changedByName = getUserDisplayNameFromRequest(req);

            await safeSendEmail('send ticket status update email', async () => {
                if (reporter?.EMAIL) {
                    await emailService.sendTicketStatusUpdateNotification(
                        ticketData,
                        oldStatus,
                        updateData.status,
                        changedByName,
                        reporter.EMAIL
                    );
                }
            });

            await safeSendLineNotification('send LINE status update notification', async () => {
                if (reporter?.LineID) {
                    const imagesResult = await runQuery(pool, `
                        SELECT image_url, image_name 
                        FROM TicketImages 
                        WHERE ticket_id = @ticket_id 
                        ORDER BY uploaded_at ASC
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: id }
                    ]);

                    let abnState;
                    switch (updateData.status) {
                        case 'accepted':
                        case 'in_progress':
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
                        detailUrl: getTicketDetailUrl(ticketData.id)
                    });
                    await abnFlexService.pushToUser(reporter.LineID, flexMsg);
                }
            });
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
            .query(`
                UPDATE Tickets SET assigned_to = @assigned_to, updated_at = GETDATE() WHERE id = @id;
                UPDATE Tickets 
                SET status = 'assigned', updated_at = GETDATE()
                WHERE id = @id AND status = 'open';
            `);

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: 'open',
            newStatus: 'assigned',
            changedBy: assigned_by,
            toUser: assigned_to,
            notes
        });

        const detailResult = await runQuery(pool, `
            SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
                   pe.plant as plant_code,
                   pe.area as area_code,
                   pe.line as line_code,
                   pe.machine as machine_code,
                   pe.number as machine_number
            FROM Tickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
            WHERE t.id = @ticket_id;

            SELECT PERSON_NAME, EMAIL, DEPTNO, LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
            WHERE p.PERSONNO = @assignee_id;
        `, [
            { name: 'ticket_id', type: sql.Int, value: id },
            { name: 'assignee_id', type: sql.Int, value: assigned_to }
        ]);

        const ticketData = detailResult.recordsets[0]?.[0];
        const assignee = detailResult.recordsets[1]?.[0];
        const assigneeDisplayName = formatPersonName(assignee, 'Assignee');

        await safeSendEmail('send ticket assignment email notification', async () => {
            if (assignee?.EMAIL) {
                await emailService.sendTicketAssignmentNotification(
                    ticketData,
                    assigneeDisplayName,
                    assignee.EMAIL
                );
            }
        });

        await safeSendLineNotification('send LINE assignment notification', async () => {
            if (assignee?.LineID) {
                const imagesResult = await runQuery(pool, `
                    SELECT image_url, image_name 
                    FROM TicketImages 
                    WHERE ticket_id = @ticket_id 
                    ORDER BY uploaded_at ASC
                `, [
                    { name: 'ticket_id', type: sql.Int, value: id }
                ]);

                const ticketImages = mapImagesToLinePayload(mapRecordset(imagesResult));

                const flexMsg = abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.REASSIGNED, {
                    caseNo: ticketData.ticket_number,
                    assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
                    problem: ticketData.title || "No description",
                    actionBy: assigneeDisplayName,
                    comment: notes || "งานได้รับการมอบหมายให้คุณแล้ว",
                    detailUrl: getTicketDetailUrl(ticketData.id)
                });
                await abnFlexService.pushToUser(assignee.LineID, flexMsg);
            }
        });

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
                LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.line_id = t.line_id
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

        // Get current ticket status and puno
        const currentTicketResult = await runQuery(pool, 'SELECT status, reported_by, assigned_to, puno FROM Tickets WHERE id = @id', [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        const { status, reported_by, assigned_to, puno } = ticket;

        // Check if user has permission to accept tickets
        const permissionCheck = await checkUserActionPermission(accepted_by, puno, 'accept');
        if (!permissionCheck.hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to accept tickets for this location'
            });
        }

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

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus,
            changedBy: accepted_by,
            notes: notes || statusNotes
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, accepted_by, ticket.status, newStatus, notes);

        const detailResult = await runQuery(pool, `
            SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.puno,
                   pu.PUCODE, pu.PUNAME,
                   pe.plant as plant_code,
                   pe.area as area_code,
                   pe.line as line_code,
                   pe.machine as machine_code,
                   pe.number as machine_number
            FROM Tickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
            WHERE t.id = @ticket_id;

            SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
            WHERE p.PERSONNO = @reporter_id;
        `, [
            { name: 'ticket_id', type: sql.Int, value: id },
            { name: 'reporter_id', type: sql.Int, value: ticket.reported_by }
        ]);

        const ticketData = detailResult.recordsets[0]?.[0];
        const reporter = detailResult.recordsets[1]?.[0];
        const acceptorName = getUserDisplayNameFromRequest(req);

        // Send notifications according to new workflow logic: requester + actor (acceptor)
        await safeSendEmail('send ticket acceptance notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'accept', accepted_by);
                console.log(`\n=== TICKET ACCEPTANCE NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${ticketData.ticket_number} (ID: ${id})`);
                console.log(`Action: ACCEPT`);
                console.log(`Accepted by: ${accepted_by} (${acceptorName})`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for accept action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for accept notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: accepted_by,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendTicketAcceptedNotification(ticketDataForNotifications, acceptorName, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);
                    // Prepare flexible message for LINE
                    const linePayload = {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                        problem: ticketData.title || 'No description',
                        actionBy: acceptorName,
                        comment: notes || `งานได้รับการยอมรับแล้ว โดย ${acceptorName}`,
                        extraKVs: [
                            { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                            { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                            { label: 'Accepted by', value: acceptorName }
                        ]
                    };

                    // Add scheduled completion date if provided
                    if (scheduled_complete) {
                        linePayload.extraKVs.push({
                            label: 'Scheduled Complete',
                            value: new Date(scheduled_complete).toLocaleDateString('th-TH')
                        });
                    }

                    const linePromises = lineRecipients.map(user => {
                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ACCEPTED, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket acceptance:', error);
                throw error;
            }
        });

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
        const currentTicketResult = await runQuery(pool, `
            SELECT 
                t.status, 
                t.reported_by,
                t.puno
            FROM Tickets t
            WHERE t.id = @id
        `, [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        // Check if user has L3+ approval level for this PU (similar to approveClose)
        let userApprovalLevel = 0;
        try {
            // Use sp_GetUsersForNotification to check if user has L3+ approval for this PU
            // Check levels 3, 4, 5 etc. to cover L3+ users
            const approvalCheckL3 = await pool.request()
                .input('puno', sql.Int, ticket.puno)
                .input('approval_level', sql.Int, 3)
                .execute('sp_GetUsersForNotification');
            
            const approvalCheckL4 = await pool.request()
                .input('puno', sql.Int, ticket.puno)
                .input('approval_level', sql.Int, 4)
                .execute('sp_GetUsersForNotification');
            
            const hasL3Approval = approvalCheckL3.recordset.some(u => u.PERSONNO === rejected_by);
            const hasL4Approval = approvalCheckL4.recordset.some(u => u.PERSONNO === rejected_by);
            
            userApprovalLevel = hasL4Approval ? 4 : (hasL3Approval ? 3 : 0);
        } catch (error) {
            console.log('Checking approval level fallback:', error.message);
            // Fallback: assume user has L2 permission if they're logged in
            userApprovalLevel = 2;
        }
        
        let newStatus = 'rejected_pending_l3_review'; // Default to L3 review for L2 rejections
        let statusNotes = 'Ticket rejected by L2, escalated to L3 for review';

        // Handle different rejection scenarios
        if (userApprovalLevel >= 3) {
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

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus,
            changedBy: rejected_by,
            notes: rejection_reason || statusNotes
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, rejected_by, ticket.status, newStatus, rejection_reason);

        // Send notification to requestor and assignee
        const detailResult = await runQuery(pool, `
            SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno, t.assigned_to,
                   pu.PUCODE, pu.PUNAME,
                   pe.plant as plant_code,
                   pe.area as area_code,
                   pe.line as line_code,
                   pe.machine as machine_code,
                   pe.number as machine_number
            FROM Tickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
            WHERE t.id = @ticket_id;

            SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
            WHERE p.PERSONNO = @reporter_id;

            SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, u.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
            WHERE p.PERSONNO = @assignee_id;
        `, [
            { name: 'ticket_id', type: sql.Int, value: id },
            { name: 'reporter_id', type: sql.Int, value: ticket.reported_by },
            { name: 'assignee_id', type: sql.Int, value: ticket.assigned_to }
        ]);

        const ticketData = detailResult.recordsets[0]?.[0];
        const reporter = detailResult.recordsets[1]?.[0];
        const assignee = detailResult.recordsets[2]?.[0];
        const rejectorName = getUserDisplayNameFromRequest(req);
        const reporterDisplayName = formatPersonName(reporter, 'ไม่ระบุ');
        const assigneeDisplayName = assignee ? formatPersonName(assignee, 'ไม่ระบุ') : null;

        ticketData.reporter_name = reporterDisplayName;
        if (assigneeDisplayName) {
            ticketData.assignee_name = assigneeDisplayName;
        }

        // Send notifications according to new workflow logic: requester + L3ForPU + actor (rejector)
        await safeSendEmail('send ticket rejection notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'reject', rejected_by);
                console.log(`\n=== TICKET REJECTION NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${ticketData.ticket_number} (ID: ${id})`);
                console.log(`Action: REJECT`);
                console.log(`Rejected by: ${rejected_by} (${rejectorName}) - Level: ${ticket.user_approval_level || 0}`);
                console.log(`New Status: ${newStatus}`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for reject action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Determine rejection state based on rejector level
                const rejectionState = (ticket.user_approval_level || 0) >= 3
                    ? abnFlexService.AbnCaseState.REJECT_FINAL
                    : abnFlexService.AbnCaseState.REJECT_TO_MANAGER;

                // Prepare ticket data<｜tool▁call▁begin｜>for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for reject notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: ticketData.assigned_to,
                    rejection_reason: rejection_reason,
                    new_status: newStatus,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendTicketRejectedNotification(ticketDataForNotifications, rejectorName, rejection_reason, newStatus, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);
                    // Prepare flexible message for LINE
                    const linePayload = {
                        caseNo: ticketData.ticket_number,
                        assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                        problem: ticketData.title || 'No description',
                        actionBy: rejectorName,
                        comment: rejection_reason || "งานถูกปฏิเสธ",
                        extraKVs: [
                            { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                            { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                            { label: 'Rejected by', value: rejectorName },
                            { label: 'Status', value: newStatus.toUpperCase() }
                        ]
                    };

                    let rejectionState;
                    if (newStatus === 'rejected_final') {
                        rejectionState = abnFlexService.AbnCaseState.REJECT_FINAL;
                    } else {
                        rejectionState = abnFlexService.AbnCaseState.REJECT_TO_MANAGER;
                    }

                    const linePromises = lineRecipients.map(user => {
                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(rejectionState, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket rejection:', error);
                throw error;
            }
        });

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
        const currentTicketResult = await runQuery(pool, 'SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id', [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

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

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus: 'completed',
            changedBy: completed_by,
            notes: completion_notes || 'Job completed'
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, completed_by, ticket.status, 'completed', completion_notes);

        // Send notifications according to new workflow logic: requester + actor (completer)
        await safeSendEmail('send job completion notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'complete', completed_by);
                console.log(`\n=== JOB COMPLETION NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${'ticket_number'} (ID: ${id})`);
                console.log(`Action: COMPLETE`);
                console.log(`Completed by: ${completed_by} (${getUserDisplayNameFromRequest(req)})`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️ in  No notification users found for complete action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Get ticket details for notification data
                const ticketDetailResult = await runQuery(pool, `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.downtime_avoidance_hours, t.cost_avoidance, t.puno, t.failure_mode_id,
                           fm.FailureModeCode, fm.FailureModeName,
                           pu.PUCODE, pu.PUNAME,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM Tickets t
                    LEFT JOIN FailureModes fm ON t.failure_mode_id = fm.FailureModeNo AND fm.FlagDel != 'Y'
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `, [
                    { name: 'ticket_id', type: sql.Int, value: id }
                ]);

                const ticketData = firstRecord(ticketDetailResult);
                const completerName = getUserDisplayNameFromRequest(req);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for complete notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: completed_by,
                    downtime_avoidance_hours: downtime_avoidance_hours,
                    cost_avoidance: cost_avoidance,
                    failure_mode_id: failure_mode_id,
                    FailureModeName: ticketData.FailureModeName,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendJobCompletedNotification(ticketDataForNotifications, completerName, completion_notes, downtime_avoidance_hours, cost_avoidance, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);
                    // Get ticket images for FLEX message (after images for completion)
                    const imagesResult = await runQuery(pool, `
                        SELECT image_url, image_name, image_type
                        FROM TicketImages 
                        WHERE ticket_id = @ticket_id 
                        ORDER BY uploaded_at ASC
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: id }
                    ]);
                    
                    // Get hero image from "after" images, fallback to any image
                    const afterImages = imagesResult.recordset.filter(img => img.image_type === 'after');
                    const heroImageUrl = getHeroImageUrl(afterImages.length > 0 ? afterImages : imagesResult.recordset);

                    const linePromises = lineRecipients.map(user => {
                        // Prepare flexible message for LINE
                        const linePayload = {
                            caseNo: ticketData.ticket_number,
                            assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                            problem: ticketData.title || 'No description',
                            actionBy: completerName,
                            comment: completion_notes || "งานเสร็จสมบูรณ์แล้ว",
                            heroImageUrl: heroImageUrl,
                            extraKVs: [
                                { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                                { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                                { label: 'Completed by', value: completerName },
                                { label: "Cost Avoidance", value: cost_avoidance ? `${cost_avoidance.toLocaleString()} บาท` : "-" },
                                { label: "Downtime Avoidance", value: downtime_avoidance_hours ? `${downtime_avoidance_hours} ชั่วโมง` : "-" },
                                { label: "Failure Mode", value: ticketData.FailureModeName || "-" }
                            ]
                        };

                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.COMPLETED, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for job completion:', error);
                throw error;
            }
        });

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
        const currentTicketResult = await runQuery(pool, 'SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id', [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

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

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus: 'escalated',
            changedBy: escalated_by,
            notes: `Escalated to L3: ${escalation_reason}`
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, escalated_by, ticket.status, 'escalated', escalation_reason);

        // Send notifications according to new workflow logic: requester + L3ForPU + L4ForPU + actor (escalator)
        await safeSendEmail('send ticket escalation notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'escalate', escalated_by);
                console.log(`\n=== TICKET ESCALATION NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${id} (ID: ${id})`);
                console.log(`Action: ESCALATE`);
                console.log(`Escalated by: ${escalated_by} (${getUserDisplayNameFromRequest(req)})`);
                console.log(`Escalated to: ${escalated_to}`);
                console.log(`Escalation reason: ${escalation_reason}`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for escalate action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Get ticket details for notification data
                const ticketDetailResult = await runQuery(pool, `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
                           pu.PUCODE, pu.PUNAME,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `, [
                    { name: 'ticket_id', type: sql.Int, value: id }
                ]);

                const ticketData = firstRecord(ticketDetailResult);
                const escalatorName = getUserDisplayNameFromRequest(req);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for escalate notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: escalated_by,
                    escalated_to: escalated_to,
                    escalation_reason: escalation_reason,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendTicketEscalatedNotification(ticketDataForNotifications, escalatorName, escalation_reason, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);
                    // Get ticket images for FLEX message
                    const imagesResult = await runQuery(pool, `
                        SELECT image_name as filename, image_url as url, uploaded_at, uploaded_by
                        FROM TicketImages 
                        WHERE ticket_id = @ticket_id
                        ORDER BY uploaded_at ASC
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: id }
                    ]);
                    
                    // Get hero image from before images
                    const heroImageUrl = getHeroImageUrl(imagesResult.recordset || []);

                    const linePromises = lineRecipients.map(user => {
                        // Prepare flexible message for LINE
                        const linePayload = {
                            caseNo: ticketData.ticket_number,
                            assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                            problem: ticketData.title || 'No description',
                            actionBy: escalatorName,
                            comment: escalation_reason || "งานถูกส่งต่อให้หัวหน้างานพิจารณา",
                            heroImageUrl: heroImageUrl,
                            extraKVs: [
                                { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                                { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                                { label: 'Escalated by', value: escalatorName },
                                { label: 'Escalated to', value: escalated_to },
                                { label: 'Status', value: 'ESCALATED' }
                            ]
                        };

                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.ESCALATED, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket escalation:', error);
                throw error;
            }
        });

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

// Approve review ticket (L1 - Requestor)
const approveReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { review_reason, satisfaction_rating } = req.body;
        const reviewed_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status
        const currentTicketResult = await runQuery(pool, 'SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id', [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Check if user is the requestor
        if (ticket.reported_by !== reviewed_by) {
            return res.status(403).json({
                success: false,
                message: 'Only the requestor can approve review this ticket'
            });
        }

        // Check if ticket is in completed status
        if (ticket.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Only completed tickets can be reviewed'
            });
        }

        // Update ticket status to reviewed with workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'reviewed')
            .input('reviewed_by', sql.Int, reviewed_by)
            .input('satisfaction_rating', sql.Int, satisfaction_rating)
            .query(`
                UPDATE Tickets 
                SET status = @status, 
                    reviewed_at = GETDATE(),
                    reviewed_by = @reviewed_by,
                    satisfaction_rating = @satisfaction_rating,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus: 'reviewed',
            changedBy: reviewed_by,
            notes: review_reason || 'Ticket reviewed by requestor'
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, reviewed_by, ticket.status, 'reviewed', review_reason);

        // Send notifications according to new workflow logic: assignee + L4ForPU + actor (reviewer)
        await safeSendEmail('send ticket review approval notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'approve_review', reviewed_by);
                console.log(`\n=== TICKET REVIEW APPROVAL NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${id} (ID: ${id})`);
                console.log(`Action: APPROVE_REVIEW`);
                console.log(`Reviewed by: ${reviewed_by} (${getUserDisplayNameFromRequest(req)})`);
                console.log(`Review reason: ${review_reason || 'N/A'}`);
                console.log(`Satisfaction rating: ${satisfaction_rating ? `${satisfaction_rating}/5 ⭐` : 'ไม่ระบุ'}`);
                console.log(`New status: reviewed`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for approve_review action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Get ticket details for notification data
                const ticketDetailResult = await runQuery(pool, `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.puno,
                           pu.PUCODE, pu.PUNAME,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `, [
                    { name: 'ticket_id', type: sql.Int, value: id }
                ]);

                const ticketData = firstRecord(ticketDetailResult);
                const reviewerName = getUserDisplayNameFromRequest(req);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for review notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: ticket.assigned_to,
                    review_reason: review_reason,
                    satisfaction_rating: satisfaction_rating,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendTicketReviewedNotification(ticketDataForNotifications, reviewerName, review_reason, satisfaction_rating, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);

                    const linePromises = lineRecipients.map(user => {
                        // Prepare flexible message for LINE
                        const linePayload = {
                            caseNo: ticketData.ticket_number,
                            assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                            problem: ticketData.title || 'No description',
                            actionBy: reviewerName,
                            comment: review_reason || "งานได้รับการตรวจสอบและอนุมัติโดยผู้ร้องขอ",
                            extraKVs: [
                                { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                                { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                                { label: 'Reviewed by', value: reviewerName },
                                { label: "Satisfaction Rating", value: satisfaction_rating ? `${satisfaction_rating}/5 ⭐` : "ไม่ระบุ" },
                                { label: 'Status', value: 'REVIEWED' }
                            ]
                        };

                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.REVIEWED, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket review approval:', error);
                throw error;
            }
        });

        res.json({
            success: true,
            message: 'Ticket review approved successfully',
            data: { status: 'reviewed', reviewed_at: new Date().toISOString() }
        });

    } catch (error) {
        console.error('Error approving ticket review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve ticket review',
            error: error.message
        });
    }
};

// Approve close ticket (L4 only)
const approveClose = async (req, res) => {
    try {
        const { id } = req.params;
        const { close_reason } = req.body;
        const closed_by = req.user.id;
        const pool = await sql.connect(dbConfig);

        // Get current ticket status
        const currentTicketResult = await runQuery(pool, `
            SELECT 
                t.status, 
                t.reported_by, 
                t.assigned_to,
                t.puno
            FROM Tickets t
            WHERE t.id = @id
        `, [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Check if user has L4+ approval level for this PU
        let userApprovalLevel = 0;
        try {
            // Use sp_GetUsersForNotification to check if user has L4+ approval for this PU
            const approvalCheck = await pool.request()
                .input('puno', sql.Int, ticket.puno)
                .input('approval_level', sql.Int, 4)
                .execute('sp_GetUsersForNotification');
            
            const hasL4Approval = approvalCheck.recordset.some(u => u.PERSONNO === closed_by);
            userApprovalLevel = hasL4Approval ? 4 : 0;
        } catch (error) {
            console.log('Checking approval level fallback:', error.message);
            // Fallback: assume user has permission if they're logged in
            userApprovalLevel = 4;
        }
        
        if (userApprovalLevel < 4) {
            return res.status(403).json({
                success: false,
                message: 'Only L4+ managers can approve closure of tickets in this area'
            });
        }

        // Check if ticket is in reviewed status
        if (ticket.status !== 'reviewed') {
            return res.status(400).json({
                success: false,
                message: 'Only reviewed tickets can be closed'
            });
        }

        // Update ticket status to closed with workflow tracking
        await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(50), 'closed')
            .input('closed_by', sql.Int, closed_by)
            .query(`
                UPDATE Tickets 
                SET status = @status, 
                    closed_at = GETDATE(),
                    closed_by = @closed_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus: 'closed',
            changedBy: closed_by,
            notes: close_reason || 'Ticket closed by L4 manager'
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, closed_by, ticket.status, 'closed', close_reason);

        // Send notifications according to new workflow logic: requester + assignee + actor (closer)
        await safeSendEmail('send ticket closure notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'approve_close', closed_by);
                console.log(`\n=== TICKET CLOSURE NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${id} (ID: ${id})`);
                console.log(`Action: APPROVE_CLOSE`);
                console.log(`Closed by: ${closed_by} (${getUserDisplayNameFromRequest(req)}) - Level: ${ticket.user_approval_level || 0}`);
                console.log(`Close reason: ${close_reason || 'N/A'}`);
                console.log(`Previous status: reviewed`);
                console.log(`New status: closed`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for approve_close action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Get ticket details for notification data
                const ticketDetailResult = await runQuery(pool, `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.puno,
                           pu.PUCODE, pu.PUNAME,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `, [
                    { name: 'ticket_id', type: sql.Int, value: id }
                ]);

                const ticketData = firstRecord(ticketDetailResult);
                const closerName = getUserDisplayNameFromRequest(req);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for close notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: ticketData.assigned_to,
                    close_reason: close_reason,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendTicketClosedNotification(ticketDataForNotifications, closerName, close_reason, null, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);

                    const linePromises = lineRecipients.map(user => {
                        // Prepare flexible message for LINE
                        const linePayload = {
                            caseNo: ticketData.ticket_number,
                            assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                            problem: ticketData.title || 'No description',
                            actionBy: closerName,
                            comment: close_reason || "เคสถูกปิดโดยผู้จัดการระดับ L4",
                            extraKVs: [
                                { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                                { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                                { label: 'Closed by', value: closerName },
                                { label: 'Status', value: 'CLOSED' }
                            ]
                        };

                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.CLOSED, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket closure:', error);
                throw error;
            }
        });

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

        // Get current ticket status
        const currentTicketResult = await runQuery(pool, `
            SELECT 
                t.status, 
                t.reported_by,
                t.assigned_to,
                t.puno
            FROM Tickets t
            WHERE t.id = @id
        `, [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Check if user has L3+ approval level for this PU (similar to approveClose)
        let userApprovalLevel = 0;
        try {
            // Use sp_GetUsersForNotification to check if user has L3+ approval for this PU
            const approvalCheck = await pool.request()
                .input('puno', sql.Int, ticket.puno)
                .input('approval_level', sql.Int, 3)
                .execute('sp_GetUsersForNotification');
            
            const hasL3Approval = approvalCheck.recordset.some(u => u.PERSONNO === reassigned_by);
            userApprovalLevel = hasL3Approval ? 3 : 0;
        } catch (error) {
            console.log('Checking approval level fallback:', error.message);
            // Fallback: assume user has L3 permission if they're logged in
            userApprovalLevel = 3;
        }
        
        if (userApprovalLevel < 3) {
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

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus: 'open',
            changedBy: reassigned_by,
            notes: `Ticket reassigned to ${assigneeName}: ${reassignment_reason || 'Reassigned by L3'}`
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, reassigned_by, ticket.status, 'open', reassignment_reason);

        // Log assignment change in status history
        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus: 'assigned',
            changedBy: reassigned_by,
            toUser: new_assignee_id,
            notes: `Reassigned by L3: ${reassignment_reason || 'Ticket reassigned'}`
        });

        // Send notifications according to new workflow logic: requester + assignee + actor (reassigner)
        await safeSendEmail('send ticket reassignment notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'reassign', reassigned_by);
                console.log(`\n=== TICKET REASSIGNMENT NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${id} (ID: ${id})`);
                console.log(`Action: REASSIGN`);
                console.log(`Reassigned by: ${reassigned_by} (${getUserDisplayNameFromRequest(req)}) - Level: ${ticket.user_approval_level || 0}`);
                console.log(`From assignee: ${ticket.assigned_to}`);
                console.log(`To assignee: ${new_assignee_id} (${assigneeName})`);
                console.log(`Reassignment reason: ${reassignment_reason || 'N/A'}`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for reassign action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL NOTIFICATION USERS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Get ticket details for notification data
                const ticketDetailResult = await runQuery(pool, `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `, [
                    { name: 'ticket_id', type: sql.Int, value: id }
                ]);

                const ticketData = firstRecord(ticketDetailResult);
                const reassignerName = getUserDisplayNameFromRequest(req);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for reassign notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: new_assignee_id,
                    previous_assignee: ticket.assigned_to
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendTicketReassignedNotification(ticketDataForNotifications, reassignerName, reassignment_reason, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);
                    // Get ticket images for FLEX message
                    const imagesResult = await runQuery(pool, `
                        SELECT image_url, image_name 
                        FROM TicketImages 
                        WHERE ticket_id = @ticket_id 
                        ORDER BY uploaded_at ASC
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: id }
                    ]);
                    
                    const ticketImages = mapImagesToLinePayload(imagesResult.recordset);

                    const linePromises = lineRecipients.map(user => {
                        // Prepare flexible message for LINE
                        const linePayload = {
                            caseNo: ticketData.ticket_number,
                            assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                            problem: ticketData.title || 'No description',
                            actionBy: reassignerName,
                            comment: reassignment_reason || "งานได้รับการมอบหมายใหม่",
                            extraKVs: [
                                { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                                { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                                { label: 'Reassigned by', value: reassignerName },
                                { label: 'New Assignee', value: assigneeName },
                                { label: 'Status', value: 'OPEN' }
                            ]
                        };

                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.REASSIGNED, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 Final Summary: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket reassignment:', error);
                throw error;
            }
        });

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
        
        // Get ticket information with hierarchy
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
                       pu.PUCODE as pu_pucode, 
                       pu.PUNAME as pu_name,
                       -- Hierarchy information from PUExtension
                       pe.pucode,
                       pe.plant as plant_code,
                       pe.area as area_code,
                       pe.line as line_code,
                       pe.machine as machine_code,
                       pe.number as machine_number,
                       pe.puname as plant_name,
                       pe.pudescription as pudescription,
                       pe.digit_count,
                       -- Hierarchy codes from PUExtension
                FROM Tickets t
                LEFT JOIN Person r ON t.reported_by = r.PERSONNO
                LEFT JOIN _secUsers ur ON r.PERSONNO = ur.PersonNo
                LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
                LEFT JOIN _secUsers ua ON a.PERSONNO = ua.PersonNo
                LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
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
        const baseUrl = getBackendBaseUrl();
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
                    detailUrl: getTicketDetailUrl(ticket.id)
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
                    detailUrl: getTicketDetailUrl(ticket.id)
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
                        detailUrl: getTicketDetailUrl(ticket.id)
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

        let assignees = [];
        
        if (ticket_id) {
            // Get ticket's puno if ticket_id is provided
            const ticketResult = await pool.request()
                .input('ticket_id', sql.Int, ticket_id)
                .query('SELECT puno FROM Tickets WHERE id = @ticket_id');
            
            if (ticketResult.recordset.length > 0) {
                const puno = ticketResult.recordset[0].puno;
                
                if (puno) {
                    // For escalation, only show L3 users (approval_level >= 3)
                    // For reassign, show L2+ users (approval_level >= 2)
                    const minApprovalLevel = escalation_only === 'true' ? 3 : 2;
                    
                    // Use the helper function to get users for the specific PUNO and approval level
                    const users = await getAvailableAssigneesForPU(puno, minApprovalLevel);
                    console.log(users);
                    // Apply search filter if provided
                    assignees = users
                        .filter(user => {
                            if (!search) return true;
                            const searchLower = search.toLowerCase();
                            return (
                                (user.PERSON_NAME && user.PERSON_NAME.toLowerCase().includes(searchLower)) ||
                                (user.EMAIL && user.EMAIL.toLowerCase().includes(searchLower))
                            );
                        })
                        .map(person => ({
                                id: person.PERSONNO,
                                name: person.PERSON_NAME,
                                email: person.EMAIL,
                                phone: null, // SP doesn't provide phone
                                title: null, // SP doesn't provide title
                                department: null, // SP doesn't provide department
                                userGroup: person.location_scope, // Use location_scope instead
                                approvalLevel: person.approval_level
                        }));
                }
            }
        } else {
            // If no ticket_id provided, return all L2+ users (legacy behavior)
            const minApprovalLevel = escalation_only === 'true' ? 3 : 2;
            
            let request = pool.request()
                .input('min_approval_level', sql.Int, minApprovalLevel);

            // Build search condition
            let searchCondition = '';
            if (search) {
                searchCondition = `AND (p.FIRSTNAME LIKE @search OR p.LASTNAME LIKE @search OR p.PERSON_NAME LIKE @search OR p.EMAIL LIKE @search)`;
                request.input('search', sql.NVarChar, `%${search}%`);
            }

            // Get all active persons with the minimum approval level
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
                    ta.approval_level,
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
                INNER JOIN TicketApproval ta ON ta.personno = p.PERSONNO
                WHERE p.FLAGDEL != 'Y'
                AND ta.approval_level >= @min_approval_level
                AND ta.is_active = 1
                ${searchCondition}
                ORDER BY p.FIRSTNAME, p.LASTNAME
            `);

            assignees = result.recordset.map(person => ({
                id: person.PERSONNO,
                name: person.PERSON_NAME || `${person.FIRSTNAME || ''} ${person.LASTNAME || ''}`.trim(),
                email: person.EMAIL,
                phone: person.PHONE,
                title: person.TITLE,
                department: person.DEPTNO,
                userGroup: person.USERGROUPNAME,
                approvalLevel: person.approval_level
            }));
        }

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
        const currentTicketResult = await runQuery(pool, 'SELECT status, reported_by, assigned_to FROM Tickets WHERE id = @id', [
            { name: 'id', type: sql.Int, value: id }
        ]);

        const ticket = firstRecord(currentTicketResult);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

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

        await insertStatusHistory(pool, {
            ticketId: id,
            oldStatus: ticket.status,
            newStatus: 'reopened_in_progress',
            changedBy: reopened_by,
            notes: reopen_reason || 'Ticket reopened by requestor'
        });

        // Add status change comment
        await addStatusChangeComment(pool, id, reopened_by, ticket.status, 'reopened_in_progress', reopen_reason);

        // Send notifications according to new workflow logic: assignee + actor (reopener)
        await safeSendEmail('send ticket reopen notifications', async () => {
            try {
                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(id, 'reopen', reopened_by);
                console.log(`\n=== TICKET REOPEN NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${id} (ID: ${id})`);
                console.log(`Action: REOPEN`);
                console.log(`Reopened by: ${reopened_by} (${getUserDisplayNameFromRequest(req)})`);
                console.log(`Reopen reason: ${reopen_reason || 'N/A'}`);
                console.log(`Previous status: completed`);
                console.log(`New status: reopened_in_progress`);
                console.log(`Total notification users from SP: ${notificationUsers.length}`);

                if (notificationUsers.length === 0) {
                    console.log(`⚠️  No notification users found for reopen action`);
                    console.log(`=== END NOTIFICATION SUMMARY ===\n`);
                    return;
                }

                // LOG ALL RECIPIENTS BEFORE FILTERING
                console.log('\n📋 ALL NOTIFICATION USERS (Before Filtering):');
                notificationUsers.forEach((user, index) => {
                    const hasEmail = user.EMAIL && user.EMAIL.trim() !== '';
                    const hasLineID = user.LineID && user.LineID.trim() !== '';
                    const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : '❌ No Email';
                    const lineStatus = hasLineID ? `✅ ${user.LineID}` : '❌ No LineID';
                    
                    console.log(`  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`);
                    console.log(`     └─ Reason: ${user.notification_reason}`);
                    console.log(`     └─ Type: ${user.recipient_type}`);
                    console.log(`     └─ Email: ${emailStatus}`);
                    console.log(`     └─ LineID: ${lineStatus}`);
                });

                // COUNT USERS BY RECIPIENT TYPE
                const userCounts = notificationUsers.reduce((counts, user) => {
                    const type = user.recipient_type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('\n📊 RECIPIENT TYPE BREAKDOWN:');
                Object.entries(userCounts).forEach(([type, count]) => {
                    console.log(`  • ${type}: ${count} user(s)`);
                });

                // COUNT USERS BY NOTIFICATION CAPABILITY
                const emailCapable = notificationUsers.filter(u => u.EMAIL && u.EMAIL.trim() !== '').length;
                const lineCapable = notificationUsers.filter(u => u.LineID && u.LineID.trim() !== '').length;
                const bothCapable = notificationUsers.filter(u => 
                    u.EMAIL && u.EMAIL.trim() !== '' && u.LineID && u.LineID.trim() !== ''
                ).length;
                const noContactInfo = notificationUsers.filter(u => 
                    (!u.EMAIL || u.EMAIL.trim() === '') && (!u.LineID || u.LineID.trim() === '')
                ).length;

                console.log('\n📞 NOTIFICATION CAPABILITY:');
                console.log(`  • Email capable: ${emailCapable} user(s)`);
                console.log(`  • LINE capable: ${lineCapable} user(s)`);
                console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
                console.log(`  • No contact info: ${noContactInfo} user(s)`);

                // Get ticket details for notification data
                const ticketDetailResult = await runQuery(pool, `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM Tickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `, [
                    { name: 'ticket_id', type: sql.Int, value: id }
                ]);

                const ticketData = firstRecord(ticketDetailResult);
                const reopenerName = getUserDisplayNameFromRequest(req);

                // Prepare ticket data for notifications
                const ticketDataForNotifications = {
                    id: id,
                    ticket_number: ticketData.ticket_number,
                    title: ticketData.title,
                    description: ticketData.title, // Using title as description for reopen notifications
                    pucode: ticketData.PUCODE,
                    plant_code: ticketData.plant_code,
                    area_code: ticketData.area_code,
                    line_code: ticketData.line_code,
                    machine_code: ticketData.machine_code,
                    machine_number: ticketData.machine_number,
                    plant_name: ticketData.PUNAME,
                    PUNAME: ticketData.PUNAME, // For email template compatibility
                    severity_level: ticketData.severity_level,
                    priority: ticketData.priority,
                    reported_by: ticket.reported_by,
                    assigned_to: ticket.assigned_to,
                    reopen_reason: reopen_reason,
                    created_at: new Date().toISOString()
                };

                // Filter recipients for each notification type
                const emailRecipients = notificationUsers.filter(user => user.EMAIL && user.EMAIL.trim() !== '');
                const lineRecipients = notificationUsers.filter(user => user.LineID && user.LineID.trim() !== '');

                console.log('\n📧 EMAIL RECIPIENTS (After Filtering):');
                if (emailRecipients.length === 0) {
                    console.log('  ⚠️  No email-capable recipients found');
                } else {
                    emailRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                console.log('\n💬 LINE RECIPIENTS (After Filtering):');
                if (lineRecipients.length === 0) {
                    console.log('  ⚠️  No LINE-capable recipients found');
                } else {
                    lineRecipients.forEach((user, index) => {
                        console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
                        console.log(`     └─ Reason: ${user.notification_reason}`);
                    });
                }

                // Send email notifications
                if (emailRecipients.length > 0) {
                    console.log(`\n📧 SENDING EMAIL NOTIFICATIONS...`);
                    await emailService.sendTicketReopenedNotification(ticketDataForNotifications, reopenerName, reopen_reason, emailRecipients);
                    console.log(`✅ Email notifications sent successfully for ticket ${ticketData.ticket_number} إلى ${emailRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping email notifications - no email-capable recipients`);
                }

                // Send LINE notifications
                if (lineRecipients.length > 0) {
                    console.log(`\n💬 SENDING LINE NOTIFICATIONS...`);
                    // Get ticket images for FLEX message
                    const imagesResult = await runQuery(pool, `
                        SELECT image_url, image_name 
                        FROM TicketImages 
                        WHERE ticket_id = @ticket_id 
                        ORDER BY uploaded_at ASC
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: id }
                    ]);
                    
                    const ticketImages = mapImagesToLinePayload(imagesResult.recordset);

                    const linePromises = lineRecipients.map(user => {
                        // Prepare flexible message for LINE
                        const linePayload = {
                            caseNo: ticketData.ticket_number,
                            assetName: ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset',
                            problem: ticketData.title || 'No description',
                            actionBy: reopenerName,
                            comment: reopen_reason || "งานถูกเปิดใหม่ กรุณาดำเนินการต่อ",
                            extraKVs: [
                                { label: 'Severity', value: (ticketData.severity_level || 'medium').toUpperCase() },
                                { label: 'Priority', value: (ticketData.priority || 'normal').toUpperCase() },
                                { label: 'Reopened by', value: reopenerName },
                                { label: 'Status', value: 'REOPENED_IN_PROGRESS' }
                            ]
                        };

                        return abnFlexService.pushToUser(user.LineID, [
                            abnFlexService.buildAbnFlexMinimal(abnFlexService.AbnCaseState.REOPENED, linePayload)
                        ]);
                    });

                    const lineResults = await Promise.all(linePromises);
                    const successfulLines = lineResults.filter(result => result.success).length;

                    console.log(`✅ LINE notifications sent successfully for ticket ${ticketData.ticket_number} to ${successfulLines}/${lineRecipients.length} recipients`);
                } else {
                    console.log(`\n⚠️  Skipping LINE notifications - no LINE-capable recipients`);
                }

                console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
                console.log(`📊 RECIPIENTS SENT TO: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE messages`);
                console.log(`🎉 FINAL ACTION OF TICKET WORKFLOW NOTIFICATION STANDARDIZATION!`);
                console.log(`=== END OF REOPEN TASK COMPLETION SUMMARY ===\n`);

            } catch (error) {
                console.error('Error sending notifications for ticket reopen:', error);
                throw error;
            }
        });

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
        // 2. Tickets where user has approval_level > 2 for the ticket's line_id
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
                -- Hierarchy information from PUExtension
                pe.pucode,
                pe.plant as plant_code,
                pe.area as area_code,
                pe.line as line_code,
                pe.machine as machine_code,
                pe.number as machine_number,
                pe.puname as plant_name,
                pe.pudescription as pudescription,
                pe.digit_count,
                -- Hierarchy codes from PUExtension
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
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN PUExtension pe ON pu.PUNO = pe.puno
            LEFT JOIN Person creator ON creator.PERSONNO = t.reported_by
            LEFT JOIN Person assignee ON assignee.PERSONNO = t.assigned_to
            LEFT JOIN TicketApproval ta ON ta.personno = @userId 
            LEFT JOIN Line l ON ta.line_id = l.id AND l.code = pe.line AND ta.is_active = 1
            WHERE (
                -- Tickets created by the user
                t.reported_by = @userId
                OR 
                -- Tickets where user has approval_level > 2 for the line
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
            plant_id: ticket.plant_id,
            plant_name: ticket.plant_name,
            plant_code: ticket.plant_code,
            area_id: ticket.area_id,
            area_name: ticket.area_name,
            area_code: ticket.area_code,
            line_id: ticket.line_id,
            line_name: ticket.line_name,
            line_code: ticket.line_code,
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

// triggerTicketNotification function removed - notifications now handled automatically

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
        
        // Build WHERE clause for user's tickets (same logic as getUserPendingTickets)
        let whereClause = `WHERE (
            -- Tickets created by the user
            t.reported_by = @userId
            OR 
            -- Tickets where user has approval_level > 2 for the line
            (ta.approval_level > 2 AND ta.is_active = 1)
        ) AND YEAR(t.created_at) = @year`;
        
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
            LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.line_id = t.line_id
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
        
        // First, check if user has L2+ approval level in any line
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
        
        // Build WHERE clause for user's completed tickets (same logic as getUserPendingTickets)
        let whereClause = `WHERE (
            -- Tickets completed by the user
            t.completed_by = @userId
            OR 
            -- Tickets where user has approval_level > 2 for the line and was involved
            (ta.approval_level > 2 AND ta.is_active = 1)
        ) AND YEAR(t.completed_at) = @year`;
        
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
            LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.line_id = t.line_id
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
        
        // First, check if user has L2+ approval level in any line
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
            LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.line_id = t.line_id
            WHERE (
                -- Tickets created by the user
                t.reported_by = @userId
                OR 
                -- Tickets where user has approval_level > 2 for the line
                (ta.approval_level > 2 AND ta.is_active = 1)
            )
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
            LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.line_id = t.line_id
            WHERE (
                -- Tickets created by the user
                t.reported_by = @userId
                OR 
                -- Tickets where user has approval_level > 2 for the line
                (ta.approval_level > 2 AND ta.is_active = 1)
            )
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
                LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.line_id = t.line_id
                WHERE (
                    -- Tickets completed by the user
                    t.completed_by = @userId
                    OR 
                    -- Tickets where user has approval_level > 2 for the line and was involved
                    (ta.approval_level > 2 AND ta.is_active = 1)
                )
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
                LEFT JOIN TicketApproval ta ON ta.personno = @userId AND ta.line_id = t.line_id
                WHERE (
                    -- Tickets completed by the user
                    t.completed_by = @userId
                    OR 
                    -- Tickets where user has approval_level > 2 for the line and was involved
                    (ta.approval_level > 2 AND ta.is_active = 1)
                )
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
    approveReview,
    approveClose,
    reopenTicket,
    reassignTicket,
    getAvailableAssignees,
    sendDelayedTicketNotification,
    getUserPendingTickets,
    getUserTicketCountPerPeriod,
    getUserCompletedTicketCountPerPeriod,
    getPersonalKPIData
};
