const sql = require("mssql");
const dbConfig = require("../config/dbConfig");
const notificationQueue = require("../queues/notificationQueue");
const cedarIntegrationService = require("../services/cedarIntegrationService");
const { getCriticalLevelText } = require("../utils/criticalMapping");
const fs = require("fs");
const path = require("path");

const {
  addStatusChangeComment,
  checkUserActionPermission,
  createSqlRequest,
  firstRecord,
  formatPersonName,
  generateTicketNumber,
  getHeroImageUrl,
  getTicketDetailUrl,
  getTicketNotificationRecipients,
  getUserDisplayNameFromRequest,
  getUserMaxApprovalLevelForPU,
  getAvailableAssigneesForPU,
  insertStatusHistory,

  mapRecordset,
  safeSendNotifications,
 
  runQuery,
} = require("./ticketController/helpers");

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
        const pucriticalnoInput = parseOptionalInt(rawBody.pucriticalno);
        const ticketClassInput = parseOptionalInt(rawBody.ticketClass);
        const severityLevel = typeof rawBody.severity_level === 'string' ? rawBody.severity_level : rawBody.severity_level?.toString?.();
        const priorityLevel = typeof rawBody.priority === 'string' ? rawBody.priority : rawBody.priority?.toString?.();
        const imageType = typeof rawBody.image_type === 'string' && rawBody.image_type.trim()
            ? rawBody.image_type.trim()
            : 'before';

        const files = Array.isArray(req.files) ? req.files : [];
        const created_by = req.user.id; // From auth middleware

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

        // Validate ticketClass if provided
        let validatedTicketClass = null;
        if (ticketClassInput) {
            const ticketClassCheck = await runQuery(pool, `
                SELECT id FROM IgxTicketClass WHERE id = @ticketClass
            `, [
                { name: 'ticketClass', type: sql.Int, value: ticketClassInput }
            ]);

            if (mapRecordset(ticketClassCheck).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ticket class'
                });
            }

            validatedTicketClass = ticketClassInput;
        }

        // Create ticket record
        const ticketInsertResult = await runQuery(pool, `
            INSERT INTO IgxTickets (
                ticket_number, title, description, puno, equipment_id, pucriticalno, ticketClass,
                severity_level, priority,
                created_by,
                status, created_at, updated_at
            )
            VALUES (
                @ticket_number, @title, @description, @puno, @equipment_id, @pucriticalno, @ticketClass,
                @severity_level, @priority,
                @created_by,
                'open', GETDATE(), GETDATE()
            );
            SELECT SCOPE_IDENTITY() as ticket_id;
        `, [
            { name: 'ticket_number', type: sql.VarChar(20), value: ticket_number },
            { name: 'title', type: sql.NVarChar(255), value: title },
            { name: 'description', type: sql.NVarChar(sql.MAX), value: description },
            { name: 'puno', type: sql.Int, value: puno },
            { name: 'equipment_id', type: sql.Int, value: validatedEquipmentId },
            { name: 'pucriticalno', type: sql.Int, value: pucriticalnoInput },
            { name: 'ticketClass', type: sql.Int, value: validatedTicketClass },
            { name: 'severity_level', type: sql.VarChar(20), value: severityLevel || 'medium' },
            { name: 'priority', type: sql.VarChar(20), value: priorityLevel || 'normal' },
            { name: 'created_by', type: sql.Int, value: created_by }
        ]);

        const ticketId = firstRecord(ticketInsertResult)?.ticket_id;
        console.log(`🔍 DEBUG: ticketId = ${ticketId}`);
        if (!ticketId) {
            throw new Error('Failed to retrieve ticket identifier');
        }

        // Get ticket with hierarchy information via IgxIgxPUExtension
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
                eq.EQNAME as equipment_name,
                tc.name_en as ticket_class_en,
                tc.name_th as ticket_class_th
            FROM IgxTickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
            LEFT JOIN EQ eq ON t.equipment_id = eq.EQNO AND eq.FLAGDEL = 'F'
            LEFT JOIN IgxTicketClass tc ON t.ticketClass = tc.id
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
            const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'tickets', String(ticketId));
            const savedFilePaths = [];

            try {
                await fsPromises.mkdir(uploadDir, { recursive: true });

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const ext = path.extname(file.originalname) || '.jpg';
                    const timestamp = Date.now();
                    const sequence = i + 1;
                    
                    // Use ticket number for easier search and identification
                    const fileName = `${ticket_number}_${imageType}_${sequence}_${timestamp}${ext.toLowerCase()}`;
                    const fullPath = path.join(uploadDir, fileName);

                    await fsPromises.writeFile(fullPath, file.buffer);
                    savedFilePaths.push(fullPath);

                    const relativePath = `/uploads/tickets/${ticketId}/${fileName}`;
                    await runQuery(pool, `
                        INSERT INTO IgxTicketImages (ticket_id, image_type, image_url, image_name, uploaded_by, uploaded_at)
                        VALUES (@ticket_id, @image_type, @image_url, @image_name, @uploaded_by, GETDATE());
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: ticketId },
                        { name: 'image_type', type: sql.VarChar(20), value: imageType },
                        { name: 'image_url', type: sql.NVarChar(500), value: relativePath },
                        { name: 'image_name', type: sql.NVarChar(255), value: fileName },
                        { name: 'uploaded_by', type: sql.Int, value: created_by }
                    ]);
                }
            } catch (imageErr) {
                console.error('Failed to persist ticket images, rolling back ticket creation:', imageErr);

                for (const fullPath of savedFilePaths) {
                    fs.unlink(fullPath, () => {});
                }

                try {
                    await runQuery(pool, 'DELETE FROM IgxTicketImages WHERE ticket_id = @ticket_id', [
                        { name: 'ticket_id', type: sql.Int, value: ticketId }
                    ]);
                    await runQuery(pool, 'DELETE FROM IgxTickets WHERE id = @ticket_id', [
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

        // 🆕 CEDAR INTEGRATION: NO WO CREATION YET
        // Tickets are like Work Requests (WR) - WO will be created when ticket is accepted
        console.log(`✅ Ticket ${ticketId} created - WO will be created when accepted`);
        // No Cedar integration at ticket creation stage

        // Send notifications according to new workflow logic: L2ForPU + actor (creator)
        // NOTE: This happens AFTER ticket creation is fully committed to ensure images are available
        // Only send notifications if images were included in the initial request (single-step process)
        if (files.length > 0) {
            console.log(`📧 Sending notifications immediately (single-step process with ${files.length} images)`);
            await safeSendNotifications('send new ticket notifications', async () => {
            try {
                // Small delay to ensure database transaction is fully committed
                await new Promise(resolve => setTimeout(resolve, 100));

                // Get notification users using the new workflow system (single call)
                const notificationUsers = await getTicketNotificationRecipients(ticketId, 'create', created_by);
                console.log(`\n=== TICKET CREATION NOTIFICATIONS SUMMARY ===`);
                console.log(`Ticket: ${ticket_number} (ID: ${ticketId})`);
                console.log(`Action: CREATE`);
                // Get reporter information for notifications
                const reporterResult = await runQuery(pool, `
                    SELECT p.PERSON_NAME, p.FIRSTNAME, p.LASTNAME, p.EMAIL, p.DEPTNO, ue.LineID
                    FROM Person p
                    LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
                    WHERE p.PERSONNO = @user_id
                `, [
                    { name: 'user_id', type: sql.Int, value: created_by }
                ]);

                const reporterRow = firstRecord(reporterResult) || {};
                const reporterName = formatPersonName(reporterRow);

                console.log(`Created by: ${created_by} (${reporterName})`);
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
                    pucriticalno: ticketData.pucriticalno,
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
                    created_by,
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

                // Build LINE payload if we have LINE recipients (for inline send and queue job)
                let linePayload = null;
                if (lineRecipients.length > 0) {
                    const imagesResult = await runQuery(pool, `
                        SELECT image_url, image_name, image_type
                        FROM IgxTicketImages
                        WHERE ticket_id = @ticket_id
                        ORDER BY uploaded_at ASC
                    `, [
                        { name: 'ticket_id', type: sql.Int, value: ticketId }
                    ]);
                    const beforeImages = (imagesResult.recordset || []).filter(img => img.image_type === 'before');
                    const heroImageUrl = getHeroImageUrl(beforeImages.length > 0 ? beforeImages : (imagesResult.recordset || []));
                    const extraKVs = [
                        { label: 'Critical Level', value: (getCriticalLevelText(ticketData.pucriticalno)).toUpperCase() }
                    ];
                    if (ticketData.ticket_class_th || ticketData.ticket_class_en) {
                        extraKVs.push({ label: 'Ticket Class', value: ticketData.ticket_class_th || ticketData.ticket_class_en });
                    }
                    extraKVs.push({ label: 'Reported by', value: reporterName });
                    linePayload = {
                        caseNo: ticket_number,
                        assetName: ticketData.equipment_name || ticketData.pudescription || 'Unknown Asset',
                        problem: title,
                        actionBy: reporterName,
                        comment: description,
                        heroImageUrl: heroImageUrl,
                        detailUrl: `${process.env.LIFF_URL}/tickets/${ticketId}`,
                        extraKVs: extraKVs
                    };
                }

                await notificationQueue.addCreateTicketNotificationJob({
                    ticketData: ticketDataForNotifications,
                    reporterName,
                    emailRecipients,
                    lineRecipients,
                    linePayload
                });
                console.log(`\n=== NOTIFICATION SUMMARY Finished ===`);
                console.log(`📊 Enqueued: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE (create-ticket)`);
                console.log(`=== END NOTIFICATION SUMMARY ===\n`);

             } catch (error) {
                 console.error('Error sending notifications for ticket creation:', error);
                 throw error;
             }
         });
        } else {
            console.log(`ℹ️  No images in initial request - notifications will be sent after image upload (two-step process)`);
        }

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: {
                id: ticketId,
                ticket_number: ticket_number,
                title: ticketData.title,
                description: ticketData.description,
                puno: ticketData.puno,
                pucode: ticketData.pucode,
                plant_code: ticketData.plant_code,
                area_code: ticketData.area_code,
                line_code: ticketData.line_code,
                machine_code: ticketData.machine_code,
                machine_number: ticketData.machine_number,
                plant_name: ticketData.plant_name,
                pudescription: ticketData.pudescription,
                equipment_id: ticketData.equipment_id,
                equipment_code: ticketData.equipment_code,
                equipment_name: ticketData.equipment_name,
                severity_level: ticketData.severity_level,
                priority: ticketData.priority,
                status: ticketData.status,
                created_by: ticketData.created_by,
                created_at: ticketData.created_at,
                updated_at: ticketData.updated_at
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
      pucriticalno,
      ticketClass,
      assigned_to,
      created_by,
      search,
      plant,
      area,
      startDate,
      endDate,
      finishedStartDate,
      finishedEndDate,
      puno,
      delay,
      overdue,
      team,
    } = req.query;

    const offset = (page - 1) * limit;
    const pool = await sql.connect(dbConfig);

    let whereClause = "WHERE 1=1";
    const params = [];

    // Date range filter (created_at)
    if (startDate && endDate) {
      whereClause += " AND CAST(t.created_at AS DATE) >= @startDate AND CAST(t.created_at AS DATE) <= @endDate";
      params.push({ name: "startDate", value: startDate, type: sql.Date });
      params.push({ name: "endDate", value: endDate, type: sql.Date });
    }

    // Finished date range filter (finished_at) - for closed tickets with finished_at in period
    if (finishedStartDate && finishedEndDate) {
      whereClause += " AND t.finished_at IS NOT NULL AND CAST(t.finished_at AS DATE) >= @finishedStartDate AND CAST(t.finished_at AS DATE) <= @finishedEndDate";
      params.push({ name: "finishedStartDate", value: finishedStartDate, type: sql.Date });
      params.push({ name: "finishedEndDate", value: finishedEndDate, type: sql.Date });
    }

    // Status filter - support comma-separated values
    if (status) {
      if (status.includes(',')) {
        // Multiple statuses
        const statusList = status.split(',').map(s => s.trim());
        const statusPlaceholders = statusList.map((_, index) => `@status${index}`).join(',');
        whereClause += ` AND t.status IN (${statusPlaceholders})`;
        statusList.forEach((statusValue, index) => {
          // Use VarChar(50) to accommodate longer status values like 'rejected_pending_l3_review' (26 chars)
          params.push({ name: `status${index}`, value: statusValue, type: sql.VarChar(50) });
        });
      } else {
        // Single status
        whereClause += " AND t.status = @status";
        // Use VarChar(50) to accommodate longer status values
        params.push({ name: "status", value: status, type: sql.VarChar(50) });
      }
    }

    // PU filter - support comma-separated values
    if (puno) {
      if (puno.includes(',')) {
        // Multiple PU IDs
        const punoList = puno.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
        if (punoList.length > 0) {
          const punoPlaceholders = punoList.map((_, index) => `@puno${index}`).join(',');
          whereClause += ` AND t.puno IN (${punoPlaceholders})`;
          punoList.forEach((punoValue, index) => {
            params.push({ name: `puno${index}`, value: punoValue, type: sql.Int });
          });
        }
      } else {
        // Single PU ID
        const punoValue = parseInt(puno);
        if (!isNaN(punoValue)) {
          whereClause += " AND t.puno = @puno";
          params.push({ name: "puno", value: punoValue, type: sql.Int });
        }
      }
    }

    // Delay filter
    if (delay === 'true' || delay === true) {
      whereClause += " AND t.schedule_finish < GETDATE() AND t.status NOT IN ('closed', 'finished', 'canceled', 'rejected_final')";
    }

    // Overdue filter: status in_progress or planed, and schedule_finish before now
    if (overdue === 'true' || overdue === true) {
      whereClause += " AND t.status IN ('in_progress', 'planed') AND t.schedule_finish IS NOT NULL AND t.schedule_finish < GETDATE()";
    }

    // Team filter - requires department identification
    let teamDeptFilter = '';
    let teamDeptNos = [];
    if (team === 'operator' || team === 'reliability') {
      // Get team department mappings
      const deptQuery = `
        SELECT DISTINCT 
          d.DEPTNO,
          d.DEPTNAME,
          CASE 
            WHEN UPPER(d.DEPTNAME) LIKE '%OPERATOR%' 
              OR UPPER(d.DEPTNAME) LIKE '%PRODUCTION%'
              OR UPPER(d.DEPTCODE) LIKE '%OP%'
            THEN 'operator'
            WHEN UPPER(d.DEPTNAME) LIKE '%RELIABILITY%'
              OR UPPER(d.DEPTNAME) LIKE '%MAINTENANCE%'
              OR UPPER(d.DEPTCODE) LIKE '%REL%'
              OR UPPER(d.DEPTCODE) LIKE '%MAINT%'
            THEN 'reliability'
            ELSE NULL
          END as team_type
        FROM Dept d
        WHERE d.FLAGDEL != 'Y'
      `;
      
      const deptResult = await pool.request().query(deptQuery);
      teamDeptNos = deptResult.recordset
        .filter(d => d.team_type === team)
        .map(d => d.DEPTNO);
      
      if (teamDeptNos.length > 0) {
        const deptPlaceholders = teamDeptNos.map((_, i) => `@teamDept${i}`).join(',');
        teamDeptFilter = `(${deptPlaceholders})`;
        teamDeptNos.forEach((deptNo, index) => {
          params.push({ name: `teamDept${index}`, value: deptNo, type: sql.Int });
        });
      } else {
        // No matching departments, return empty result
        teamDeptFilter = '(SELECT NULL WHERE 1=0)';
      }
    }

    if (pucriticalno) {
      whereClause += " AND t.pucriticalno = @pucriticalno";
      params.push({
        name: "pucriticalno",
        value: parseInt(pucriticalno),
        type: sql.Int,
      });
    }

    if (ticketClass) {
      whereClause += " AND t.ticketClass = @ticketClass";
      params.push({
        name: "ticketClass",
        value: parseInt(ticketClass),
        type: sql.Int,
      });
    }

    if (assigned_to) {
      whereClause += " AND t.assigned_to = @assigned_to";
      params.push({ name: "assigned_to", value: assigned_to, type: sql.Int });
    }

    if (created_by) {
      whereClause += " AND t.created_by = @created_by";
      params.push({ name: "created_by", value: created_by, type: sql.Int });
    }

    if (search) {
      whereClause +=
        " AND (t.title LIKE @search OR t.description LIKE @search OR t.ticket_number LIKE @search)";
      params.push({
        name: "search",
        value: `%${search}%`,
        type: sql.NVarChar(255),
      });
    }

    if (plant) {
      whereClause += " AND pe.plant = @plant";
      params.push({ name: "plant", value: plant, type: sql.VarChar(50) });
    }

    if (area) {
      whereClause += " AND pe.area = @area";
      params.push({ name: "area", value: area, type: sql.VarChar(50) });
    }

    // Add team filter to WHERE clause if applicable
    if (teamDeptFilter) {
      whereClause += ` AND (
        (t.finished_by IS NOT NULL AND EXISTS (SELECT 1 FROM Person p_finished WHERE p_finished.PERSONNO = t.finished_by AND p_finished.DEPTNO IN ${teamDeptFilter}))
        OR (t.reviewed_by IS NOT NULL AND EXISTS (SELECT 1 FROM Person p_reviewed WHERE p_reviewed.PERSONNO = t.reviewed_by AND p_reviewed.DEPTNO IN ${teamDeptFilter}))
        OR (t.assigned_to IS NOT NULL AND EXISTS (SELECT 1 FROM Person p_assigned WHERE p_assigned.PERSONNO = t.assigned_to AND p_assigned.DEPTNO IN ${teamDeptFilter}))
      )`;
    }

    // Build the request with parameters
    let request = createSqlRequest(pool, params);

    // Add offset and limit parameters
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, parseInt(limit));

    // Get total count (with IgxPUExtension join for plant/area filters)
    const countResult = await request.query(`
            SELECT COUNT(*) as total 
            FROM IgxTickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
            ${whereClause}
        `);
    const total = countResult.recordset[0].total;

    // Get tickets with user information and hierarchy via IgxPUExtension
    // Using SQL Server 2008 compatible pagination with ROW_NUMBER()
    const ticketsResult = await request.query(`
            SELECT *
            FROM (
                SELECT 
                    t.*,
                    r.PERSON_NAME as reporter_name,
                    r.EMAIL as reporter_email,
                    r.PHONE as reporter_phone,
                    a.PERSON_NAME as assignee_name,
                    a.EMAIL as assignee_email,
                    a.PHONE as assignee_phone,
                    accepted_user.PERSON_NAME as accepted_by_name,
                    rejected_user.PERSON_NAME as rejected_by_name,
                    -- Hierarchy information from IgxPUExtension
                    pe.pucode,
                    pe.plant as plant_code,
                    pe.area as area_code,
                    pe.line as line_code,
                    pe.machine as machine_code,
                    pe.number as machine_number,
                    pe.pudescription as pudescription,
                    pe.digit_count,
                    -- Hierarchy names based on digit patterns
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area IS NULL 
                     AND pe2.line IS NULL 
                     AND pe2.machine IS NULL) as plant_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line IS NULL 
                     AND pe2.machine IS NULL) as area_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line = pe.line 
                     AND pe2.machine IS NULL) as line_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line = pe.line 
                     AND pe2.machine = pe.machine) as machine_name,
                    -- PU information
                    pu.PUCODE as pu_pucode,
                    pu.PUNAME as pu_name,
                    -- Ticket Class information
                    tc.name_en as ticket_class_en,
                    tc.name_th as ticket_class_th,
                    -- First image URL for preview
                    (SELECT TOP 1 image_url 
                     FROM IgxTicketImages 
                     WHERE ticket_id = t.id 
                     ORDER BY uploaded_at) as first_image_url,
                    ROW_NUMBER() OVER (ORDER BY t.created_at DESC) as row_num
                FROM IgxTickets t
                LEFT JOIN Person r ON t.created_by = r.PERSONNO
                LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
                LEFT JOIN Person accepted_user ON t.accepted_by = accepted_user.PERSONNO
                LEFT JOIN Person rejected_user ON t.rejected_by = rejected_user.PERSONNO
                LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
                LEFT JOIN IgxTicketClass tc ON t.ticketClass = tc.id
                ${whereClause}
            ) AS paginated_results
            WHERE row_num > @offset AND row_num <= @offset + @limit
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
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
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
    const result = await pool.request().input("id", sql.Int, id).query(`
                SELECT 
                    t.*,
                    r.PERSON_NAME as reporter_name,
                    r.EMAIL as reporter_email,
                    r.PHONE as reporter_phone,
                    a.PERSON_NAME as assignee_name,
                    a.EMAIL as assignee_email,
                    a.PHONE as assignee_phone,
                    -- Workflow tracking fields
                    accepted_user.PERSON_NAME as accepted_by_name,
                    rejected_user.PERSON_NAME as rejected_by_name,
                    finished_user.PERSON_NAME as finished_by_name,
                    escalated_user.PERSON_NAME as escalated_by_name,
                    approved_user.PERSON_NAME as approved_by_name,
                    reopened_user.PERSON_NAME as reopened_by_name,
                    
                    -- Hierarchy information from IgxPUExtension
                    pe.pucode,
                    pe.plant as plant_code,
                    pe.area as area_code,
                    pe.line as line_code,
                    pe.machine as machine_code,
                    pe.number as machine_number,
                    pe.pudescription as pudescription,
                    pe.digit_count,
                    -- Hierarchy names based on digit patterns
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area IS NULL 
                     AND pe2.line IS NULL 
                     AND pe2.machine IS NULL) as plant_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line IS NULL 
                     AND pe2.machine IS NULL) as area_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line = pe.line 
                     AND pe2.machine IS NULL) as line_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line = pe.line 
                     AND pe2.machine = pe.machine) as machine_name,
                    -- PU information
                    pu.PUCODE as pu_pucode,
                    pu.PUNAME as pu_name,
                    -- Equipment information
                    eq.EQNO as equipment_id,
                    eq.EQCODE as equipment_code,
                    eq.EQNAME as equipment_name,
                    -- Failure mode information
                    fm.FailureModeCode as failure_mode_code,
                    fm.FailureModeName as failure_mode_name,
                    -- Cedar integration information
                    wo.WFStatusCode as cedar_wf_status_code,
                    wo.COSTCENTERNO as cedar_cost_center_no,
                    -- Ticket Class information
                    tc.name_en as ticket_class_en,
                    tc.name_th as ticket_class_th
                FROM IgxTickets t
                LEFT JOIN Person r ON t.created_by = r.PERSONNO
                LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
                LEFT JOIN Person accepted_user ON t.accepted_by = accepted_user.PERSONNO
                LEFT JOIN Person rejected_user ON t.rejected_by = rejected_user.PERSONNO
                LEFT JOIN Person finished_user ON t.finished_by = finished_user.PERSONNO
                LEFT JOIN Person escalated_user ON t.escalated_by = escalated_user.PERSONNO
                LEFT JOIN Person approved_user ON t.approved_by = approved_user.PERSONNO
                LEFT JOIN Person reopened_user ON t.reopened_by = reopened_user.PERSONNO
              
                LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
                LEFT JOIN FailureModes fm ON t.failure_mode_id = fm.FailureModeNo AND fm.FlagDel != 'Y'
                LEFT JOIN EQ eq ON t.equipment_id = eq.EQNO AND eq.FLAGDEL = 'F'
                LEFT JOIN WO wo ON t.cedar_wono = wo.WONO
                LEFT JOIN IgxTicketClass tc ON t.ticketClass = tc.id
                WHERE t.id = @id
            `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket = result.recordset[0];

    // Get user's max approval level for this ticket's PU using the helper function
    const userApprovalLevel = await getUserMaxApprovalLevelForPU(
      userId,
      ticket.puno
    );

    // Determine user relationship to the ticket
    let userRelationship = "viewer";
    if (ticket.created_by === userId) {
      userRelationship = "creator";
    } else if (userApprovalLevel >= 2) {
      userRelationship = "approver";
    }

    // Get ticket images
    const imagesResult = await pool.request().input("ticket_id", sql.Int, id)
      .query(`
                SELECT * FROM IgxTicketImages WHERE ticket_id = @ticket_id ORDER BY uploaded_at
            `);

    // Get ticket comments
    const commentsResult = await pool.request().input("ticket_id", sql.Int, id)
      .query(`
                SELECT 
                    tc.*,
                    u.PERSON_NAME as user_name,
                    u.EMAIL as user_email,
                    ue.AvatarUrl as user_avatar_url
                FROM IgxTicketComments tc
                LEFT JOIN Person u ON tc.user_id = u.PERSONNO
                LEFT JOIN _secUsers s ON u.PERSONNO = s.PersonNo
                LEFT JOIN IgxUserExtension ue ON s.UserID = ue.UserID
                WHERE tc.ticket_id = @ticket_id 
                ORDER BY tc.created_at
            `);

    // Get comprehensive status history (including assignments)
    const historyResult = await pool.request().input("ticket_id", sql.Int, id)
      .query(`
                SELECT 
                    tsh.*,
                    u.PERSON_NAME as changed_by_name,
                    to_user_person.PERSON_NAME as to_user_name,
                    to_user_person.EMAIL as to_user_email
                FROM IgxTicketStatusHistory tsh
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
      data: ticket,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket",
      error: error.message,
    });
  }
};

// Update ticket
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const pool = await sql.connect(dbConfig);

    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const currentTicket = firstRecord(currentTicketResult);
    if (!currentTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const { status: oldStatus, created_by: reporterId } = currentTicket;

    // Build update query dynamically
    const updateFields = [];
    const params = [{ name: "id", value: id, type: sql.Int }];

    Object.keys(updateData).forEach((key) => {
      if (key !== "id" && key !== "ticket_number" && key !== "created_by") {
        updateFields.push(`${key} = @${key}`);
        params.push({
          name: key,
          value: updateData[key],
          type: sql.VarChar(255),
        });
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updateFields.push("updated_at = GETDATE()");

    // Build the request with parameters
    let request = createSqlRequest(pool, params);

    await request.query(`
            UPDATE IgxTickets 
            SET ${updateFields.join(", ")}
            WHERE id = @id
        `);

    // Log status change if status was updated
    if (updateData.status && updateData.status !== oldStatus) {
      await insertStatusHistory(pool, {
        ticketId: id,
        oldStatus,
        newStatus: updateData.status,
        changedBy: req.user.id,
        notes: updateData.status_notes || "Status updated",
      });

      const detailResult = await runQuery(
        pool,
        `
                SELECT 
                    t.id, t.ticket_number, t.title, t.severity_level, t.priority,
                    t.puno,
                    pe.plant as plant_code,
                    pe.area as area_code,
                    pe.line as line_code,
                    pe.machine as machine_code,
                    pe.number as machine_number
                FROM IgxTickets t
                LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
                WHERE t.id = @ticket_id;

                SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, ue.LineID 
                FROM Person p
                LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
                WHERE p.PERSONNO = @reporter_id;
            `,
        [
          { name: "ticket_id", type: sql.Int, value: id },
          { name: "reporter_id", type: sql.Int, value: reporterId },
        ]
      );

      const ticketData = detailResult.recordsets[0]?.[0];
      const reporter = detailResult.recordsets[1]?.[0];
      const changedByName = getUserDisplayNameFromRequest(req);

      const reporterForQueue =
        (reporter?.EMAIL || reporter?.LineID) ?
          { EMAIL: reporter?.EMAIL || null, LineID: reporter?.LineID || null } :
          null;
      if (reporterForQueue) {
        const linePayload = {
          caseNo: ticketData.ticket_number,
          assetName:
            ticketData.PUNAME ||
            ticketData.machine_number ||
            "Unknown Asset",
          problem: ticketData.title || "No description",
          actionBy: changedByName,
          comment:
            updateData.status_notes ||
            `สถานะเปลี่ยนจาก ${oldStatus} เป็น ${updateData.status}`,
          detailUrl: getTicketDetailUrl(ticketData.id),
        };
        await notificationQueue.addStatusUpdateTicketNotificationJob({
          ticketData,
          oldStatus,
          newStatus: updateData.status,
          changedByName,
          reporter: reporterForQueue,
          linePayload,
        });
      }
    }

    res.json({
      success: true,
      message: "Ticket updated successfully",
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update ticket",
      error: error.message,
    });
  }
};

// Update ticket detail (L3/L4 with PU right, any status)
const updateTicketDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const rawBody = req.body ? { ...req.body } : {};
    const pool = await sql.connect(dbConfig);

    const ticketResult = await runQuery(
      pool,
      `
        SELECT id, puno
        FROM IgxTickets
        WHERE id = @id
      `,
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(ticketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const approvalLevel = await getUserMaxApprovalLevelForPU(req.user.id, ticket.puno);
    if (approvalLevel < 3) {
      return res.status(403).json({
        success: false,
        message: "Only L3/L4 users with permission on this PU can edit ticket details",
      });
    }

    const parseOptionalInt = (value) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      if (typeof value === "number") {
        return Number.isNaN(value) ? null : Math.trunc(value);
      }
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const parseOptionalDecimal = (value) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      if (typeof value === "number") {
        return Number.isNaN(value) ? null : value;
      }
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const parseOptionalString = (value, { trim = true, emptyAsNull = true } = {}) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const str = String(value);
      const normalized = trim ? str.trim() : str;
      if (emptyAsNull && normalized === "") return null;
      return normalized;
    };

    const parseOptionalDate = (value, label) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${label} is invalid`);
      }
      return parsed;
    };

    let title;
    let description;
    let pucriticalno;
    let schedule_start;
    let schedule_finish;
    let actual_start_at;
    let actual_finish_at;
    let satisfaction_rating;
    let cost_avoidance;
    let downtime_avoidance_hours;
    let failure_mode_id;
    let ticketClass;

    try {
      title = parseOptionalString(rawBody.title, { emptyAsNull: false });
      description = parseOptionalString(rawBody.description);
      pucriticalno = parseOptionalInt(rawBody.pucriticalno);
      schedule_start = parseOptionalDate(rawBody.schedule_start, "Schedule start");
      schedule_finish = parseOptionalDate(rawBody.schedule_finish, "Schedule finish");
      actual_start_at = parseOptionalDate(rawBody.actual_start_at, "Actual start");
      actual_finish_at = parseOptionalDate(rawBody.actual_finish_at, "Actual finish");
      satisfaction_rating = parseOptionalInt(rawBody.satisfaction_rating);
      cost_avoidance = parseOptionalDecimal(rawBody.cost_avoidance);
      downtime_avoidance_hours = parseOptionalDecimal(rawBody.downtime_avoidance_hours);
      failure_mode_id = parseOptionalInt(rawBody.failure_mode_id);
      ticketClass = parseOptionalInt(rawBody.ticketClass);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message || "Invalid ticket detail payload",
      });
    }

    if (title !== undefined && title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (satisfaction_rating !== undefined && satisfaction_rating !== null) {
      if (satisfaction_rating < 1 || satisfaction_rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Satisfaction rating must be between 1 and 5",
        });
      }
    }

    if (schedule_start && schedule_finish && schedule_start > schedule_finish) {
      return res.status(400).json({
        success: false,
        message: "Schedule finish must be later than schedule start",
      });
    }

    if (actual_start_at && actual_finish_at && actual_start_at > actual_finish_at) {
      return res.status(400).json({
        success: false,
        message: "Actual finish must be later than actual start",
      });
    }

    if (ticketClass !== undefined && ticketClass !== null) {
      const ticketClassCheck = await runQuery(
        pool,
        `
          SELECT id
          FROM IgxTicketClass
          WHERE id = @ticketClass
        `,
        [{ name: "ticketClass", type: sql.Int, value: ticketClass }]
      );

      if (mapRecordset(ticketClassCheck).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket class",
        });
      }
    }

    if (failure_mode_id !== undefined && failure_mode_id !== null) {
      const failureModeCheck = await runQuery(
        pool,
        `
          SELECT FailureModeNo
          FROM FailureModes
          WHERE FailureModeNo = @failure_mode_id
            AND FlagDel != 'Y'
        `,
        [{ name: "failure_mode_id", type: sql.Int, value: failure_mode_id }]
      );

      if (mapRecordset(failureModeCheck).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid failure mode",
        });
      }
    }

    const updates = [
      { key: "title", value: title, type: sql.NVarChar(255) },
      { key: "description", value: description, type: sql.NVarChar(sql.MAX) },
      { key: "pucriticalno", value: pucriticalno, type: sql.Int },
      { key: "schedule_start", value: schedule_start, type: sql.DateTime2 },
      { key: "schedule_finish", value: schedule_finish, type: sql.DateTime2 },
      { key: "actual_start_at", value: actual_start_at, type: sql.DateTime2 },
      { key: "actual_finish_at", value: actual_finish_at, type: sql.DateTime2 },
      { key: "satisfaction_rating", value: satisfaction_rating, type: sql.Int },
      { key: "cost_avoidance", value: cost_avoidance, type: sql.Decimal(15, 2) },
      {
        key: "downtime_avoidance_hours",
        value: downtime_avoidance_hours,
        type: sql.Decimal(8, 2),
      },
      { key: "failure_mode_id", value: failure_mode_id, type: sql.Int },
      { key: "ticketClass", value: ticketClass, type: sql.Int },
    ].filter((field) => field.value !== undefined);

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const request = pool.request().input("id", sql.Int, id);
    const updateFields = [];

    updates.forEach(({ key, value, type }) => {
      request.input(key, type, value);
      updateFields.push(`${key} = @${key}`);
    });

    await request.query(`
      UPDATE IgxTickets
      SET ${updateFields.join(", ")},
          updated_at = GETDATE()
      WHERE id = @id
    `);

    return res.json({
      success: true,
      message: "Ticket details updated successfully",
    });
  } catch (error) {
    console.error("Error updating ticket details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket details",
      error: error.message,
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

    const result = await pool
      .request()
      .input("ticket_id", sql.Int, id)
      .input("user_id", sql.Int, user_id)
      .input("comment", sql.NVarChar(sql.MAX), comment).query(`
                INSERT INTO IgxTicketComments (ticket_id, user_id, comment)
                VALUES (@ticket_id, @user_id, @comment);
                SELECT SCOPE_IDENTITY() as id;
            `);

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: {
        id: result.recordset[0].id,
        comment,
        user_id,
        created_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
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
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("assigned_to", sql.Int, assigned_to).query(`
                UPDATE IgxTickets SET assigned_to = @assigned_to, updated_at = GETDATE() WHERE id = @id;
                UPDATE IgxTickets 
                SET status = 'assigned', updated_at = GETDATE()
                WHERE id = @id AND status = 'open';
            `);

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: "open",
      newStatus: "assigned",
      changedBy: assigned_by,
      toUser: assigned_to,
      notes,
    });

    const detailResult = await runQuery(
      pool,
      `
            SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
                   pe.plant as plant_code,
                   pe.area as area_code,
                   pe.line as line_code,
                   pe.machine as machine_code,
                   pe.number as machine_number
            FROM IgxTickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
            WHERE t.id = @ticket_id;

            SELECT PERSON_NAME, EMAIL, DEPTNO, LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
            WHERE p.PERSONNO = @assignee_id;
        `,
      [
        { name: "ticket_id", type: sql.Int, value: id },
        { name: "assignee_id", type: sql.Int, value: assigned_to },
      ]
    );

    const ticketData = detailResult.recordsets[0]?.[0];
    const assignee = detailResult.recordsets[1]?.[0];
    const assigneeDisplayName = formatPersonName(assignee, "Assignee");

    if (assignee?.EMAIL || assignee?.LineID) {
      const linePayload = {
        caseNo: ticketData.ticket_number,
        assetName:
          ticketData.PUNAME ||
          ticketData.machine_number ||
          "Unknown Asset",
        problem: ticketData.title || "No description",
        actionBy: assigneeDisplayName,
        comment: notes || "งานได้รับการมอบหมายให้คุณแล้ว",
        detailUrl: getTicketDetailUrl(ticketData.id),
      };
      await notificationQueue.addAssignmentTicketNotificationJob({
        ticketData,
        assigneeDisplayName,
        assignee: { EMAIL: assignee?.EMAIL || null, LineID: assignee?.LineID || null },
        linePayload,
      });
    }

    res.json({
      success: true,
      message: "Ticket assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign ticket",
      error: error.message,
    });
  }
};

// Delete ticket
const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const pool = await sql.connect(dbConfig);

    // First, get ticket details for logging
    const ticketResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT ticket_number, created_by FROM IgxTickets WHERE id = @id");

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket = ticketResult.recordset[0];

    // Add audit log entry before deletion
    await pool
      .request()
      .input("ticket_id", sql.Int, id)
      .input("user_id", sql.Int, userId)
      .input(
        "comment",
        sql.NVarChar(sql.MAX),
        `Ticket deleted: ${reason || "No reason provided"}`
      ).query(`
                INSERT INTO IgxTicketComments (ticket_id, user_id, comment, created_at)
                VALUES (@ticket_id, @user_id, @comment, GETDATE())
            `);

    // Delete the ticket
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM IgxTickets WHERE id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    console.log(
      `Ticket ${ticket.ticket_number} deleted by user ${userId}. Reason: ${
        reason || "No reason provided"
      }`
    );

    res.json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
      error: error.message,
    });
  }
};

// Upload ticket image
const uploadTicketImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image_type = "other", image_name } = req.body;
    const user_id = req.user.id;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded" });
    }

    const pool = await sql.connect(dbConfig);

    // Ensure ticket exists and get ticket number
    const ticketResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT id, ticket_number FROM IgxTickets WHERE id = @id");
    if (ticketResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    
    const ticket = ticketResult.recordset[0];
    const ticketNumber = ticket.ticket_number;
    
    // Use ticket number for easier search and identification
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname) || '.jpg';
    let newFileName = `${ticketNumber}_${image_type}_${timestamp}${ext.toLowerCase()}`;
    
    // Rename the uploaded file to use ticket number-based naming
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'tickets', String(id));
    const oldPath = path.join(uploadDir, req.file.filename);
    const newPath = path.join(uploadDir, newFileName);
    
    try {
      await fs.promises.rename(oldPath, newPath);
    } catch (renameError) {
      console.error('Error renaming file:', renameError);
      // If rename fails, use the original filename
      newFileName = req.file.filename;
    }
    
    // Build public URL path for the renamed file
    const relativePath = `/uploads/tickets/${id}/${newFileName}`;

    // Insert image record
    const result = await pool
      .request()
      .input("ticket_id", sql.Int, id)
      .input("image_type", sql.VarChar(20), image_type)
      .input("image_url", sql.NVarChar(500), relativePath)
      .input("image_name", sql.NVarChar(255), newFileName)
      .input("uploaded_by", sql.Int, user_id).query(`
                INSERT INTO IgxTicketImages (ticket_id, image_type, image_url, image_name, uploaded_by, uploaded_at)
                VALUES (@ticket_id, @image_type, @image_url, @image_name, @uploaded_by, GETDATE());
                SELECT SCOPE_IDENTITY() as id;
            `);

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        id: result.recordset[0].id,
        ticket_id: parseInt(id, 10),
        image_type,
        image_url: relativePath,
        image_name: image_name || req.file.originalname,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user_id,
      },
    });
  } catch (error) {
    console.error("Error uploading ticket image:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to upload image",
        error: error.message,
      });
  }
};

// Delete ticket image (DB record and file if present)
const deleteTicketImage = async (req, res) => {
  try {
    const { id, imageId } = req.params; // id is ticket id
    const pool = await sql.connect(dbConfig);

    // Fetch image record and validate ownership
    const imgResult = await pool
      .request()
      .input("imageId", sql.Int, imageId)
      .input("ticket_id", sql.Int, id).query(`
                SELECT id, ticket_id, image_url 
                FROM IgxTicketImages 
                WHERE id = @imageId AND ticket_id = @ticket_id
            `);

    if (imgResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });
    }

    const image = imgResult.recordset[0];

    // Get ticket basic info for ownership check
    const ticketResult = await pool
      .request()
      .input("ticket_id", sql.Int, id)
      .query(`
        SELECT created_by, assigned_to, puno
        FROM IgxTickets 
        WHERE id = @ticket_id
      `);
    
    if (ticketResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    
    const ticket = ticketResult.recordset[0];
    
    // Check ownership: creator, assignee, or L2+ can delete
    const isOwner = ticket.created_by === req.user.id || ticket.assigned_to === req.user.id;
    
    // Get user's max approval level for this PU using helper
    const userMaxApprovalLevel = await getUserMaxApprovalLevelForPU(req.user.id, ticket.puno);
    const isL2Plus = userMaxApprovalLevel >= 2;
    
    if (!isOwner && !isL2Plus) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not permitted to delete this image",
        });
    }

    // Delete DB record first (so UI reflects state even if file removal fails)
    await pool
      .request()
      .input("imageId", sql.Int, image.id)
      .query("DELETE FROM IgxTicketImages WHERE id = @imageId");

    // Attempt to remove file from disk
    try {
      if (image.image_url) {
        // image_url starts with /uploads/... Map it to filesystem under backend/uploads
        const normalized = image.image_url.replace(/^\\+/g, "/");
        const relative = normalized.startsWith("/uploads/")
          ? normalized.substring("/uploads/".length)
          : normalized;
        const filePathPrimary = path.join(__dirname, "..", "uploads", relative);
        const filePathAlt = path.join(__dirname, "uploads", relative); // legacy location

        if (fs.existsSync(filePathPrimary)) {
          fs.unlink(filePathPrimary, () => {});
        } else if (fs.existsSync(filePathAlt)) {
          fs.unlink(filePathAlt, () => {});
        }
      }
    } catch (fileErr) {
      console.warn("Failed to remove image file:", fileErr.message);
    }

    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket image:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to delete image",
        error: error.message,
      });
  }
};

// Accept ticket (L2 or L3)
const acceptTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, schedule_finish, new_puno, new_equipment_id, new_pucriticalno } = req.body;

    // In new workflow, scheduled completion date is optional for accept action
    // It will be set during the planning phase
    const accepted_by = req.user.id;
    const pool = await sql.connect(dbConfig);

    // In new workflow, scheduled completion date is optional for accept action
    // No validation needed for schedule_finish

    // Get current ticket status and equipment info
    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by, assigned_to, puno, equipment_id, pucriticalno FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }
    const { status, created_by, assigned_to, puno, equipment_id, pucriticalno } = ticket;

    // Check if user has permission to accept tickets
    const permissionCheck = await checkUserActionPermission(
      accepted_by,
      puno,
      "accept"
    );
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to accept tickets for this location",
      });
    }

    // Validate new equipment parameters if provided
    let validatedNewPuno = puno;
    let validatedNewEquipmentId = equipment_id;
    let validatedNewPucriticalno = pucriticalno;
    let equipmentChanged = false;
    let criticalLevelChanged = false;

    // Check if critical level is being changed (even without PU change)
    if (new_pucriticalno !== undefined && new_pucriticalno !== pucriticalno) {
      validatedNewPucriticalno = new_pucriticalno;
      criticalLevelChanged = true;
    }

    if (new_puno !== undefined && new_puno !== puno) {
      // Validate that new_puno exists in PU table
      const puCheck = await runQuery(
        pool,
        "SELECT PUNO, PUCODE, PUNAME FROM PU WHERE PUNO = @puno AND FLAGDEL != 'Y'",
        [{ name: "puno", type: sql.Int, value: new_puno }]
      );

      if (mapRecordset(puCheck).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Production unit not found",
        });
      }

      validatedNewPuno = new_puno;
      equipmentChanged = true;

      // If new_equipment_id is provided, validate it belongs to the new_puno
      if (new_equipment_id !== undefined) {
        if (new_equipment_id === null) {
          // Explicitly clearing equipment
          validatedNewEquipmentId = null;
        } else {
          const equipmentCheck = await runQuery(
            pool,
            "SELECT EQNO, EQCODE, EQNAME FROM EQ WHERE EQNO = @equipment_id AND PUNO = @puno AND FLAGDEL = 'F'",
            [
              { name: "equipment_id", type: sql.Int, value: new_equipment_id },
              { name: "puno", type: sql.Int, value: new_puno }
            ]
          );

          if (mapRecordset(equipmentCheck).length === 0) {
            return res.status(400).json({
              success: false,
              message: "Equipment not found or does not belong to the selected production unit",
            });
          }

          validatedNewEquipmentId = new_equipment_id;
        }
      }

      // Update critical level if provided
      if (new_pucriticalno !== undefined) {
        validatedNewPucriticalno = new_pucriticalno;
      }
    }

    let newStatus = "accepted";
    let statusNotes = "Ticket accepted - ready for planning";

    // Handle different acceptance scenarios
    if (ticket.status === "open") {
      // L2 accepting new ticket
      newStatus = "accepted";
      statusNotes = "Ticket accepted by L2 - ready for planning";
    } else if (ticket.status === "rejected_pending_l3_review") {
      // L3 overriding L2 rejection
      newStatus = "accepted";
      statusNotes =
        "Ticket accepted by L3 after L2 rejection - ready for planning";
    } else if (ticket.status === "reopened_in_progress") {
      // L2 accepting reopened ticket
      newStatus = "accepted";
      statusNotes = "Reopened ticket accepted - ready for planning";
    }

    // Prepare status notes with equipment change details if applicable
    let finalStatusNotes = notes || statusNotes;
    let oldEquipmentData = null;
    
    if (equipmentChanged) {
      // Get old equipment details BEFORE updating the ticket
      const oldEquipmentResult = await runQuery(
        pool,
        `SELECT pu.PUCODE as old_pucode, pu.PUNAME as old_puname, 
                eq.EQCODE as old_eqcode, eq.EQNAME as old_eqname,
                t.pucriticalno as old_critical
         FROM IgxTickets t
         LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
         LEFT JOIN EQ eq ON t.equipment_id = eq.EQNO AND eq.FLAGDEL = 'F'
         WHERE t.id = @id`,
        [{ name: "id", type: sql.Int, value: id }]
      );

      oldEquipmentData = firstRecord(oldEquipmentResult);
    }

    // Update ticket status and equipment info with workflow tracking
    const updateRequest = pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), newStatus)
      .input("accepted_by", sql.Int, accepted_by);

    // Add equipment fields to update if they changed
    if (equipmentChanged) {
      updateRequest
        .input("new_puno", sql.Int, validatedNewPuno)
        .input("new_equipment_id", sql.Int, validatedNewEquipmentId);
    }
    
    // Add critical level to update if it changed
    if (criticalLevelChanged) {
      updateRequest
        .input("new_pucriticalno", sql.Int, validatedNewPucriticalno);
    }

    await updateRequest.query(`
                UPDATE IgxTickets 
                SET status = @status, 
                    accepted_at = GETDATE(),
                    accepted_by = @accepted_by,
                    ${equipmentChanged ? 'puno = @new_puno,' : ''}
                    ${equipmentChanged ? 'equipment_id = @new_equipment_id,' : ''}
                    ${criticalLevelChanged ? 'pucriticalno = @new_pucriticalno,' : ''}
                    updated_at = GETDATE()
                WHERE id = @id
            `);

    // Prepare status notes with production unit/critical level change details if applicable
    if (equipmentChanged && oldEquipmentData) {
      // Get new equipment details for status history
      const newEquipmentResult = await runQuery(
        pool,
        `SELECT pu.PUCODE as new_pucode, pu.PUNAME as new_puname,
                eq.EQCODE as new_eqcode, eq.EQNAME as new_eqname
         FROM PU pu
         LEFT JOIN EQ eq ON eq.PUNO = pu.PUNO AND eq.EQNO = @equipment_id AND eq.FLAGDEL = 'F'
         WHERE pu.PUNO = @puno AND pu.FLAGDEL != 'Y'`,
        [
          { name: "puno", type: sql.Int, value: validatedNewPuno },
          { name: "equipment_id", type: sql.Int, value: validatedNewEquipmentId }
        ]
      );

      const newEquipment = firstRecord(newEquipmentResult);

      let changeDescription = "Production Unit changed from ";
      if (oldEquipmentData?.old_pucode) {
        changeDescription += `${oldEquipmentData.old_pucode} (${oldEquipmentData.old_puname})`;
        if (oldEquipmentData.old_eqcode) {
          changeDescription += ` - ${oldEquipmentData.old_eqcode} (${oldEquipmentData.old_eqname})`;
        }
        if (oldEquipmentData.old_critical) {
          changeDescription += ` [Critical: ${oldEquipmentData.old_critical}]`;
        }
      } else {
        changeDescription += "unspecified";
      }

      changeDescription += " to ";
      if (newEquipment?.new_pucode) {
        changeDescription += `${newEquipment.new_pucode} (${newEquipment.new_puname})`;
        if (newEquipment.new_eqcode) {
          changeDescription += ` - ${newEquipment.new_eqcode} (${newEquipment.new_eqname})`;
        }
        if (validatedNewPucriticalno) {
          changeDescription += ` [Critical: ${validatedNewPucriticalno}]`;
        }
      } else {
        changeDescription += "unspecified";
      }

      finalStatusNotes = `${statusNotes}. ${changeDescription}`;
    } else if (criticalLevelChanged && !equipmentChanged) {
      // Only critical level changed, not PU
      const oldCriticalText = pucriticalno ? `Critical Level ${pucriticalno}` : "No Critical Level";
      const newCriticalText = validatedNewPucriticalno ? `Critical Level ${validatedNewPucriticalno}` : "No Critical Level";
      finalStatusNotes = `${statusNotes}. Critical Level changed from ${oldCriticalText} to ${newCriticalText}`;
    }

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus,
      changedBy: accepted_by,
      notes: finalStatusNotes,
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      accepted_by,
      ticket.status,
      newStatus,
      finalStatusNotes
    );

    // 🆕 CEDAR INTEGRATION: CREATE Work Order in Cedar CMMS when ticket is accepted
    // Status: accepted → WOStatusNo: 1, WFStatusCode: 10
    try {
      console.log(
        `🔄 Creating Cedar WO for ticket ${id} (accepted by ${accepted_by})`
      );
      console.log(
        `📋 New Workflow: Ticket status changed to 'accepted' - WO will be created with WOStatusNo=1, Code=10`
      );

      const cedarResult = await cedarIntegrationService.syncTicketToCedar(
        id,
        "accept",
        {
          newStatus,
          changedBy: accepted_by,
          notes: notes || statusNotes,
          scheduledFinish: schedule_finish || null,
          assignedTo: accepted_by,
        }
      );

      if (cedarResult.success && cedarResult.wono) {
        console.log(
          `✅ Cedar WO created: ${cedarResult.wocode} (${cedarResult.wono}) with WOStatusNo=1, Code=10`
        );
      } else {
        console.log(`ℹ️ Cedar WO creation: ${cedarResult.message}`);
      }
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the accept action if Cedar fails
    }

    const detailResult = await runQuery(
      pool,
      `
            SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.puno,
                   pu.PUCODE, pu.PUNAME,
                   pe.plant as plant_code,
                   pe.area as area_code,
                   pe.line as line_code,
                   pe.machine as machine_code,
                   pe.number as machine_number
            FROM IgxTickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
            WHERE t.id = @ticket_id;

            SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, ue.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
            WHERE p.PERSONNO = @reporter_id;
        `,
      [
        { name: "ticket_id", type: sql.Int, value: id },
        { name: "reporter_id", type: sql.Int, value: ticket.created_by },
      ]
    );

    const ticketData = detailResult.recordsets[0]?.[0];
    const reporter = detailResult.recordsets[1]?.[0];
    const acceptorName = getUserDisplayNameFromRequest(req);

    // Send notifications according to new workflow logic: requester + actor (acceptor)
    await safeSendNotifications("send ticket acceptance notifications", async () => {
      try {
        // Get notification users using the new workflow system (single call)
        const notificationUsers = await getTicketNotificationRecipients(
          id,
          "accept",
          accepted_by
        );
        console.log(`\n=== TICKET ACCEPTANCE NOTIFICATIONS SUMMARY ===`);
        console.log(`Ticket: ${ticketData.ticket_number} (ID: ${id})`);
        console.log(`Action: ACCEPT`);
        console.log(`Accepted by: ${accepted_by} (${acceptorName})`);
        console.log(
          `Total notification users from SP: ${notificationUsers.length}`
        );

        if (notificationUsers.length === 0) {
          console.log(`⚠️  No notification users found for accept action`);
          console.log(`=== END NOTIFICATION SUMMARY ===\n`);
          return;
        }

        // LOG ALL NOTIFICATION USERS BEFORE FILTERING
        console.log("\n📋 ALL NOTIFICATION USERS (Before Filtering):");
        notificationUsers.forEach((user, index) => {
          const hasEmail = user.EMAIL && user.EMAIL.trim() !== "";
          const hasLineID = user.LineID && user.LineID.trim() !== "";
          const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : "❌ No Email";
          const lineStatus = hasLineID ? `✅ ${user.LineID}` : "❌ No LineID";

          console.log(
            `  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`
          );
          console.log(`     └─ Reason: ${user.notification_reason}`);
          console.log(`     └─ Type: ${user.recipient_type}`);
          console.log(`     └─ Email: ${emailStatus}`);
          console.log(`     └─ LineID: ${lineStatus}`);
        });

        // COUNT USERS BY RECIPIENT TYPE
        const userCounts = notificationUsers.reduce((counts, user) => {
          const type = user.recipient_type || "Unknown";
          counts[type] = (counts[type] || 0) + 1;
          return counts;
        }, {});

        console.log("\n📊 RECIPIENT TYPE BREAKDOWN:");
        Object.entries(userCounts).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count} user(s)`);
        });

        // COUNT USERS BY NOTIFICATION CAPABILITY
        const emailCapable = notificationUsers.filter(
          (u) => u.EMAIL && u.EMAIL.trim() !== ""
        ).length;
        const lineCapable = notificationUsers.filter(
          (u) => u.LineID && u.LineID.trim() !== ""
        ).length;
        const bothCapable = notificationUsers.filter(
          (u) =>
            u.EMAIL &&
            u.EMAIL.trim() !== "" &&
            u.LineID &&
            u.LineID.trim() !== ""
        ).length;
        const noContactInfo = notificationUsers.filter(
          (u) =>
            (!u.EMAIL || u.EMAIL.trim() === "") &&
            (!u.LineID || u.LineID.trim() === "")
        ).length;

        console.log("\n📞 NOTIFICATION CAPABILITY:");
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
          created_by: ticket.created_by,
          assigned_to: accepted_by,
          created_at: new Date().toISOString(),
        };

        // Filter recipients for each notification type
        const emailRecipients = notificationUsers.filter(
          (user) => user.EMAIL && user.EMAIL.trim() !== ""
        );
        const lineRecipients = notificationUsers.filter(
          (user) => user.LineID && user.LineID.trim() !== ""
        );

        console.log("\n📧 EMAIL RECIPIENTS (After Filtering):");
        if (emailRecipients.length === 0) {
          console.log("  ⚠️  No email-capable recipients found");
        } else {
          emailRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        console.log("\n💬 LINE RECIPIENTS (After Filtering):");
        if (lineRecipients.length === 0) {
          console.log("  ⚠️  No LINE-capable recipients found");
        } else {
          lineRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        const linePayload = {
          caseNo: ticketData.ticket_number,
          assetName:
            ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
          problem: ticketData.title || "No description",
          detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
          comment: notes || `งานได้รับการยอมรับแล้ว โดย ${acceptorName}`,
          extraKVs: [
            { label: "Status", value: "ACCEPTED" },
            { label: "Accepted by", value: acceptorName },
          ],
        };

        await notificationQueue.addAcceptTicketNotificationJob({
          ticketData: ticketDataForNotifications,
          acceptorName,
          emailRecipients,
          lineRecipients,
          linePayload,
        });
        console.log(`\n=== NOTIFICATION SUMMARY Finished ===`);
        console.log(
          `📊 Enqueued: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE (accept-ticket)`
        );
        console.log(`=== END NOTIFICATION SUMMARY ===\n`);
      } catch (error) {
        console.error(
          "Error sending notifications for ticket acceptance:",
          error
        );
        throw error;
      }
    });

    res.json({
      success: true,
      message: "Ticket accepted successfully",
      data: { status: newStatus, assigned_to: accepted_by },
    });
  } catch (error) {
    console.error("Error accepting ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept ticket",
      error: error.message,
    });
  }
};

// Plan ticket (L2 or L3) - NEW WORKFLOW
const planTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, schedule_start, schedule_finish, assigned_to } = req.body;
    const planed_by = req.user.id;
    const pool = await sql.connect(dbConfig);

    // Validate required fields
    if (!schedule_start || !schedule_finish || !assigned_to) {
      return res.status(400).json({
        success: false,
        message:
          "Schedule start, schedule finish, and assigned user are required",
      });
    }

    // Get current ticket status and puno
    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by, assigned_to, puno FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check if ticket is in accepted status
    if (ticket.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Only accepted tickets can be planned",
      });
    }

    // Check if user has permission to plan tickets
    const permissionCheck = await checkUserActionPermission(
      planed_by,
      ticket.puno,
      "plan"
    );
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to plan tickets for this location",
      });
    }

    // Validate assigned user has L2+ approval level for this PU
    const assigneeCheck = await getAvailableAssigneesForPU(ticket.puno, 2);
    const validAssignee = assigneeCheck.find(
      (user) => user.PERSONNO === assigned_to
    );
    if (!validAssignee) {
      return res.status(400).json({
        success: false,
        message:
          "Selected assignee does not have L2+ approval level for this location",
      });
    }

    // Update ticket status to planed with workflow tracking
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "planed")
      .input("assigned_to", sql.Int, assigned_to)
      .input("planed_by", sql.Int, planed_by)
      .input("schedule_start", sql.DateTime2, new Date(schedule_start))
      .input("schedule_finish", sql.DateTime2, new Date(schedule_finish))
      .query(`
                UPDATE IgxTickets 
                SET status = @status, 
                    assigned_to = @assigned_to,
                    planed_at = GETDATE(),
                    planed_by = @planed_by,
                    schedule_start = @schedule_start,
                    schedule_finish = @schedule_finish,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: "planed",
      changedBy: planed_by,
      toUser: assigned_to,
      notes: notes || "Ticket planned and scheduled",
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      planed_by,
      ticket.status,
      "planed",
      notes
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    // Status: planed → WOStatusNo: 3, WFStatusCode: 30
    try {
      console.log(`🔄 Updating Cedar WO status for ticket ${id} to planed`);
      console.log(
        `📋 New Workflow: Ticket status changed to 'planed' - WO will be updated with WOStatusNo=3, Code=30`
      );

      await cedarIntegrationService.syncTicketToCedar(id, "plan", {
        newStatus: "planed",
        changedBy: planed_by,
        notes: notes || "Ticket planned and scheduled",
        scheduleStart: schedule_start,
        scheduleFinish: schedule_finish,
        assignedTo: assigned_to,
        // Additional data for Cedar integration
        schedule_start: schedule_start,
        schedule_finish: schedule_finish,
        assigned_to: assigned_to,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id} to planed`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the plan action if Cedar fails
    }

    // Send notifications according to new workflow logic: requester + assignee + actor (planner)
    await safeSendNotifications("send ticket planning notifications", async () => {
      try {
        // Get notification users using the new workflow system (single call)
        const notificationUsers = await getTicketNotificationRecipients(
          id,
          "plan",
          planed_by
        );
        console.log(`\n=== TICKET PLANNING NOTIFICATIONS SUMMARY ===`);
        console.log(`Ticket: ${id} (ID: ${id})`);
        console.log(`Action: PLAN`);
        console.log(
          `Planned by: ${planed_by} (${getUserDisplayNameFromRequest(req)})`
        );
        console.log(
          `Assigned to: ${assigned_to} (${validAssignee.PERSON_NAME})`
        );
        console.log(`Schedule: ${schedule_start} to ${schedule_finish}`);
        console.log(
          `Total notification users from SP: ${notificationUsers.length}`
        );

        if (notificationUsers.length === 0) {
          console.log(`⚠️  No notification users found for plan action`);
          console.log(`=== END NOTIFICATION SUMMARY ===\n`);
          return;
        }

        // LOG ALL NOTIFICATION USERS BEFORE FILTERING
        console.log("\n📋 ALL NOTIFICATION USERS (Before Filtering):");
        notificationUsers.forEach((user, index) => {
          const hasEmail = user.EMAIL && user.EMAIL.trim() !== "";
          const hasLineID = user.LineID && user.LineID.trim() !== "";
          const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : "❌ No Email";
          const lineStatus = hasLineID ? `✅ ${user.LineID}` : "❌ No LineID";

          console.log(
            `  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`
          );
          console.log(`     └─ Reason: ${user.notification_reason}`);
          console.log(`     └─ Type: ${user.recipient_type}`);
          console.log(`     └─ Email: ${emailStatus}`);
          console.log(`     └─ LineID: ${lineStatus}`);
        });

        // COUNT USERS BY RECIPIENT TYPE
        const userCounts = notificationUsers.reduce((counts, user) => {
          const type = user.recipient_type || "Unknown";
          counts[type] = (counts[type] || 0) + 1;
          return counts;
        }, {});

        console.log("\n📊 RECIPIENT TYPE BREAKDOWN:");
        Object.entries(userCounts).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count} user(s)`);
        });

        // COUNT USERS BY NOTIFICATION CAPABILITY
        const emailCapable = notificationUsers.filter(
          (u) => u.EMAIL && u.EMAIL.trim() !== ""
        ).length;
        const lineCapable = notificationUsers.filter(
          (u) => u.LineID && u.LineID.trim() !== ""
        ).length;
        const bothCapable = notificationUsers.filter(
          (u) =>
            u.EMAIL &&
            u.EMAIL.trim() !== "" &&
            u.LineID &&
            u.LineID.trim() !== ""
        ).length;
        const noContactInfo = notificationUsers.filter(
          (u) =>
            (!u.EMAIL || u.EMAIL.trim() === "") &&
            (!u.LineID || u.LineID.trim() === "")
        ).length;

        console.log("\n📞 NOTIFICATION CAPABILITY:");
        console.log(`  • Email capable: ${emailCapable} user(s)`);
        console.log(`  • LINE capable: ${lineCapable} user(s)`);
        console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
        console.log(`  • No contact info: ${noContactInfo} user(s)`);

        // Get ticket details for notification data
        const ticketDetailResult = await runQuery(
          pool,
          `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno, t.pucriticalno,
                           pu.PUCODE, pu.PUNAME,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM IgxTickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `,
          [{ name: "ticket_id", type: sql.Int, value: id }]
        );

        const ticketData = firstRecord(ticketDetailResult);
        const plannerName = getUserDisplayNameFromRequest(req);

        // Prepare ticket data for notifications
        const ticketDataForNotifications = {
          id: id,
          ticket_number: ticketData.ticket_number,
          title: ticketData.title,
          description: ticketData.title, // Using title as description for plan notifications
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
          created_by: ticket.created_by,
          assigned_to: assigned_to,
          schedule_start: schedule_start,
          schedule_finish: schedule_finish,
          created_at: new Date().toISOString(),
        };

        // Filter recipients for each notification type
        const emailRecipients = notificationUsers.filter(
          (user) => user.EMAIL && user.EMAIL.trim() !== ""
        );
        const lineRecipients = notificationUsers.filter(
          (user) => user.LineID && user.LineID.trim() !== ""
        );

        console.log("\n📧 EMAIL RECIPIENTS (After Filtering):");
        if (emailRecipients.length === 0) {
          console.log("  ⚠️  No email-capable recipients found");
        } else {
          emailRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        console.log("\n💬 LINE RECIPIENTS (After Filtering):");
        if (lineRecipients.length === 0) {
          console.log("  ⚠️  No LINE-capable recipients found");
        } else {
          lineRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        const linePayload = {
          caseNo: ticketData.ticket_number,
          assetName:
            ticketData.PUNAME ||
            ticketData.machine_number ||
            "Unknown Asset",
          problem: ticketData.title || "No description",
          actionBy: plannerName,
          comment: notes || "งานได้รับการวางแผนและกำหนดตารางเวลาแล้ว",
          detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
          extraKVs: [
            { label: "Assigned to", value: validAssignee.PERSON_NAME },
            { label: "Critical Level", value: (getCriticalLevelText(ticketData.pucriticalno) || "").toUpperCase() },
            {
              label: "Schedule Start",
              value: new Date(schedule_start).toLocaleDateString("th-TH"),
            },
            {
              label: "Schedule Finish",
              value: new Date(schedule_finish).toLocaleDateString("th-TH"),
            },
            { label: "Status", value: "PLANED" },
            { label: "Planned by", value: plannerName },
          ],
        };

        await notificationQueue.addPlanTicketNotificationJob({
          ticketData: ticketDataForNotifications,
          plannerName,
          emailRecipients,
          lineRecipients,
          linePayload,
        });
        console.log(`\n=== NOTIFICATION SUMMARY Finished ===`);
        console.log(
          `📊 Enqueued: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE (plan-ticket)`
        );
        console.log(`=== END NOTIFICATION SUMMARY ===\n`);
      } catch (error) {
        console.error(
          "Error sending notifications for ticket planning:",
          error
        );
        throw error;
      }
    });

    res.json({
      success: true,
      message: "Ticket planned successfully",
      data: {
        status: "planed",
        assigned_to,
        schedule_start,
        schedule_finish,
      },
    });
  } catch (error) {
    console.error("Error planning ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to plan ticket",
      error: error.message,
    });
  }
};

// Start work on ticket (L2+) - NEW WORKFLOW
const startTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, actual_start_at } = req.body;
    const started_by = req.user.id;
    const pool = await sql.connect(dbConfig);

    // Validate required fields
    if (!actual_start_at) {
      return res.status(400).json({
        success: false,
        message: "Actual start time is required",
      });
    }

    // Get current ticket status and puno
    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by, assigned_to, puno FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check if ticket is in planed status
    if (ticket.status !== "planed") {
      return res.status(400).json({
        success: false,
        message: "Only planed tickets can be started",
      });
    }

    // Check if user is assigned to this ticket
    if (ticket.assigned_to !== started_by) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned user can start this ticket",
      });
    }

    // Check if user has permission to start tickets
    const permissionCheck = await checkUserActionPermission(
      started_by,
      ticket.puno,
      "start"
    );
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to start tickets for this location",
      });
    }

    // Update ticket status to in_progress with workflow tracking
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "in_progress")
      .input("actual_start_at", sql.DateTime2, new Date(actual_start_at))
      .query(`
                UPDATE IgxTickets 
                SET status = @status, 
                    actual_start_at = @actual_start_at,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: "in_progress",
      changedBy: started_by,
      toUser: ticket.assigned_to,
      notes: notes || "Work started on ticket",
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      started_by,
      ticket.status,
      "in_progress",
      notes
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    // Status: in_progress → WOStatusNo: 4, WFStatusCode: 50
    try {
      console.log(
        `🔄 Updating Cedar WO status for ticket ${id} to in_progress`
      );
      console.log(
        `📋 New Workflow: Ticket status changed to 'in_progress' - WO will be updated with WOStatusNo=4, Code=50`
      );

      await cedarIntegrationService.syncTicketToCedar(id, "start", {
        newStatus: "in_progress",
        changedBy: started_by,
        notes: notes || "Work started on ticket",
        actualStartAt: actual_start_at,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id} to in_progress`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the start action if Cedar fails
    }

    // Send notifications according to new workflow logic: requester + assignee + actor (starter)
    await safeSendNotifications("send ticket start notifications", async () => {
      try {
        // Get notification users using the new workflow system (single call)
        const notificationUsers = await getTicketNotificationRecipients(
          id,
          "start",
          started_by
        );
        console.log(`\n=== TICKET START NOTIFICATIONS SUMMARY ===`);
        console.log(`Ticket: ${id} (ID: ${id})`);
        console.log(`Action: START`);
        console.log(
          `Started by: ${started_by} (${getUserDisplayNameFromRequest(req)})`
        );
        console.log(`Actual start time: ${actual_start_at}`);
        console.log(
          `Total notification users from SP: ${notificationUsers.length}`
        );

        if (notificationUsers.length === 0) {
          console.log(`⚠️  No notification users found for start action`);
          console.log(`=== END NOTIFICATION SUMMARY ===\n`);
          return;
        }

        // LOG ALL NOTIFICATION USERS BEFORE FILTERING
        console.log("\n📋 ALL NOTIFICATION USERS (Before Filtering):");
        notificationUsers.forEach((user, index) => {
          const hasEmail = user.EMAIL && user.EMAIL.trim() !== "";
          const hasLineID = user.LineID && user.LineID.trim() !== "";
          const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : "❌ No Email";
          const lineStatus = hasLineID ? `✅ ${user.LineID}` : "❌ No LineID";

          console.log(
            `  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`
          );
          console.log(`     └─ Reason: ${user.notification_reason}`);
          console.log(`     └─ Type: ${user.recipient_type}`);
          console.log(`     └─ Email: ${emailStatus}`);
          console.log(`     └─ LineID: ${lineStatus}`);
        });

        // COUNT USERS BY RECIPIENT TYPE
        const userCounts = notificationUsers.reduce((counts, user) => {
          const type = user.recipient_type || "Unknown";
          counts[type] = (counts[type] || 0) + 1;
          return counts;
        }, {});

        console.log("\n📊 RECIPIENT TYPE BREAKDOWN:");
        Object.entries(userCounts).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count} user(s)`);
        });

        // COUNT USERS BY NOTIFICATION CAPABILITY
        const emailCapable = notificationUsers.filter(
          (u) => u.EMAIL && u.EMAIL.trim() !== ""
        ).length;
        const lineCapable = notificationUsers.filter(
          (u) => u.LineID && u.LineID.trim() !== ""
        ).length;
        const bothCapable = notificationUsers.filter(
          (u) =>
            u.EMAIL &&
            u.EMAIL.trim() !== "" &&
            u.LineID &&
            u.LineID.trim() !== ""
        ).length;
        const noContactInfo = notificationUsers.filter(
          (u) =>
            (!u.EMAIL || u.EMAIL.trim() === "") &&
            (!u.LineID || u.LineID.trim() === "")
        ).length;

        console.log("\n📞 NOTIFICATION CAPABILITY:");
        console.log(`  • Email capable: ${emailCapable} user(s)`);
        console.log(`  • LINE capable: ${lineCapable} user(s)`);
        console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
        console.log(`  • No contact info: ${noContactInfo} user(s)`);

        // Get ticket details for notification data
        const ticketDetailResult = await runQuery(
          pool,
          `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
                           pu.PUCODE, pu.PUNAME,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM IgxTickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `,
          [{ name: "ticket_id", type: sql.Int, value: id }]
        );

        const ticketData = firstRecord(ticketDetailResult);
        const starterName = getUserDisplayNameFromRequest(req);

        // Prepare ticket data for notifications
        const ticketDataForNotifications = {
          id: id,
          ticket_number: ticketData.ticket_number,
          title: ticketData.title,
          description: ticketData.title, // Using title as description for start notifications
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
          created_by: ticket.created_by,
          assigned_to: ticket.assigned_to,
          actual_start_at: actual_start_at,
          created_at: new Date().toISOString(),
        };

        // Filter recipients for each notification type
        const emailRecipients = notificationUsers.filter(
          (user) => user.EMAIL && user.EMAIL.trim() !== ""
        );
        const lineRecipients = notificationUsers.filter(
          (user) => user.LineID && user.LineID.trim() !== ""
        );

        console.log("\n📧 EMAIL RECIPIENTS (After Filtering):");
        if (emailRecipients.length === 0) {
          console.log("  ⚠️  No email-capable recipients found");
        } else {
          emailRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        console.log("\n💬 LINE RECIPIENTS (After Filtering):");
        if (lineRecipients.length === 0) {
          console.log("  ⚠️  No LINE-capable recipients found");
        } else {
          lineRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        const linePayload = {
          caseNo: ticketData.ticket_number,
          assetName:
            ticketData.PUNAME ||
            ticketData.machine_number ||
            "Unknown Asset",
          problem: ticketData.title || "No description",
          actionBy: starterName,
          comment: notes || "งานเริ่มดำเนินการแล้ว",
          detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
          extraKVs: [
            {
              label: "Actual Start",
              value: new Date(actual_start_at).toLocaleString("th-TH"),
            },
            { label: "Status", value: "IN PROGRESS" },
            { label: "Started by", value: starterName },
          ],
        };

        await notificationQueue.addStartTicketNotificationJob({
          ticketData: ticketDataForNotifications,
          starterName,
          emailRecipients,
          lineRecipients,
          linePayload,
        });
        console.log(`\n=== NOTIFICATION SUMMARY COMPLETED ===`);
        console.log(
          `📊 Enqueued: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE (start-ticket)`
        );
        console.log(`=== END NOTIFICATION SUMMARY ===\n`);
      } catch (error) {
        console.error("Error sending notifications for ticket start:", error);
        throw error;
      }
    });

    res.json({
      success: true,
      message: "Work started successfully",
      data: {
        status: "in_progress",
        actual_start_at,
      },
    });
  } catch (error) {
    console.error("Error starting ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start ticket",
      error: error.message,
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
    const currentTicketResult = await runQuery(
      pool,
      `
            SELECT 
                t.status, 
                t.created_by,
                t.puno
            FROM IgxTickets t
            WHERE t.id = @id
        `,
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check if ticket can be rejected (only open and rejected_pending_l3_review statuses)
    if (
      ticket.status !== "open" &&
      ticket.status !== "rejected_pending_l3_review"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only open tickets and tickets pending L3 review can be rejected",
      });
    }

    // Check if user has permission for final rejection
    const finalRejectCheck = await checkUserActionPermission(
      rejected_by,
      ticket.puno,
      "reject_final"
    );
    // Check if user has L3+ approval level for this PU (similar to approveClose)
    // Check user permission to reject tickets
    const permissionCheck = await checkUserActionPermission(
      rejected_by,
      ticket.puno,
      "reject"
    );

    if (!permissionCheck.hasPermission && !finalRejectCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to reject tickets for this location",
      });
    }

    let newStatus = finalRejectCheck.hasPermission
      ? "rejected_final"
      : "rejected_pending_l3_review";
    let statusNotes = finalRejectCheck.hasPermission
      ? "Ticket rejected by L3 (final decision)"
      : "Ticket rejected by L2, escalated to L3 for review";

    // Update ticket status and rejection reason with workflow tracking
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), newStatus)
      .input("rejection_reason", sql.NVarChar(500), rejection_reason)
      .input("rejected_by", sql.Int, rejected_by).query(`
                UPDATE IgxTickets 
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
      notes: rejection_reason || statusNotes,
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      rejected_by,
      ticket.status,
      newStatus,
      rejection_reason
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    try {
      console.log(
        `🔄 Updating Cedar WO status for ticket ${id} to ${newStatus}`
      );

      await cedarIntegrationService.syncTicketToCedar(id, "reject", {
        newStatus,
        changedBy: rejected_by,
        notes: rejection_reason || statusNotes,
        rejectionReason: rejection_reason,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id}`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the reject action if Cedar fails
    }

    // Send notification to requestor and assignee
    const detailResult = await runQuery(
      pool,
      `
            SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno, t.assigned_to,
                   pu.PUCODE, pu.PUNAME,
                   pe.plant as plant_code,
                   pe.area as area_code,
                   pe.line as line_code,
                   pe.machine as machine_code,
                   pe.number as machine_number
            FROM IgxTickets t
            LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
            LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
            WHERE t.id = @ticket_id;

            SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, ue.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
            WHERE p.PERSONNO = @reporter_id;

            SELECT p.PERSON_NAME, p.EMAIL, p.DEPTNO, ue.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
            WHERE p.PERSONNO = @assignee_id;
        `,
      [
        { name: "ticket_id", type: sql.Int, value: id },
        { name: "reporter_id", type: sql.Int, value: ticket.created_by },
        { name: "assignee_id", type: sql.Int, value: ticket.assigned_to },
      ]
    );

    const ticketData = detailResult.recordsets[0]?.[0];
    const reporter = detailResult.recordsets[1]?.[0];
    const assignee = detailResult.recordsets[2]?.[0];
    const rejectorName = getUserDisplayNameFromRequest(req);
    const reporterDisplayName = formatPersonName(reporter, "ไม่ระบุ");
    const assigneeDisplayName = assignee
      ? formatPersonName(assignee, "ไม่ระบุ")
      : null;

    ticketData.reporter_name = reporterDisplayName;
    if (assigneeDisplayName) {
      ticketData.assignee_name = assigneeDisplayName;
    }

    // Send notifications via queue: requester + L3ForPU + actor (rejector)
    await safeSendNotifications("send ticket rejection notifications", async () => {
      const notificationUsers = await getTicketNotificationRecipients(id, "reject", rejected_by);
      if (notificationUsers.length === 0) return;

      const ticketDataForNotifications = {
        id: id,
        ticket_number: ticketData.ticket_number,
        title: ticketData.title,
        description: ticketData.title,
        pucode: ticketData.PUCODE,
        plant_code: ticketData.plant_code,
        area_code: ticketData.area_code,
        line_code: ticketData.line_code,
        machine_code: ticketData.machine_code,
        machine_number: ticketData.machine_number,
        plant_name: ticketData.PUNAME,
        PUNAME: ticketData.PUNAME,
        severity_level: ticketData.severity_level,
        priority: ticketData.priority,
        created_by: ticket.created_by,
        assigned_to: ticketData.assigned_to,
        rejection_reason: rejection_reason,
        new_status: newStatus,
        created_at: new Date().toISOString(),
      };

      const emailRecipients = notificationUsers.filter((u) => u.EMAIL && u.EMAIL.trim() !== "");
      const lineRecipients = notificationUsers.filter((u) => u.LineID && u.LineID.trim() !== "");
      const rejectionStateKey = newStatus === "rejected_final" ? "REJECT_FINAL" : "REJECT_TO_MANAGER";
      const linePayload = {
        caseNo: ticketData.ticket_number,
        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
        problem: ticketData.title || "No description",
        actionBy: rejectorName,
        comment: rejection_reason || "งานถูกปฏิเสธ",
        detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
        extraKVs: [
          { label: "Status", value: newStatus.toUpperCase() },
          { label: "Rejected by", value: rejectorName },
        ],
      };

      await notificationQueue.addRejectTicketNotificationJob({
        ticketData: ticketDataForNotifications,
        rejectorName,
        rejection_reason,
        newStatus,
        emailRecipients,
        lineRecipients,
        linePayload,
        rejectionStateKey,
      });
    });

    res.json({
      success: true,
      message: "Ticket rejected successfully",
      data: { status: newStatus, rejection_reason },
    });
  } catch (error) {
    console.error("Error rejecting ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject ticket",
      error: error.message,
    });
  }
};

// Finish job (L2)
const finishTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      completion_notes,
      downtime_avoidance_hours,
      cost_avoidance,
      failure_mode_id,
      actual_finish_at,
      actual_start_at,
    } = req.body;
    const finished_by = req.user.id;
    const pool = await sql.connect(dbConfig);

    // Get current ticket status
    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by, assigned_to FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check if user is assigned to this ticket
    if (ticket.assigned_to !== finished_by) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned user can finish this ticket",
      });
    }

    // Check if ticket is in a completable status
    if (
      ticket.status !== "in_progress" &&
      ticket.status !== "reopened_in_progress"
    ) {
      return res.status(400).json({
        success: false,
        message: "Only in-progress or reopened tickets can be Finished",
      });
    }

    // Check if ticket has at least one "after" image
    const afterImagesResult = await runQuery(
      pool,
      "SELECT COUNT(*) as count FROM IgxTicketImages WHERE ticket_id = @id AND image_type = @image_type",
      [
        { name: "id", type: sql.Int, value: id },
        { name: "image_type", type: sql.VarChar(20), value: "after" },
      ]
    );

    const afterImageCount = afterImagesResult.recordset[0]?.count || 0;
    if (afterImageCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot finish ticket: At least one 'after' image is required",
      });
    }

    // Update ticket status to finished with new fields and workflow tracking
    const updateQuery = `
            UPDATE IgxTickets 
            SET status = @status, 
                downtime_avoidance_hours = @downtime_avoidance_hours,
                cost_avoidance = @cost_avoidance,
                failure_mode_id = @failure_mode_id,
                finished_at = GETDATE(),
                finished_by = @finished_by,
                updated_at = GETDATE()`;

    const request = pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "finished")
      .input(
        "downtime_avoidance_hours",
        sql.Decimal(8, 2),
        downtime_avoidance_hours
      )
      .input("cost_avoidance", sql.Decimal(15, 2), cost_avoidance)
      .input("failure_mode_id", sql.Int, failure_mode_id)
      .input("finished_by", sql.Int, finished_by);

    // Add actual_finish_at if provided
    if (actual_finish_at) {
      request.input(
        "actual_finish_at",
        sql.DateTime2,
        new Date(actual_finish_at)
      );
    }

    // Add actual_start_at if provided (to allow editing)
    if (actual_start_at) {
      request.input(
        "actual_start_at",
        sql.DateTime2,
        new Date(actual_start_at)
      );
    }

    let finalQuery = updateQuery;
    if (actual_finish_at) {
      finalQuery += `, actual_finish_at = @actual_finish_at`;
    }
    if (actual_start_at) {
      finalQuery += `, actual_start_at = @actual_start_at`;
    }
    finalQuery += ` WHERE id = @id`;

    
    await request.query(finalQuery);

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: "Finished",
      changedBy: finished_by,
      notes: completion_notes || "Job Finished",
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      finished_by,
      ticket.status,
      "Finished",
      completion_notes
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    try {
      console.log(`🔄 Updating Cedar WO status for ticket ${id} to Finished`);

      await cedarIntegrationService.syncTicketToCedar(id, "finish", {
        newStatus: "Finished",
        changedBy: finished_by,
        notes: completion_notes || "Job Finished",
        downtimeAvoidance: downtime_avoidance_hours,
        costAvoidance: cost_avoidance,
        failureMode: failure_mode_id,
        actualFinishAt: actual_finish_at,
        actualStartAt: actual_start_at,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id}`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the finish action if Cedar fails
    }

    // Send notifications according to new workflow logic: requester + actor (finishr)
    await safeSendNotifications("send job completion notifications", async () => {
      try {
        // Get notification users using the new workflow system (single call)
        const notificationUsers = await getTicketNotificationRecipients(
          id,
          "finish",
          finished_by
        );
        console.log(`\n=== JOB COMPLETION NOTIFICATIONS SUMMARY ===`);
        console.log(`Ticket: ${"ticket_number"} (ID: ${id})`);
        console.log(`Action: FINISH`);
        console.log(
          `Finished by: ${finished_by} (${getUserDisplayNameFromRequest(req)})`
        );
        console.log(
          `Total notification users from SP: ${notificationUsers.length}`
        );

        if (notificationUsers.length === 0) {
          console.log(`⚠️ in  No notification users found for finish action`);
          console.log(`=== END NOTIFICATION SUMMARY ===\n`);
          return;
        }

        // LOG ALL NOTIFICATION USERS BEFORE FILTERING
        console.log("\n📋 ALL NOTIFICATION USERS (Before Filtering):");
        notificationUsers.forEach((user, index) => {
          const hasEmail = user.EMAIL && user.EMAIL.trim() !== "";
          const hasLineID = user.LineID && user.LineID.trim() !== "";
          const emailStatus = hasEmail ? `✅ ${user.EMAIL}` : "❌ No Email";
          const lineStatus = hasLineID ? `✅ ${user.LineID}` : "❌ No LineID";

          console.log(
            `  ${index + 1}. ${user.PERSON_NAME} (ID: ${user.PERSONNO})`
          );
          console.log(`     └─ Reason: ${user.notification_reason}`);
          console.log(`     └─ Type: ${user.recipient_type}`);
          console.log(`     └─ Email: ${emailStatus}`);
          console.log(`     └─ LineID: ${lineStatus}`);
        });

        // COUNT USERS BY RECIPIENT TYPE
        const userCounts = notificationUsers.reduce((counts, user) => {
          const type = user.recipient_type || "Unknown";
          counts[type] = (counts[type] || 0) + 1;
          return counts;
        }, {});

        console.log("\n📊 RECIPIENT TYPE BREAKDOWN:");
        Object.entries(userCounts).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count} user(s)`);
        });

        // COUNT USERS BY NOTIFICATION CAPABILITY
        const emailCapable = notificationUsers.filter(
          (u) => u.EMAIL && u.EMAIL.trim() !== ""
        ).length;
        const lineCapable = notificationUsers.filter(
          (u) => u.LineID && u.LineID.trim() !== ""
        ).length;
        const bothCapable = notificationUsers.filter(
          (u) =>
            u.EMAIL &&
            u.EMAIL.trim() !== "" &&
            u.LineID &&
            u.LineID.trim() !== ""
        ).length;
        const noContactInfo = notificationUsers.filter(
          (u) =>
            (!u.EMAIL || u.EMAIL.trim() === "") &&
            (!u.LineID || u.LineID.trim() === "")
        ).length;

        console.log("\n📞 NOTIFICATION CAPABILITY:");
        console.log(`  • Email capable: ${emailCapable} user(s)`);
        console.log(`  • LINE capable: ${lineCapable} user(s)`);
        console.log(`  • Both email + LINE: ${bothCapable} user(s)`);
        console.log(`  • No contact info: ${noContactInfo} user(s)`);

        // Get ticket details for notification data
        const ticketDetailResult = await runQuery(
          pool,
          `
                    SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.downtime_avoidance_hours, t.cost_avoidance, t.puno, t.failure_mode_id,
                           fm.FailureModeCode, fm.FailureModeName,
                           pu.PUCODE, pu.PUNAME,
                           pe.plant as plant_code,
                           pe.area as area_code,
                           pe.line as line_code,
                           pe.machine as machine_code,
                           pe.number as machine_number
                    FROM IgxTickets t
                    LEFT JOIN FailureModes fm ON t.failure_mode_id = fm.FailureModeNo AND fm.FlagDel != 'Y'
                    LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                    LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
                    WHERE t.id = @ticket_id
                `,
          [{ name: "ticket_id", type: sql.Int, value: id }]
        );

        const ticketData = firstRecord(ticketDetailResult);
        const finishrName = getUserDisplayNameFromRequest(req);

        // Prepare ticket data for notifications
        const ticketDataForNotifications = {
          id: id,
          ticket_number: ticketData.ticket_number,
          title: ticketData.title,
          description: ticketData.title, // Using title as description for finish notifications
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
          created_by: ticket.created_by,
          assigned_to: finished_by,
          downtime_avoidance_hours: downtime_avoidance_hours,
          cost_avoidance: cost_avoidance,
          failure_mode_id: failure_mode_id,
          FailureModeName: ticketData.FailureModeName,
          actual_start_at: actual_start_at,
          actual_finish_at: actual_finish_at,
          created_at: new Date().toISOString(),
        };

        // Filter recipients for each notification type
        const emailRecipients = notificationUsers.filter(
          (user) => user.EMAIL && user.EMAIL.trim() !== ""
        );
        const lineRecipients = notificationUsers.filter(
          (user) => user.LineID && user.LineID.trim() !== ""
        );

        console.log("\n📧 EMAIL RECIPIENTS (After Filtering):");
        if (emailRecipients.length === 0) {
          console.log("  ⚠️  No email-capable recipients found");
        } else {
          emailRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.EMAIL})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        console.log("\n💬 LINE RECIPIENTS (After Filtering):");
        if (lineRecipients.length === 0) {
          console.log("  ⚠️  No LINE-capable recipients found");
        } else {
          lineRecipients.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.PERSON_NAME} (${user.LineID})`);
            console.log(`     └─ Reason: ${user.notification_reason}`);
          });
        }

        let heroImageUrl = null;
        if (lineRecipients.length > 0) {
          const imagesResult = await runQuery(
            pool,
            `
            SELECT image_url, image_name, image_type
            FROM IgxTicketImages
            WHERE ticket_id = @ticket_id
            ORDER BY uploaded_at ASC
          `,
            [{ name: "ticket_id", type: sql.Int, value: id }]
          );
          const afterImages = (imagesResult.recordset || []).filter(
            (img) => img.image_type === "after"
          );
          heroImageUrl = getHeroImageUrl(
            afterImages.length > 0 ? afterImages : (imagesResult.recordset || [])
          );
        }

        const linePayload = {
          caseNo: ticketData.ticket_number,
          assetName:
            ticketData.PUNAME ||
            ticketData.machine_number ||
            "Unknown Asset",
          problem: ticketData.title || "No description",
          comment: completion_notes || "งานเสร็จสมบูรณ์แล้ว",
          heroImageUrl: heroImageUrl,
          detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
          extraKVs: [
            {
              label: "Actual Start",
              value: actual_start_at
                ? new Date(actual_start_at).toLocaleString("th-TH")
                : "-",
            },
            {
              label: "Actual Finish",
              value: actual_finish_at
                ? new Date(actual_finish_at).toLocaleString("th-TH")
                : "-",
            },
            {
              label: "Cost Avoidance",
              value: cost_avoidance
                ? `${cost_avoidance.toLocaleString()} บาท`
                : "-",
            },
            {
              label: "Downtime Avoidance",
              value: downtime_avoidance_hours
                ? `${downtime_avoidance_hours} ชั่วโมง`
                : "-",
            },
            {
              label: "Failure Mode",
              value: ticketData.FailureModeName || "-",
            },
            { label: "Status", value: "Finished" },
            { label: "Finished by", value: finishrName },
          ],
        };

        await notificationQueue.addFinishTicketNotificationJob({
          ticketData: ticketDataForNotifications,
          finishrName,
          completion_notes,
          downtime_avoidance_hours,
          cost_avoidance,
          emailRecipients,
          lineRecipients,
          linePayload,
        });
        console.log(`\n=== NOTIFICATION SUMMARY Finished ===`);
        console.log(
          `📊 Enqueued: ${emailRecipients.length || 0} emails, ${lineRecipients.length || 0} LINE (finish-ticket)`
        );
        console.log(`=== END NOTIFICATION SUMMARY ===\n`);
      } catch (error) {
        console.error("Error sending notifications for job completion:", error);
        throw error;
      }
    });

    res.json({
      success: true,
      message: "Job Finished successfully",
      data: {
        status: "Finished",
        downtime_avoidance_hours,
        cost_avoidance,
        failure_mode_id,
        actual_finish_at,
        actual_start_at,
      },
    });
  } catch (error) {
    console.error("Error completing job:", error);
    res.status(500).json({
      success: false,
      message: "Failed to finish job",
      error: error.message,
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
    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by, assigned_to FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check if user is assigned to this ticket
    if (ticket.assigned_to !== escalated_by) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned user can escalate this ticket",
      });
    }

    // Check if ticket is in an escalatable status
    if (
      ticket.status !== "in_progress" &&
      ticket.status !== "reopened_in_progress"
    ) {
      return res.status(400).json({
        success: false,
        message: "Only in-progress or reopened tickets can be escalated",
      });
    }

    // Update ticket status to escalated with workflow tracking
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "escalated")
      .input("escalated_to", sql.Int, escalated_to)
      .input("escalation_reason", sql.NVarChar(500), escalation_reason)
      .input("escalated_by", sql.Int, escalated_by).query(`
                UPDATE IgxTickets 
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
      newStatus: "escalated",
      changedBy: escalated_by,
      notes: `Escalated to L3: ${escalation_reason}`,
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      escalated_by,
      ticket.status,
      "escalated",
      escalation_reason
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    try {
      console.log(`🔄 Updating Cedar WO status for ticket ${id} to escalated`);

      await cedarIntegrationService.syncTicketToCedar(id, "escalate", {
        newStatus: "escalated",
        changedBy: escalated_by,
        notes: `Escalated to L3: ${escalation_reason}`,
        escalationReason: escalation_reason,
        escalatedTo: escalated_to,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id}`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the escalate action if Cedar fails
    }

    // Send notifications via queue: requester + L3ForPU + L4ForPU + actor (escalator)
    await safeSendNotifications("send ticket escalation notifications", async () => {
      const notificationUsers = await getTicketNotificationRecipients(id, "escalate", escalated_by);
      if (notificationUsers.length === 0) return;

      const ticketDetailResult = await runQuery(
        pool,
        `
          SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
                 pu.PUCODE, pu.PUNAME,
                 pe.plant as plant_code, pe.area as area_code, pe.line as line_code,
                 pe.machine as machine_code, pe.number as machine_number
          FROM IgxTickets t
          LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
          LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
          WHERE t.id = @ticket_id
        `,
        [{ name: "ticket_id", type: sql.Int, value: id }]
      );
      const ticketData = firstRecord(ticketDetailResult);
      const escalatorName = getUserDisplayNameFromRequest(req);

      const ticketDataForNotifications = {
        id: id,
        ticket_number: ticketData.ticket_number,
        title: ticketData.title,
        description: ticketData.title,
        pucode: ticketData.PUCODE,
        plant_code: ticketData.plant_code,
        area_code: ticketData.area_code,
        line_code: ticketData.line_code,
        machine_code: ticketData.machine_code,
        machine_number: ticketData.machine_number,
        plant_name: ticketData.PUNAME,
        PUNAME: ticketData.PUNAME,
        severity_level: ticketData.severity_level,
        priority: ticketData.priority,
        created_by: ticket.created_by,
        assigned_to: escalated_by,
        escalated_to: escalated_to,
        escalation_reason: escalation_reason,
        created_at: new Date().toISOString(),
      };

      const emailRecipients = notificationUsers.filter((u) => u.EMAIL && u.EMAIL.trim() !== "");
      const lineRecipients = notificationUsers.filter((u) => u.LineID && u.LineID.trim() !== "");

      let heroImageUrl = null;
      const imagesResult = await runQuery(
        pool,
        `SELECT image_name as filename, image_url as url, uploaded_at, uploaded_by FROM IgxTicketImages WHERE ticket_id = @ticket_id ORDER BY uploaded_at ASC`,
        [{ name: "ticket_id", type: sql.Int, value: id }]
      );
      heroImageUrl = getHeroImageUrl(imagesResult.recordset || []);

      const linePayload = {
        caseNo: ticketData.ticket_number,
        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
        problem: ticketData.title || "No description",
        actionBy: escalatorName,
        comment: escalation_reason || "งานถูกส่งต่อให้หัวหน้างานพิจารณา",
        heroImageUrl: heroImageUrl,
        detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
        extraKVs: [
          { label: "Severity", value: (ticketData.severity_level || "medium").toUpperCase() },
          { label: "Priority", value: (ticketData.priority || "normal").toUpperCase() },
          { label: "Escalated to", value: escalated_to },
          { label: "Status", value: "ESCALATED" },
          { label: "Escalated by", value: escalatorName },
        ],
      };

      await notificationQueue.addEscalateTicketNotificationJob({
        ticketData: ticketDataForNotifications,
        escalatorName,
        escalation_reason,
        emailRecipients,
        lineRecipients,
        linePayload,
      });
    });

    res.json({
      success: true,
      message: "Ticket escalated successfully",
      data: { status: "escalated", escalated_to, escalation_reason },
    });
  } catch (error) {
    console.error("Error escalating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to escalate ticket",
      error: error.message,
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
    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by, assigned_to, puno FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }
    console.log("puno", ticket.puno);
    console.log("reviewed_by", reviewed_by);
    console.log("ticket.created_by", ticket.created_by);

    // Check if user is the requester - if yes, they automatically have permission to review
    if (ticket.created_by !== reviewed_by) {
      return res.status(403).json({
        success: false,
        message: "Only the requestor can approve review this ticket",
      });
    }

    // Requester automatically has permission (implicit L1), no need to check approval table

    // Check if ticket is in Finished status
    if (ticket.status !== "finished") {
      return res.status(400).json({
        success: false,
        message: "Only Finished tickets can be reviewed",
      });
    }

    // Update ticket status to reviewed with workflow tracking
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "reviewed")
      .input("reviewed_by", sql.Int, reviewed_by)
      .input("satisfaction_rating", sql.Int, satisfaction_rating).query(`
                UPDATE IgxTickets 
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
      newStatus: "reviewed",
      changedBy: reviewed_by,
      notes: review_reason || "Ticket reviewed by requestor",
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      reviewed_by,
      ticket.status,
      "reviewed",
      review_reason
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    try {
      console.log(`🔄 Updating Cedar WO status for ticket ${id} to reviewed`);

      await cedarIntegrationService.syncTicketToCedar(id, "approve_review", {
        newStatus: "reviewed",
        changedBy: reviewed_by,
        notes: review_reason || "Ticket reviewed by requestor",
        satisfactionRating: satisfaction_rating,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id}`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the approve review action if Cedar fails
    }

    // Send notifications via queue: assignee + L4ForPU + actor (reviewer)
    await safeSendNotifications(
      "send ticket review approval notifications",
      async () => {
        const notificationUsers = await getTicketNotificationRecipients(id, "approve_review", reviewed_by);
        if (notificationUsers.length === 0) return;

        const ticketDetailResult = await runQuery(
          pool,
          `SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.puno,
                 pu.PUCODE, pu.PUNAME, pe.plant as plant_code, pe.area as area_code, pe.line as line_code,
                 pe.machine as machine_code, pe.number as machine_number
           FROM IgxTickets t
           LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
           LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
           WHERE t.id = @ticket_id`,
          [{ name: "ticket_id", type: sql.Int, value: id }]
        );
        const ticketData = firstRecord(ticketDetailResult);
        const reviewerName = getUserDisplayNameFromRequest(req);

        const ticketDataForNotifications = {
          id: id,
          ticket_number: ticketData.ticket_number,
          title: ticketData.title,
          description: ticketData.title,
          pucode: ticketData.PUCODE,
          plant_code: ticketData.plant_code,
          area_code: ticketData.area_code,
          line_code: ticketData.line_code,
          machine_code: ticketData.machine_code,
          machine_number: ticketData.machine_number,
          plant_name: ticketData.PUNAME,
          PUNAME: ticketData.PUNAME,
          severity_level: ticketData.severity_level,
          priority: ticketData.priority,
          created_by: ticket.created_by,
          assigned_to: ticket.assigned_to,
          review_reason: review_reason,
          satisfaction_rating: satisfaction_rating,
          created_at: new Date().toISOString(),
        };

        const emailRecipients = notificationUsers.filter((u) => u.EMAIL && u.EMAIL.trim() !== "");
        const lineRecipients = notificationUsers.filter((u) => u.LineID && u.LineID.trim() !== "");
        const linePayload = {
          caseNo: ticketData.ticket_number,
          assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
          problem: ticketData.title || "No description",
          comment: review_reason || "งานได้รับการตรวจสอบและอนุมัติโดยผู้ร้องขอ",
          detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
          extraKVs: [
            { label: "Satisfaction Rating", value: satisfaction_rating ? `${satisfaction_rating}/5 ⭐` : "ไม่ระบุ" },
            { label: "Status", value: "REVIEWED" },
            { label: "Reviewed by", value: reviewerName },
          ],
        };

        await notificationQueue.addReviewedTicketNotificationJob({
          ticketData: ticketDataForNotifications,
          reviewerName,
          review_reason,
          satisfaction_rating,
          emailRecipients,
          lineRecipients,
          linePayload,
        });
      }
    );

    res.json({
      success: true,
      message: "Ticket review approved successfully",
      data: { status: "reviewed", reviewed_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Error approving ticket review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve ticket review",
      error: error.message,
    });
  }
};

const enqueueCloseNotifications = async ({
  pool,
  req,
  ticketId,
  ticket,
  closerId,
  closeReason,
  satisfactionRating = null,
  actionType = "approve_close",
}) => {
  await safeSendNotifications("send ticket closure notifications", async () => {
    const notificationUsers = await getTicketNotificationRecipients(ticketId, actionType, closerId);
    if (notificationUsers.length === 0) return;

    const ticketDetailResult = await runQuery(
      pool,
      `SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.status, t.puno, t.assigned_to,
             pu.PUCODE, pu.PUNAME, pe.plant as plant_code, pe.area as area_code, pe.line as line_code,
             pe.machine as machine_code, pe.number as machine_number
         FROM IgxTickets t
         LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
         LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
         WHERE t.id = @ticket_id`,
      [{ name: "ticket_id", type: sql.Int, value: ticketId }]
    );
    const ticketData = firstRecord(ticketDetailResult);
    const closerName = getUserDisplayNameFromRequest(req);

    const ticketDataForNotifications = {
      id: ticketId,
      ticket_number: ticketData.ticket_number,
      title: ticketData.title,
      description: ticketData.title,
      pucode: ticketData.PUCODE,
      plant_code: ticketData.plant_code,
      area_code: ticketData.area_code,
      line_code: ticketData.line_code,
      machine_code: ticketData.machine_code,
      machine_number: ticketData.machine_number,
      plant_name: ticketData.PUNAME,
      PUNAME: ticketData.PUNAME,
      severity_level: ticketData.severity_level,
      priority: ticketData.priority,
      created_by: ticket.created_by,
      assigned_to: ticket.assigned_to,
      close_reason: closeReason,
      created_at: new Date().toISOString(),
    };

    const emailRecipients = notificationUsers.filter((u) => u.EMAIL && u.EMAIL.trim() !== "");
    const lineRecipients = notificationUsers.filter((u) => u.LineID && u.LineID.trim() !== "");
    const linePayload = {
      caseNo: ticketData.ticket_number,
      assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
      problem: ticketData.title || "No description",
      actionBy: closerName,
      detailUrl: `${process.env.LIFF_URL}/tickets/${ticketId}`,
      comment: closeReason || "เคสถูกปิดโดยผู้จัดการ",
      extraKVs: [
        { label: "Status", value: "CLOSED" },
        { label: "Closed by", value: closerName },
      ],
    };

    await notificationQueue.addCloseTicketNotificationJob({
      ticketData: ticketDataForNotifications,
      closerName,
      close_reason: closeReason,
      satisfaction_rating: satisfactionRating,
      emailRecipients,
      lineRecipients,
      linePayload,
    });
  });
};

// Approve close ticket (L4 only)
const approveClose = async (req, res) => {
  try {
    const { id } = req.params;
    const { close_reason } = req.body;
    const approved_by = req.user.id;
    const pool = await sql.connect(dbConfig);

    // Get current ticket status
    const currentTicketResult = await runQuery(
      pool,
      `
            SELECT 
                t.status, 
                t.created_by, 
                t.assigned_to,
                t.puno
            FROM IgxTickets t
            WHERE t.id = @id
        `,
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check if user has permission to approve closure
    const permissionCheck = await checkUserActionPermission(
      approved_by,
      ticket.puno,
      "approve_close"
    );
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          "Only L4+ managers can approve closure of tickets in this area",
      });
    }

    // Check if ticket is in reviewed status
    if (ticket.status !== "reviewed") {
      return res.status(400).json({
        success: false,
        message: "Only reviewed tickets can be closed",
      });
    }

    // Update ticket status to closed with workflow tracking
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "closed")
      .input("approved_by", sql.Int, approved_by).query(`
                UPDATE IgxTickets 
                SET status = @status, 
                    approved_at = GETDATE(),
                    approved_by = @approved_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: "closed",
      changedBy: approved_by,
      notes: close_reason || "Ticket closed by L4 manager",
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      approved_by,
      ticket.status,
      "closed",
      close_reason
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    try {
      console.log(`🔄 Updating Cedar WO status for ticket ${id} to closed`);

      await cedarIntegrationService.syncTicketToCedar(id, "approve_close", {
        newStatus: "closed",
        changedBy: approved_by,
        notes: close_reason || "Ticket closed by L4 manager",
      });

      console.log(`✅ Cedar WO status updated for ticket ${id}`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the close action if Cedar fails
    }

    await enqueueCloseNotifications({
      pool,
      req,
      ticketId: id,
      ticket,
      closerId: approved_by,
      closeReason: close_reason,
      satisfactionRating: null,
      actionType: "approve_close",
    });

    res.json({
      success: true,
      message: "Ticket closed successfully",
      data: { status: "closed", approved_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Error closing ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close ticket",
      error: error.message,
    });
  }
};

const reviewAndClose = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_reason, close_reason, satisfaction_rating } = req.body;
    const reviewedAndClosedBy = req.user.id;
    const pool = await sql.connect(dbConfig);

    const currentTicketResult = await runQuery(
      pool,
      `
        SELECT
          t.status,
          t.created_by,
          t.assigned_to,
          t.puno
        FROM IgxTickets t
        WHERE t.id = @id
      `,
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const permissionCheck = await checkUserActionPermission(
      reviewedAndClosedBy,
      ticket.puno,
      "review_and_close"
    );
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Only L4+ managers can review and close escalated review tickets in this area",
      });
    }

    if (ticket.status !== "review_escalated") {
      return res.status(400).json({
        success: false,
        message: "Only review escalated tickets can be reviewed and closed",
      });
    }

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "closed")
      .input("reviewed_by", sql.Int, reviewedAndClosedBy)
      .input("approved_by", sql.Int, reviewedAndClosedBy)
      .input("satisfaction_rating", sql.Int, satisfaction_rating ?? null)
      .query(`
        UPDATE IgxTickets
        SET status = @status,
            reviewed_at = GETDATE(),
            reviewed_by = @reviewed_by,
            approved_at = GETDATE(),
            approved_by = @approved_by,
            satisfaction_rating = @satisfaction_rating,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    const combinedNote = [review_reason, close_reason]
      .filter((note) => typeof note === "string" && note.trim() !== "")
      .join(" | ") || "Escalated review ticket reviewed and closed by L4 manager";

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: "closed",
      changedBy: reviewedAndClosedBy,
      notes: combinedNote,
    });

    await addStatusChangeComment(
      pool,
      id,
      reviewedAndClosedBy,
      ticket.status,
      "closed",
      combinedNote
    );

    try {
      console.log(`🔄 Updating Cedar WO status for ticket ${id} to closed via review-and-close`);

      await cedarIntegrationService.syncTicketToCedar(id, "review_and_close", {
        newStatus: "closed",
        changedBy: reviewedAndClosedBy,
        notes: combinedNote,
        satisfactionRating: satisfaction_rating ?? null,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id}`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
    }

    await enqueueCloseNotifications({
      pool,
      req,
      ticketId: id,
      ticket,
      closerId: reviewedAndClosedBy,
      closeReason: close_reason || review_reason,
      satisfactionRating: satisfaction_rating ?? null,
      actionType: "review_and_close",
    });

    res.json({
      success: true,
      message: "Ticket reviewed and closed successfully",
      data: {
        status: "closed",
        reviewed_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error reviewing and closing ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to review and close ticket",
      error: error.message,
    });
  }
};

// Reassign ticket (L3+ only) - Modified to work like plan function
const reassignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      notes,
      schedule_start,
      schedule_finish,
      assigned_to: new_assignee_id,
      reassignment_reason,
    } = req.body;
    const reassigned_by = req.user.id;
    const pool = await sql.connect(dbConfig);

    // Validate required fields (same as plan function)
    if (!schedule_start || !schedule_finish || !new_assignee_id) {
      return res.status(400).json({
        success: false,
        message:
          "Schedule start, schedule finish, and assigned user are required for reassignment",
      });
    }

    // Get current ticket status and puno
    const currentTicketResult = await runQuery(
      pool,
      `
            SELECT 
                t.status, 
                t.created_by,
                t.assigned_to,
                t.puno
            FROM IgxTickets t
            WHERE t.id = @id
        `,
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check if user has permission to reassign tickets (L3+ only)
    const permissionCheck = await checkUserActionPermission(
      reassigned_by,
      ticket.puno,
      "reassign"
    );
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Only L3+ managers can reassign tickets in this area",
      });
    }

    // Check if ticket is in a state that allows reassignment
    // L3 can reassign tickets in any status except rejected_final and closed
    if (["rejected_final", "closed"].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Ticket cannot be reassigned when it is rejected_final or closed",
      });
    }

    // Validate assigned user has L2+ approval level for this PU (same as plan function)
    const assigneeCheck = await getAvailableAssigneesForPU(ticket.puno, 2);
    const validAssignee = assigneeCheck.find(
      (user) => user.PERSONNO === new_assignee_id
    );
    if (!validAssignee) {
      return res.status(400).json({
        success: false,
        message:
          "Selected assignee does not have L2+ approval level for this location",
      });
    }

    // Update ticket status to planed with new schedule and assignment (same as plan function)
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "planed")
      .input("assigned_to", sql.Int, new_assignee_id)
      .input("reassigned_by", sql.Int, reassigned_by)
      .input("schedule_start", sql.DateTime2, new Date(schedule_start))
      .input("schedule_finish", sql.DateTime2, new Date(schedule_finish))
      .query(`
                UPDATE IgxTickets 
                SET status = @status, 
                    assigned_to = @assigned_to,
                    reassigned_at = GETDATE(),
                    reassigned_by = @reassigned_by,
                    schedule_start = @schedule_start,
                    schedule_finish = @schedule_finish,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: "planed",
      changedBy: reassigned_by,
      toUser: new_assignee_id,
      notes: notes || "Ticket reassigned and rescheduled",
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      reassigned_by,
      ticket.status,
      "planed",
      notes
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS (use 'plan' action to set planed status)
    try {
      console.log(
        `🔄 Updating Cedar WO status for ticket ${id} to planed (reassigned)`
      );
      console.log(
        `📋 Reassignment: Ticket status changed to 'planed' - WO will be updated with WOStatusNo=3, Code=30`
      );

      await cedarIntegrationService.syncTicketToCedar(id, "plan", {
        newStatus: "planed",
        changedBy: reassigned_by,
        notes: notes || "Ticket reassigned and rescheduled",
        scheduleStart: schedule_start,
        scheduleFinish: schedule_finish,
        assignedTo: new_assignee_id,
        // Additional data for Cedar integration
        schedule_start: schedule_start,
        schedule_finish: schedule_finish,
        assigned_to: new_assignee_id,
      });

      console.log(`✅ Cedar WO status updated for ticket ${id} to planed`);
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the reassign action if Cedar fails
    }

    // Send notifications via queue: requester + assignee + actor (reassigner)
    await safeSendNotifications("send ticket reassignment notifications", async () => {
      const notificationUsers = await getTicketNotificationRecipients(id, "reassign", reassigned_by);
      if (notificationUsers.length === 0) return;

      const ticketDetailResult = await runQuery(
        pool,
        `SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
               pe.plant as plant_code, pe.area as area_code, pe.line as line_code,
               pe.machine as machine_code, pe.number as machine_number, pe.puname as PUNAME
           FROM IgxTickets t
           LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
           LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
           WHERE t.id = @ticket_id`,
        [{ name: "ticket_id", type: sql.Int, value: id }]
      );
      const ticketData = firstRecord(ticketDetailResult);
      const reassignerName = getUserDisplayNameFromRequest(req);

      const ticketDataForNotifications = {
        id: id,
        ticket_number: ticketData.ticket_number,
        title: ticketData.title,
        description: ticketData.title,
        pucode: ticketData.PUCODE,
        plant_code: ticketData.plant_code,
        area_code: ticketData.area_code,
        line_code: ticketData.line_code,
        machine_code: ticketData.machine_code,
        machine_number: ticketData.machine_number,
        plant_name: ticketData.PUNAME,
        PUNAME: ticketData.PUNAME,
        severity_level: ticketData.severity_level,
        priority: ticketData.priority,
        created_by: ticket.created_by,
        assigned_to: new_assignee_id,
        previous_assignee: ticket.assigned_to,
        schedule_start: schedule_start,
        schedule_finish: schedule_finish,
        created_at: new Date().toISOString(),
      };

      const emailRecipients = notificationUsers.filter((u) => u.EMAIL && u.EMAIL.trim() !== "");
      const lineRecipients = notificationUsers.filter((u) => u.LineID && u.LineID.trim() !== "");
      const linePayload = {
        caseNo: ticketData.ticket_number,
        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
        problem: ticketData.title || "No description",
        actionBy: reassignerName,
        comment: notes || "งานได้รับการมอบหมายและกำหนดตารางเวลาใหม่",
        detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
        extraKVs: [
          { label: "Severity", value: (ticketData.severity_level || "medium").toUpperCase() },
          { label: "Priority", value: (ticketData.priority || "normal").toUpperCase() },
          { label: "New Assignee", value: validAssignee.PERSON_NAME },
          { label: "Schedule Start", value: new Date(schedule_start).toLocaleDateString("th-TH") },
          { label: "Schedule Finish", value: new Date(schedule_finish).toLocaleDateString("th-TH") },
          { label: "Status", value: "PLANED" },
          { label: "Reassigned by", value: reassignerName },
        ],
      };

      await notificationQueue.addReassignTicketNotificationJob({
        ticketData: ticketDataForNotifications,
        plannerName: reassignerName,
        oldStatus: ticket.status,
        newStatus: "planed",
        emailRecipients,
        lineRecipients,
        linePayload,
        lineStateKey: "PLANED",
      });
    });

    res.json({
      success: true,
      message: "Ticket reassigned and rescheduled successfully",
      data: {
        status: "planed",
        assigned_to: new_assignee_id,
        schedule_start,
        schedule_finish,
        new_assignee_name: validAssignee.PERSON_NAME,
      },
    });
  } catch (error) {
    console.error("Error reassigning ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reassign ticket",
      error: error.message,
    });
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
      const ticketResult = await pool
        .request()
        .input("ticket_id", sql.Int, ticket_id)
        .query("SELECT puno FROM IgxTickets WHERE id = @ticket_id");

      if (ticketResult.recordset.length > 0) {
        const puno = ticketResult.recordset[0].puno;

        if (puno) {
          // For escalation, only show L3 users (approval_level >= 3)
          // For reassign, show L2+ users (approval_level >= 2)
          const minApprovalLevel = escalation_only === "true" ? 3 : 2;

          // Use the helper function to get users for the specific PUNO and approval level
          const users = await getAvailableAssigneesForPU(
            puno,
            minApprovalLevel
          );
         // console.log(users);
          // Apply search filter if provided
          assignees = users
            .filter((user) => {
              if (!search) return true;
              const searchLower = search.toLowerCase();
              return (
                (user.PERSON_NAME &&
                  user.PERSON_NAME.toLowerCase().includes(searchLower)) ||
                (user.EMAIL && user.EMAIL.toLowerCase().includes(searchLower))
              );
            })
            .map((person) => ({
              id: person.PERSONNO,
              name: person.PERSON_NAME,
              email: person.EMAIL,
              phone: null, // SP doesn't provide phone
              title: null, // SP doesn't provide title
              department: null, // SP doesn't provide department
              userGroup: person.location_scope, // Use location_scope instead
              approvalLevel: person.approval_level,
            }));
        }
      }
    } else {
      // If no ticket_id provided, return all L2+ users (legacy behavior)
      const minApprovalLevel = escalation_only === "true" ? 3 : 2;

      let request = pool
        .request()
        .input("min_approval_level", sql.Int, minApprovalLevel);

      // Build search condition
      let searchCondition = "";
      if (search) {
        searchCondition = `AND (p.FIRSTNAME LIKE @search OR p.LASTNAME LIKE @search OR p.PERSON_NAME LIKE @search OR p.EMAIL LIKE @search)`;
        request.input("search", sql.NVarChar, `%${search}%`);
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
                INNER JOIN IgxTicketApproval ta ON ta.personno = p.PERSONNO
                WHERE p.FLAGDEL != 'Y'
                AND ta.approval_level >= @min_approval_level
                AND ta.is_active = 1
                ${searchCondition}
                ORDER BY p.FIRSTNAME, p.LASTNAME
            `);

      assignees = result.recordset.map((person) => ({
        id: person.PERSONNO,
        name:
          person.PERSON_NAME ||
          `${person.FIRSTNAME || ""} ${person.LASTNAME || ""}`.trim(),
        email: person.EMAIL,
        phone: person.PHONE,
        title: person.TITLE,
        department: person.DEPTNO,
        userGroup: person.USERGROUPNAME,
        approvalLevel: person.approval_level,
      }));
    }

    res.json({
      success: true,
      data: assignees,
    });
  } catch (error) {
    console.error("Error fetching available assignees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available assignees",
      error: error.message,
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
    const currentTicketResult = await runQuery(
      pool,
      "SELECT status, created_by, assigned_to, puno FROM IgxTickets WHERE id = @id",
      [{ name: "id", type: sql.Int, value: id }]
    );

    const ticket = firstRecord(currentTicketResult);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }
    console.log("reopened_by", reopened_by);
    console.log("ticket.puno", ticket.puno);
    // Check if user has permission to reopen tickets
    const permissionCheck = await checkUserActionPermission(
      reopened_by,
      ticket.puno,
      "reopen"
    );
    if (!permissionCheck.hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to reopen tickets",
      });
    }

    // Separate check for requester
    if (ticket.created_by !== reopened_by) {
      return res.status(403).json({
        success: false,
        message: "Only the requestor can reopen this ticket",
      });
    }

    // Check if ticket is in Finished status
    if (ticket.status !== "finished") {
      return res.status(400).json({
        success: false,
        message: "Only Finished tickets can be reopened",
      });
    }

    // Update ticket status to reopened with workflow tracking
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar(50), "reopened_in_progress")
      .input("reopened_by", sql.Int, reopened_by).query(`
                UPDATE IgxTickets 
                SET status = @status,
                    reopened_at = GETDATE(),
                    reopened_by = @reopened_by,
                    updated_at = GETDATE()
                WHERE id = @id
            `);

    await insertStatusHistory(pool, {
      ticketId: id,
      oldStatus: ticket.status,
      newStatus: "reopened_in_progress",
      changedBy: reopened_by,
      notes: reopen_reason || "Ticket reopened by requestor",
    });

    // Add status change comment
    await addStatusChangeComment(
      pool,
      id,
      reopened_by,
      ticket.status,
      "reopened_in_progress",
      reopen_reason
    );

    // 🆕 CEDAR INTEGRATION: Update Work Order status in Cedar CMMS
    // Status: reopened_in_progress → WOStatusNo: 4, WFStatusCode: 50 (same as in_progress)
    try {
      console.log(
        `🔄 Updating Cedar WO status for ticket ${id} to reopened_in_progress`
      );
      console.log(
        `📋 New Workflow: Ticket status changed to 'reopened_in_progress' - WO will be updated with WOStatusNo=4, Code=50 (in_progress)`
      );

      await cedarIntegrationService.syncTicketToCedar(id, "reopen", {
        newStatus: "reopened_in_progress",
        changedBy: reopened_by,
        notes: reopen_reason || "Ticket reopened by requestor",
        // Map reopened_in_progress to in_progress for Cedar
        cedarStatus: "in_progress",
      });

      console.log(
        `✅ Cedar WO status updated for ticket ${id} to in_progress (reopened)`
      );
    } catch (cedarError) {
      console.error("❌ Cedar integration failed:", cedarError.message);
      // Don't fail the reopen action if Cedar fails
    }

    // Send notifications via queue: assignee + actor (reopener)
    await safeSendNotifications("send ticket reopen notifications", async () => {
      const notificationUsers = await getTicketNotificationRecipients(id, "reopen", reopened_by);
      if (notificationUsers.length === 0) return;

      const ticketDetailResult = await runQuery(
        pool,
        `SELECT t.id, t.ticket_number, t.title, t.severity_level, t.priority, t.puno,
               pe.plant as plant_code, pe.area as area_code, pe.line as line_code,
               pe.machine as machine_code, pe.number as machine_number, pe.puname as PUNAME
           FROM IgxTickets t
           LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
           LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
           WHERE t.id = @ticket_id`,
        [{ name: "ticket_id", type: sql.Int, value: id }]
      );
      const ticketData = firstRecord(ticketDetailResult);
      const reopenerName = getUserDisplayNameFromRequest(req);

      const ticketDataForNotifications = {
        id: id,
        ticket_number: ticketData.ticket_number,
        title: ticketData.title,
        description: ticketData.title,
        pucode: ticketData.PUCODE,
        plant_code: ticketData.plant_code,
        area_code: ticketData.area_code,
        line_code: ticketData.line_code,
        machine_code: ticketData.machine_code,
        machine_number: ticketData.machine_number,
        plant_name: ticketData.PUNAME,
        PUNAME: ticketData.PUNAME,
        severity_level: ticketData.severity_level,
        priority: ticketData.priority,
        created_by: ticket.created_by,
        assigned_to: ticket.assigned_to,
        reopen_reason: reopen_reason,
        created_at: new Date().toISOString(),
      };

      const emailRecipients = notificationUsers.filter((u) => u.EMAIL && u.EMAIL.trim() !== "");
      const lineRecipients = notificationUsers.filter((u) => u.LineID && u.LineID.trim() !== "");
      const linePayload = {
        caseNo: ticketData.ticket_number,
        assetName: ticketData.PUNAME || ticketData.machine_number || "Unknown Asset",
        problem: ticketData.title || "No description",
        comment: reopen_reason || "งานถูกเปิดใหม่ กรุณาดำเนินการต่อ",
        detailUrl: `${process.env.LIFF_URL}/tickets/${id}`,
        extraKVs: [
          { label: "Status", value: "REOPENED_IN_PROGRESS" },
          { label: "Reopened by", value: reopenerName },
        ],
      };

      await notificationQueue.addReopenTicketNotificationJob({
        ticketData: ticketDataForNotifications,
        reopenerName,
        reopen_reason,
        emailRecipients,
        lineRecipients,
        linePayload,
      });
    });

    res.json({
      success: true,
      message: "Ticket reopened successfully",
      data: { status: "reopened_in_progress" },
    });
  } catch (error) {
    console.error("Error reopening ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reopen ticket",
      error: error.message,
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
        message: "User ID not found in token",
      });
    }

    const pool = await sql.connect(dbConfig);

    // Query to get all tickets related to the user with deduplication
    const query = `
            SELECT *
            FROM (
                SELECT 
                    t.*,
                    r.PERSON_NAME as reporter_name,
                    r.EMAIL as reporter_email,
                    r.PHONE as reporter_phone,
                    a.PERSON_NAME as assignee_name,
                    a.EMAIL as assignee_email,
                    a.PHONE as assignee_phone,
                    -- Hierarchy information from IgxPUExtension (prioritize most specific)
                    pe.pucode,
                    pe.plant as plant_code,
                    pe.area as area_code,
                    pe.line as line_code,
                    pe.machine as machine_code,
                    pe.number as machine_number,
                    pe.pudescription as pudescription,
                    pe.digit_count,
                    -- Hierarchy names based on digit patterns
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area IS NULL 
                     AND pe2.line IS NULL 
                     AND pe2.machine IS NULL) as plant_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line IS NULL 
                     AND pe2.machine IS NULL) as area_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line = pe.line 
                     AND pe2.machine IS NULL) as line_name,
                    (SELECT TOP 1 pudescription 
                     FROM IgxPUExtension pe2 
                     WHERE pe2.plant = pe.plant 
                     AND pe2.area = pe.area 
                     AND pe2.line = pe.line 
                     AND pe2.machine = pe.machine) as machine_name,
                    -- PU information
                    pu.PUCODE as pu_pucode,
                    pu.PUNAME as pu_name,
                    -- First image URL for preview
                    (SELECT TOP 1 image_url 
                     FROM IgxTicketImages 
                     WHERE ticket_id = t.id 
                     ORDER BY uploaded_at) as first_image_url,
                    -- User's relationship to this ticket (prioritize highest approval level)
                    CASE 
                        WHEN t.status = 'escalated' AND ta.approval_level >= 3 THEN 'escalate_approver'
                        WHEN t.status = 'reviewed' AND ta.approval_level = 4 THEN 'close_approver'
                        WHEN t.status = 'review_escalated' AND ta.approval_level = 4 THEN 'close_approver'
                        WHEN t.status = 'finished' AND t.created_by = @userId THEN 'review_approver'
                        WHEN t.status = 'in_progress' AND t.assigned_to = @userId THEN 'assignee'
                        WHEN t.status = 'reopened_in_progress' AND t.assigned_to = @userId THEN 'assignee'
                        WHEN t.status = 'planed' AND t.assigned_to = @userId THEN 'assignee'
                        WHEN t.status = 'open' AND ta.approval_level >= 2 THEN 'accept_approver'
                        WHEN t.status = 'accepted' AND (ta.approval_level = 2 OR ta.approval_level = 3) THEN 'planner'
                        WHEN t.status = 'rejected_pending_l3_review' AND ta.approval_level >= 3 THEN 'reject_approver'
                        WHEN t.assigned_to = @userId THEN 'assignee'
                        WHEN t.created_by = @userId THEN 'requester'
                        ELSE 'viewer'
                    END as user_relationship,
                    ta.approval_level as user_approval_level,
                    -- Action person names
                    accepted_person.PERSON_NAME as accepted_by_name,
                    escalated_person.PERSON_NAME as escalated_by_name,
                    reviewed_person.PERSON_NAME as reviewed_by_name,
                    finished_person.PERSON_NAME as finished_by_name,
                    rejected_person.PERSON_NAME as rejected_by_name,
                    -- Deduplication: prioritize rows with higher digit_count and approval_level
                    ROW_NUMBER() OVER (
                        PARTITION BY t.id 
                        ORDER BY 
                            ISNULL(pe.digit_count, 0) DESC,
                            ISNULL(ta.approval_level, 0) DESC,
                            t.created_at DESC
                    ) as dedup_row_num
                FROM IgxTickets t
                LEFT JOIN Person r ON t.created_by = r.PERSONNO
                LEFT JOIN Person a ON t.assigned_to = a.PERSONNO
                LEFT JOIN PU pu ON t.puno = pu.PUNO AND pu.FLAGDEL != 'Y'
                LEFT JOIN IgxPUExtension pe ON pu.PUNO = pe.puno
                LEFT JOIN IgxTicketApproval ta ON ta.personno = @userId 
                    AND ta.plant_code = pe.plant 
                    AND ta.is_active = 1
                    AND (
                        -- Exact line match
                        (ISNULL(ta.area_code, '') = ISNULL(pe.area, '') AND ISNULL(ta.line_code, '') = ISNULL(pe.line, ''))
                        OR
                        -- Area-level approval (area matches, line is null in approval)
                        (ISNULL(ta.area_code, '') = ISNULL(pe.area, '') AND ta.line_code IS NULL)
                        OR
                        -- Plant-level approval (area and line are null in approval)
                        (ta.area_code IS NULL AND ta.line_code IS NULL)
                    )
                LEFT JOIN Person accepted_person ON t.accepted_by = accepted_person.PERSONNO
                LEFT JOIN Person escalated_person ON t.escalated_by = escalated_person.PERSONNO
                LEFT JOIN Person reviewed_person ON t.reviewed_by = reviewed_person.PERSONNO
                LEFT JOIN Person finished_person ON t.finished_by = finished_person.PERSONNO
                LEFT JOIN Person rejected_person ON t.rejected_by = rejected_person.PERSONNO
                WHERE (
                    -- IgxTickets created by the user
                    t.created_by = @userId
                    OR 
                    -- IgxTickets where user has approval_level >= 2 for the line/area/plant
                    (ta.approval_level >= 2 AND ta.is_active = 1)
                )
                AND t.status NOT IN ('closed', 'canceled', 'rejected_final')
            ) AS deduped_results
            WHERE dedup_row_num = 1
            ORDER BY created_at DESC
        `;

    // Create a new request for the main query
    const mainRequest = pool.request();
    const result = await mainRequest
      .input("userId", sql.Int, userId)
      .query(query);

    const tickets = result.recordset;

    res.json({
      success: true,
      data: {
        tickets,
      },
    });
  } catch (error) {
    console.error("Error fetching user pending tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending tickets",
      error: error.message,
    });
  }
};

// Get failure modes for dropdown
const getFailureModes = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request().query(`
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
      data: result.recordset,
    });
  } catch (error) {
    console.error("Error fetching failure modes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch failure modes",
      error: error.message,
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
        message: "User ID not found in token",
      });
    }

    const { year = new Date().getFullYear(), startDate, endDate } = req.query;

    const pool = await sql.connect(dbConfig);

    // Note: WHERE clause logic moved into main query for better DateDim integration

    // Get tickets count per period (28-day periods P1-P13)
    // Only count tickets created by the user (t.created_by = @userId)
    // When startDate/endDate are provided, use them exclusively; otherwise filter by CompanyYear
    const query = `
            SELECT 
                'P' + CAST(dd.PeriodNo AS VARCHAR(10)) as period,
                COUNT(DISTINCT t.id) as tickets
            FROM IgxTickets t
            JOIN IgxDateDim AS dd ON dd.DateKey = CAST(t.created_at AS DATE)
            WHERE t.created_by = @userId
            AND t.status != 'canceled'
            ${startDate && endDate 
                ? 'AND t.created_at >= @startDate AND t.created_at <= @endDate'
                : 'AND dd.CompanyYear = @year'}
            GROUP BY dd.PeriodNo
            ORDER BY dd.PeriodNo
`;

    // Build the request with parameters
    let request = pool
      .request()
      .input("userId", sql.Int, userId)
      .input("year", sql.Int, parseInt(year));

    if (startDate && endDate) {
      request = request
        .input("startDate", sql.DateTime, new Date(startDate))
        .input("endDate", sql.DateTime, new Date(endDate));
    }

    const result = await request.query(query);

    // Create a map of data by period
    const dataMap = {};
    result.recordset.forEach((row) => {
      dataMap[row.period] = row.tickets;
    });

    // Generate all periods P1-P13 and fill with data or 0
    const allPeriods = [
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
      "P8",
      "P9",
      "P10",
      "P11",
      "P12",
      "P13",
    ];

    const responseData = allPeriods.map((period) => ({
      period,
      tickets: dataMap[period] || 0,
      target: 15, // Mock target data as requested
    }));

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error in getUserTicketCountPerPeriod:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get user Finished ticket count per period for personal dashboard (L2+ users only)
const getUserFinishedTicketCountPerPeriod = async (req, res) => {
  try {
    const userId = req.user.id; // Get current user ID

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    const { year = new Date().getFullYear(), startDate, endDate } = req.query;

    const pool = await sql.connect(dbConfig);

    // First, check if user has L2+ approval level in any line
    const l2CheckQuery = `
            SELECT COUNT(*) as l2_count
            FROM IgxTicketApproval ta
            WHERE ta.personno = @userId 
            AND ta.approval_level >= 2 
            AND ta.is_active = 1
        `;

    const l2Result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(l2CheckQuery);

    if (l2Result.recordset[0].l2_count === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Requires L2+ approval level.",
      });
    }

    // Note: WHERE clause logic moved into main query for better DateDim integration

    // Get Finished tickets count per period (28-day periods P1-P13)
    // Only count tickets finished by the user (t.finished_by = @userId)
    // When startDate/endDate are provided, use them exclusively; otherwise filter by CompanyYear
    const query = `
            SELECT 
                'P' + CAST(dd.PeriodNo AS VARCHAR(10)) as period,
                COUNT(DISTINCT t.id) as tickets
            FROM IgxTickets t
            JOIN IgxDateDim AS dd ON dd.DateKey = CAST(t.finished_at AS DATE)
            WHERE t.finished_by = @userId
            AND t.status IN ('closed', 'finished')
            ${startDate && endDate 
                ? 'AND t.finished_at >= @startDate AND t.finished_at <= @endDate'
                : 'AND dd.CompanyYear = @year'}
            GROUP BY dd.PeriodNo
            ORDER BY dd.PeriodNo
        `;

    // Build the request with parameters
    let request = pool
      .request()
      .input("userId", sql.Int, userId)
      .input("year", sql.Int, parseInt(year));

    if (startDate && endDate) {
      request = request
        .input("startDate", sql.DateTime, new Date(startDate))
        .input("endDate", sql.DateTime, new Date(endDate));
    }

    const result = await request.query(query);

    // Create a map of data by period
    const dataMap = {};
    result.recordset.forEach((row) => {
      dataMap[row.period] = row.tickets;
    });

    // Generate all periods P1-P13 and fill with data or 0
    const allPeriods = [
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
      "P8",
      "P9",
      "P10",
      "P11",
      "P12",
      "P13",
    ];

    const responseData = allPeriods.map((period) => ({
      period,
      tickets: dataMap[period] || 0,
      target: 10, // Mock target data for Finished tickets
    }));

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error in getUserFinishedTicketCountPerPeriod:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get user closure rate per period: total = all assigned in period (schedule_finish in period);
// on_time_count and rate from closed tickets only (rate = on_time / total_closed).
const getUserClosureRatePerPeriod = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    const { year = new Date().getFullYear(), startDate, endDate } = req.query;

    const pool = await sql.connect(dbConfig);

    const l2CheckQuery = `
      SELECT COUNT(*) as l2_count
      FROM IgxTicketApproval ta
      WHERE ta.personno = @userId
      AND ta.approval_level >= 2
      AND ta.is_active = 1
    `;
    const l2Result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(l2CheckQuery);

    if (l2Result.recordset[0].l2_count === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Requires L2+ approval level.",
      });
    }

    const dateFilter = startDate && endDate
      ? 'AND t.schedule_finish >= @startDate AND t.schedule_finish <= @endDate'
      : 'AND dd.CompanyYear = @year';

    const query = `
      WITH AssignedInPeriod AS (
        SELECT dd.PeriodNo, COUNT(*) AS total
        FROM IgxTickets t
        INNER JOIN IgxDateDim dd ON dd.DateKey = CAST(t.schedule_finish AS DATE)
        WHERE t.assigned_to = @userId AND t.schedule_finish IS NOT NULL
        ${dateFilter}
        GROUP BY dd.PeriodNo
      ),
      ClosedInPeriod AS (
        SELECT
          dd.PeriodNo,
          SUM(CASE WHEN t.actual_finish_at < t.schedule_finish THEN 1 ELSE 0 END) AS on_time_count,
          SUM(CASE WHEN t.actual_finish_at >= t.schedule_finish THEN 1 ELSE 0 END) AS closed_late_count
        FROM IgxTickets t
        INNER JOIN IgxDateDim dd ON dd.DateKey = CAST(t.schedule_finish AS DATE)
        WHERE t.assigned_to = @userId
          AND t.status IN ('closed', 'finished')
          AND t.schedule_finish IS NOT NULL
          AND t.actual_finish_at IS NOT NULL
        ${dateFilter}
        GROUP BY dd.PeriodNo
      ),
      Periods AS (
        SELECT 1 AS PeriodNo UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
        UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13
      )
      SELECT
        'P' + CAST(p.PeriodNo AS VARCHAR(10)) AS period,
        ISNULL(a.total, 0) AS total,
        ISNULL(c.on_time_count, 0) AS on_time_count,
        ISNULL(c.closed_late_count, 0) AS closed_late_count,
        CASE
          WHEN ISNULL(a.total, 0) > 0
          THEN CAST(ISNULL(c.on_time_count, 0) + ISNULL(c.closed_late_count, 0) AS FLOAT) / ISNULL(a.total, 0)
          ELSE 0
        END AS rate
      FROM Periods p
      LEFT JOIN AssignedInPeriod a ON a.PeriodNo = p.PeriodNo
      LEFT JOIN ClosedInPeriod c ON c.PeriodNo = p.PeriodNo
      ORDER BY p.PeriodNo
    `;

    let request = pool
      .request()
      .input("userId", sql.Int, userId)
      .input("year", sql.Int, parseInt(year));

    if (startDate && endDate) {
      request = request
        .input("startDate", sql.DateTime, new Date(startDate))
        .input("endDate", sql.DateTime, new Date(endDate));
    }

    const result = await request.query(query);

    const responseData = result.recordset.map((row) => ({
      period: row.period,
      total: row.total,
      on_time_count: row.on_time_count,
      closed_late_count: row.closed_late_count,
      rate: row.rate,
    }));

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error in getUserClosureRatePerPeriod:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "User ID not found in token",
      });
    }

    const { startDate, endDate, compare_startDate, compare_endDate } =
      req.query;

    const pool = await sql.connect(dbConfig);

    // First, check if user has L2+ approval level in any line
    const l2CheckQuery = `
            SELECT COUNT(*) as l2_count
            FROM IgxTicketApproval ta
            WHERE ta.personno = @userId 
            AND ta.approval_level >= 2 
            AND ta.is_active = 1
        `;

    const l2Result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(l2CheckQuery);

    const isL2Plus = l2Result.recordset[0].l2_count > 0;

    // Get current period data - REPORTER metrics (for all users)
    // Only count tickets created by the user (t.created_by = @userId)
    // Fixed with DISTINCT to prevent duplicate counting due to multiple TicketApproval/IgxPUExtension matches
    const reporterMetricsQuery = `
            SELECT 
                COUNT(DISTINCT t.id) as totalReportsThisPeriod,
                COUNT(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN t.id END) as resolvedReportsThisPeriod,
                COUNT(DISTINCT CASE WHEN status NOT IN ('closed', 'finished', 'canceled') THEN t.id END) as pendingReportsThisPeriod,
                SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                    COALESCE(downtime_avoidance_hours, 0) 
                ELSE 0 END) as downtimeAvoidedByReportsThisPeriod,
                SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                    COALESCE(cost_avoidance, 0) 
                ELSE 0 END) as costAvoidedByReportsThisPeriod
            FROM IgxTickets t
            WHERE t.created_by = @userId
            AND t.created_at >= @startDate 
            AND t.created_at <= @endDate
        `;

    // Get comparison period data - REPORTER metrics
    // Only count tickets created by the user (t.created_by = @userId)
    // Fixed with DISTINCT to prevent duplicate counting due to multiple TicketApproval/IgxPUExtension matches
    const reporterComparisonQuery = `
            SELECT 
                COUNT(DISTINCT t.id) as totalReportsLastPeriod,
                COUNT(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN t.id END) as resolvedReportsLastPeriod,
                COUNT(DISTINCT CASE WHEN status NOT IN ('closed', 'finished', 'canceled') THEN t.id END) as pendingReportsLastPeriod,
                SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                    COALESCE(downtime_avoidance_hours, 0) 
                ELSE 0 END) as downtimeAvoidedByReportsLastPeriod,
                SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                    COALESCE(cost_avoidance, 0) 
                ELSE 0 END) as costAvoidedByReportsLastPeriod
            FROM IgxTickets t
            WHERE t.created_by = @userId
            AND t.created_at >= @compare_startDate 
            AND t.created_at <= @compare_endDate
        `;

    // Execute reporter queries
    const reporterCurrentResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .query(reporterMetricsQuery);

    const reporterComparisonResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("compare_startDate", sql.DateTime, new Date(compare_startDate))
      .input("compare_endDate", sql.DateTime, new Date(compare_endDate))
      .query(reporterComparisonQuery);

    const reporterCurrentData = reporterCurrentResult.recordset[0];
    const reporterComparisonData = reporterComparisonResult.recordset[0];

    let actionPersonData = null;
    let actionPersonComparisonData = null;

    // If L2+, get ACTION PERSON metrics
    if (isL2Plus) {
      const actionPersonMetricsQuery = `
                SELECT 
                    COUNT(DISTINCT t.id) as totalCasesFixedThisPeriod,
                    SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                        COALESCE(downtime_avoidance_hours, 0) 
                    ELSE 0 END) as downtimeAvoidedByFixesThisPeriod,
                    SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                        COALESCE(cost_avoidance, 0) 
                    ELSE 0 END) as costAvoidedByFixesThisPeriod
                FROM IgxTickets t
                WHERE t.finished_by = @userId
                AND t.finished_at >= @startDate 
                AND t.finished_at <= @endDate
            `;

      const actionPersonComparisonQuery = `
                SELECT 
                    COUNT(DISTINCT t.id) as totalCasesFixedLastPeriod,
                    SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                        COALESCE(downtime_avoidance_hours, 0) 
                    ELSE 0 END) as downtimeAvoidedByFixesLastPeriod,
                    SUM(DISTINCT CASE WHEN status IN ('closed', 'finished') THEN 
                        COALESCE(cost_avoidance, 0) 
                    ELSE 0 END) as costAvoidedByFixesLastPeriod
                FROM IgxTickets t
                WHERE t.finished_by = @userId
                AND t.finished_at >= @compare_startDate 
                AND t.finished_at <= @compare_endDate
            `;

      const actionPersonCurrentResult = await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("startDate", sql.DateTime, new Date(startDate))
        .input("endDate", sql.DateTime, new Date(endDate))
        .query(actionPersonMetricsQuery);

      const actionPersonComparisonResult = await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("compare_startDate", sql.DateTime, new Date(compare_startDate))
        .input("compare_endDate", sql.DateTime, new Date(compare_endDate))
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
      (reporterCurrentData.resolvedReportsThisPeriod /
        Math.max(reporterCurrentData.totalReportsThisPeriod, 1)) *
        100
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
        ),
      };

      actionPersonImpactScore = Math.round(
        (actionPersonData.totalCasesFixedThisPeriod /
          Math.max(reporterCurrentData.totalReportsThisPeriod, 1)) *
          100
      );
    }

    const response = {
      success: true,
      data: {
        userRole: isL2Plus ? "L2+" : "L1",
        reporterMetrics: {
          totalReportsThisPeriod:
            reporterCurrentData.totalReportsThisPeriod || 0,
          resolvedReportsThisPeriod:
            reporterCurrentData.resolvedReportsThisPeriod || 0,
          pendingReportsThisPeriod:
            reporterCurrentData.pendingReportsThisPeriod || 0,
          downtimeAvoidedByReportsThisPeriod:
            reporterCurrentData.downtimeAvoidedByReportsThisPeriod || 0,
          costAvoidedByReportsThisPeriod:
            reporterCurrentData.costAvoidedByReportsThisPeriod || 0,
          impactScore: reporterImpactScore,
        },
        actionPersonMetrics: isL2Plus
          ? {
              totalCasesFixedThisPeriod:
                actionPersonData.totalCasesFixedThisPeriod || 0,
              downtimeAvoidedByFixesThisPeriod:
                actionPersonData.downtimeAvoidedByFixesThisPeriod || 0,
              costAvoidedByFixesThisPeriod:
                actionPersonData.costAvoidedByFixesThisPeriod || 0,
              impactScore: actionPersonImpactScore,
            }
          : null,
        summary: {
          reporterComparisonMetrics: {
            reportGrowthRate: {
              percentage: reportGrowthRate,
              description: `${
                reportGrowthRate >= 0 ? "+" : ""
              }${reportGrowthRate.toFixed(1)}% from last period`,
              type:
                reportGrowthRate > 0
                  ? "increase"
                  : reportGrowthRate < 0
                  ? "decrease"
                  : "no_change",
            },
            resolvedReportsGrowthRate: {
              percentage: resolvedReportsGrowthRate,
              description: `${
                resolvedReportsGrowthRate >= 0 ? "+" : ""
              }${resolvedReportsGrowthRate.toFixed(1)}% from last period`,
              type:
                resolvedReportsGrowthRate > 0
                  ? "increase"
                  : resolvedReportsGrowthRate < 0
                  ? "decrease"
                  : "no_change",
            },
            downtimeAvoidedByReportsGrowth: {
              percentage: downtimeAvoidedByReportsGrowth,
              description: `${
                downtimeAvoidedByReportsGrowth >= 0 ? "+" : ""
              }${downtimeAvoidedByReportsGrowth.toFixed(1)}% from last period`,
              type:
                downtimeAvoidedByReportsGrowth > 0
                  ? "increase"
                  : downtimeAvoidedByReportsGrowth < 0
                  ? "decrease"
                  : "no_change",
            },
            costAvoidedByReportsGrowth: {
              percentage: costAvoidedByReportsGrowth,
              description: `${
                costAvoidedByReportsGrowth >= 0 ? "+" : ""
              }${costAvoidedByReportsGrowth.toFixed(1)}% from last period`,
              type:
                costAvoidedByReportsGrowth > 0
                  ? "increase"
                  : costAvoidedByReportsGrowth < 0
                  ? "decrease"
                  : "no_change",
            },
          },
          actionPersonComparisonMetrics: actionPersonGrowthRates
            ? {
                casesFixedGrowthRate: {
                  percentage: actionPersonGrowthRates.casesFixedGrowthRate,
                  description: `${
                    actionPersonGrowthRates.casesFixedGrowthRate >= 0 ? "+" : ""
                  }${actionPersonGrowthRates.casesFixedGrowthRate.toFixed(
                    1
                  )}% from last period`,
                  type:
                    actionPersonGrowthRates.casesFixedGrowthRate > 0
                      ? "increase"
                      : actionPersonGrowthRates.casesFixedGrowthRate < 0
                      ? "decrease"
                      : "no_change",
                },
                downtimeAvoidedByFixesGrowth: {
                  percentage:
                    actionPersonGrowthRates.downtimeAvoidedByFixesGrowth,
                  description: `${
                    actionPersonGrowthRates.downtimeAvoidedByFixesGrowth >= 0
                      ? "+"
                      : ""
                  }${actionPersonGrowthRates.downtimeAvoidedByFixesGrowth.toFixed(
                    1
                  )}% from last period`,
                  type:
                    actionPersonGrowthRates.downtimeAvoidedByFixesGrowth > 0
                      ? "increase"
                      : actionPersonGrowthRates.downtimeAvoidedByFixesGrowth < 0
                      ? "decrease"
                      : "no_change",
                },
                costAvoidedByFixesGrowth: {
                  percentage: actionPersonGrowthRates.costAvoidedByFixesGrowth,
                  description: `${
                    actionPersonGrowthRates.costAvoidedByFixesGrowth >= 0
                      ? "+"
                      : ""
                  }${actionPersonGrowthRates.costAvoidedByFixesGrowth.toFixed(
                    1
                  )}% from last period`,
                  type:
                    actionPersonGrowthRates.costAvoidedByFixesGrowth > 0
                      ? "increase"
                      : actionPersonGrowthRates.costAvoidedByFixesGrowth < 0
                      ? "decrease"
                      : "no_change",
                },
              }
            : null,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getPersonalKPIData:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Send pending ticket notification to specific user
const sendPendingTicketNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const pendingNotificationService = require('../services/pendingTicketNotificationService');

    const result = await pendingNotificationService.sendToSpecificUser(parseInt(userId));

    if (result.skipped) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: result.reason,
        message: result.reason === 'no_line_id' 
          ? 'User does not have LINE ID configured' 
          : 'No pending tickets for this user'
      });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending pending ticket notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

// Send pending ticket notifications to all users
const sendPendingTicketNotificationsToAll = async (req, res) => {
  try {
    const pendingNotificationService = require('../services/pendingTicketNotificationService');

    const result = await pendingNotificationService.sendToAllUsers();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notifications',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Notifications sent to ${result.sent} out of ${result.totalUsers} users`,
      data: result
    });
  } catch (error) {
    console.error('Error sending batch pending ticket notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
};

// Test notification recipients for a PU and action type (admin testing tool)
const testNotificationRecipients = async (req, res) => {
  try {
    const { puno, actionType, created_by, assigned_to } = req.body;

    // Validate required fields
    if (!puno || !actionType) {
      return res.status(400).json({
        success: false,
        message: 'puno and actionType are required'
      });
    }

    // Validate action type
    const validActionTypes = [
      'create', 'accept', 'start', 'finish', 'reject', 'escalate',
      'plan', 'reassign', 'reopen', 'approve_review', 'approve_close', 'review_and_close'
    ];
    
    if (!validActionTypes.includes(actionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid actionType. Must be one of: ${validActionTypes.join(', ')}`
      });
    }

    // Get notification recipients using helper function (without actor)
    const { getNotificationRecipientsForPU } = require('./ticketController/helpers');
    const recipients = await getNotificationRecipientsForPU(
      puno,
      actionType,
      created_by || null,
      assigned_to || null
    );

    res.json({
      success: true,
      data: recipients,
      count: recipients.length
    });
  } catch (error) {
    console.error('Error testing notification recipients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification recipients',
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
  updateTicketDetail,
  addComment,
  assignTicket,
  deleteTicket,
  uploadTicketImage,
  deleteTicketImage,
  acceptTicket,
  planTicket,
  startTicket,
  rejectTicket,
  finishTicket,
  escalateTicket,
  approveReview,
  approveClose,
  reviewAndClose,
  reopenTicket,
  reassignTicket,
  getAvailableAssignees,

  getUserPendingTickets,
  getUserTicketCountPerPeriod,
  getUserFinishedTicketCountPerPeriod,
  getUserClosureRatePerPeriod,
  getPersonalKPIData,
  
  sendPendingTicketNotification,
  sendPendingTicketNotificationsToAll,
  testNotificationRecipients,
};
