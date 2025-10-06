const sql = require('mssql');
const dbConfig = require('../../config/dbConfig');

const DEFAULT_BACKEND_BASE_URL = 'http://localhost:3001';
const DEFAULT_FRONTEND_BASE_URL = 'http://localhost:3000';

const ACTION_MAPPING = {
    L1: ['create', 'approve_review', 'reopen'],
    L2: ['accept', 'reject', 'escalate', 'complete'],
    L3: ['reassign', 'reject_final'],
    L4: ['approve_close']
};

const getBackendBaseUrl = () => process.env.BACKEND_URL || process.env.FRONTEND_URL || DEFAULT_BACKEND_BASE_URL;
const getFrontendBaseUrl = () => process.env.FRONTEND_URL || DEFAULT_FRONTEND_BASE_URL;

const canUserPerformAction = (userLevel, action) => ACTION_MAPPING[`L${userLevel}`]?.includes(action) || false;

const getActionsForLevel = (level) => ACTION_MAPPING[`L${level}`] || [];

const createSqlRequest = (pool, inputs = []) => {
    const request = pool.request();
    inputs.forEach(({ name, type, value }) => {
        if (typeof type !== 'undefined' && type !== null) {
            request.input(name, type, value);
        } else {
            request.input(name, value);
        }
    });
    return request;
};

const runQuery = (pool, queryText, inputs = []) => createSqlRequest(pool, inputs).query(queryText);

const runStoredProcedure = (pool, procedureName, inputs = []) => createSqlRequest(pool, inputs).execute(procedureName);

const firstRecord = (result) => (result?.recordset && result.recordset.length > 0 ? result.recordset[0] : null);

const mapRecordset = (result) => (Array.isArray(result?.recordset) ? result.recordset : []);

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

const mapImagesToLinePayload = (records = [], baseUrl = getBackendBaseUrl()) =>
    records.map((img) => ({
        url: `${baseUrl}${img.image_url}`,
        filename: img.image_name,
    }));

const getHeroImageUrl = (images, imageType = 'before') => {
    if (!images || images.length === 0) return null;

    if (images[0]?.url) {
        return images[0].url;
    }
    const baseUrl = getBackendBaseUrl();
    const heroImage = images[0];
    if (heroImage?.image_url) {
        return `${baseUrl}${heroImage.image_url}`;
    }
    return null;
};

const getTicketDetailUrl = (ticketId) => `${getFrontendBaseUrl()}/tickets/${ticketId}`;

const getUserDisplayNameFromRequest = (req) => {
    const first = req?.user?.firstName || '';
    const last = req?.user?.lastName || '';
    const fallback = req?.user?.username;
    const combined = `${first} ${last}`.trim();
    return combined || fallback || 'Unknown User';
};

const checkUserActionPermission = async (userId, puno, action) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('personno', sql.Int, userId)
            .input('puno', sql.Int, puno)
            .input('action', sql.NVarChar, action)
            .execute('sp_CheckUserActionPermission');
       
        return {
           
            hasPermission: result.recordset[0]?.has_permission || false,
            approvalLevel: result.recordset[0]?.approval_level || 0

        };
       
    } catch (error) {
        console.error('Error checking user action permission:', error);
        return { hasPermission: false, approvalLevel: 0 };
    }
};

const getUserMaxApprovalLevelForPU = async (userId, puno) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('puno', sql.Int, puno)
            .execute('sp_GetUserMaxApprovalLevelForPU');

        return result.recordset[0]?.max_approval_level || 0;
    } catch (error) {
        console.error('Error getting user max approval level:', error);
        return 0;
    }
};

// Get available assignees for PU-based dropdown (reassignment/escalation UI)  
const getAvailableAssigneesForPU = async (puno, approvalLevel, excludeUserId = null) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request()
            .input('puno', sql.Int, puno)
            .input('min_approval_level', sql.Int, approvalLevel);
            
        const result = await request.execute('sp_GetPUApprovers');
        
        // Deduplicate by PERSONNO and get the most specific location_scope for each user
        const userMap = new Map();
        
        result.recordset.forEach(user => {
            if (excludeUserId && user.PERSONNO === excludeUserId) {
                return; // Skip excluded user
            }
            
            if (!userMap.has(user.PERSONNO)) {
                // Add new user
                userMap.set(user.PERSONNO, {
                    ...user,
                    location_scopes: [user.location_scope]
                });
            } else {
                // Add location scope to existing user if not already present
                const existingUser = userMap.get(user.PERSONNO);
                if (!existingUser.location_scopes.includes(user.location_scope)) {
                    existingUser.location_scopes.push(user.location_scope);
                }
                
                // Update location_scope to show diversity (e.g., "Plant: DJ, Area: DMH")
                existingUser.location_scope = existingUser.location_scopes.join(', ');
            }
        });
        
        return Array.from(userMap.values());
    } catch (error) {
        console.error('Error getting available assignees for PU:', error);
        return [];
    }
};

// Get notification approvers with LineID using existing sp_GetUsersForNotification + LineID enhancement  
const getNotificationApproversWithLineId = async (pool, puno, approvalLevel, excludeUserId = null) => {
    try {
        console.log(`🔍 Finding L${approvalLevel} notification approvers for puno: ${puno} using updated sp_GetUsersForNotification`);
        
        // Use updated SP that implements most specific wins + returns LineID
        const result = await pool.request()
            .input('puno', sql.Int, puno)
            .input('approval_level', sql.Int, approvalLevel)
            .input('exclude_user_id', sql.Int, excludeUserId)
            .execute('sp_GetUsersForNotification');

        const approvers = result.recordset;
        console.log(`🏆 Found ${approvers.length} most specific approvers for L${approvalLevel} (post-most-wins logic)`);

        approvers.forEach(approver => {
            console.log(`  ✅ ${approver.PERSON_NAME}: ${approver.EMAIL || 'no email'} | LineID: ${approver.LineID || 'none'}`);
        });

        return approvers;
        
    } catch (error) {
        console.error('Error getting notification approvers with LineID:', error);
        return [];
    }
};

// Main function to get all notification recipients for ticket actions (unified notification system)
const getTicketNotificationRecipients = async (ticketId, actionType, actorPersonno = null) => {
    try {
        const pool = await sql.connect(dbConfig);
        const allUsers = [];
        
        // 1. Get ticket PU info
        const ticketResult = await pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .query(`
                SELECT puno, reported_by, assigned_to
                FROM Tickets 
                WHERE id = @ticket_id
            `);
        
        const ticket = ticketResult.recordset[0];
        if (!ticket) return [];
        
        const { puno, reported_by, assigned_to } = ticket;
        
        // 2. Get approvers based on action type using optimized query with LineID
        let approvers = [];
        switch (actionType) {
            case 'create':
                approvers = await getNotificationApproversWithLineId(pool, puno, 2, actorPersonno); // L2ForPU
                break;
            case 'reject':
                approvers = await getNotificationApproversWithLineId(pool, puno, 3, actorPersonno); // L3ForPU
                break;
            case 'escalate':
                // Get both L3 and L4 approvers
                const l3Approvers = await getNotificationApproversWithLineId(pool, puno, 3, actorPersonno);
                const l4Approvers = await getNotificationApproversWithLineId(pool, puno, 4, actorPersonno);
                approvers = [...l3Approvers, ...l4Approvers];
                break;
        }
        
        // 3. Add notifications context to approvers
        approvers.forEach(user => {
            const reason = actionType === 'create' ? 'L2 Approval Required' :
                         actionType === 'reject' ? 'L3 Approval Required' :
                         'L3/L4 Approval Required';
            allUsers.push({
                PERSONNO: user.PERSONNO,
                PERSON_NAME: user.PERSON_NAME,
                EMAIL: user.EMAIL,
                LineID: user.LineID,
                notification_reason: reason,
                recipient_type: actionType === 'create' ? 'L2ForPU' : 
                               actionType === 'reject' ? 'L3ForPU' : 'L3ForPU'
            });
        });
        
        // 4. Get specific users based on action type
        let specificUsers = [];
        switch (actionType) {
            case 'accept':
            case 'complete':
            case 'reject':
            case 'escalate':
                // Get requester
                const requester = await getUserById(pool, reported_by);
                if (requester) {
                    specificUsers.push({
                        PERSONNO: requester.PERSONNO,
                        PERSON_NAME: requester.PERSON_NAME,
                        EMAIL: requester.EMAIL,
                        LineID: requester.LineID || null,
                        notification_reason: 'Requester Notification',
                        recipient_type: 'requester'
                    });
                }
                break;
                
            case 'reassign':
                // Get requester and assignee
                const requester_rs = await getUserById(pool, reported_by);
                const assignee_rs = await getUserById(pool, assigned_to);
                if (requester_rs) {
                    specificUsers.push({
                        PERSONNO: requester_rs.PERSONNO,
                        PERSON_NAME: requester_rs.PERSON_NAME,
                        EMAIL: requester_rs.EMAIL,
                        LineID: requester_rs.LineID || null,
                        notification_reason: 'Requester Notification',
                        recipient_type: 'requester'
                    });
                }
                if (assignee_rs) {
                    specificUsers.push({
                        PERSONNO: assignee_rs.PERSONNO,
                        PERSON_NAME: assignee_rs.PERSON_NAME,
                        EMAIL: assignee_rs.EMAIL,
                        LineID: assignee_rs.LineID || null,
                        notification_reason: 'Assignee Notification',
                        recipient_type: 'assignee'
                    });
                }
                break;
                
            case 'reopen':
                // Get assignee
                const assignee_reopen = await getUserById(pool, assigned_to);
                if (assignee_reopen) {
                    specificUsers.push({
                        PERSONNO: assignee_reopen.PERSONNO,
                        PERSON_NAME: assignee_reopen.PERSON_NAME,
                        EMAIL: assignee_reopen.EMAIL,
                        LineID: assignee_reopen.LineID || null,
                        notification_reason: 'Assignee Notification',
                        recipient_type: 'assignee'
                    });
                }
                break;
                
            case 'approve_review':
                // Get assignee
                const assignee_review = await getUserById(pool, assigned_to);
                if (assignee_review) {
                    specificUsers.push({
                        PERSONNO: assignee_review.PERSONNO,
                        PERSON_NAME: assignee_review.PERSON_NAME,
                        EMAIL: assignee_review.EMAIL,
                        LineID: assignee_review.LineID || null,
                        notification_reason: 'Assignee Notification - Ticket Reviewed',
                        recipient_type: 'assignee'
                    });
                }
                
                // Get L4ForPU approvers  
                const l4Approvers_review = await getNotificationApproversWithLineId(pool, puno, 4, actorPersonno);
                l4Approvers_review.forEach(user => {
                    specificUsers.push({
                        PERSONNO: user.PERSONNO,
                        PERSON_NAME: user.PERSON_NAME,
                        EMAIL: user.EMAIL,
                        LineID: user.LineID,
                        notification_reason: 'L4 Approval Required - Final Close Authorization',
                        recipient_type: 'L4ForPU'
                    });
                });
                break;
                
            case 'approve_close':
                // Get requester
                const requester_close = await getUserById(pool, reported_by);
                if (requester_close) {
                    specificUsers.push({
                        PERSONNO: requester_close.PERSONNO,
                        PERSON_NAME: requester_close.PERSON_NAME,
                        EMAIL: requester_close.EMAIL,
                        LineID: requester_close.LineID || null,
                        notification_reason: 'Requester Notification - Ticket Closed',
                        recipient_type: 'requester'
                    });
                }
                
                // Get assignee
                const assignee_close = await getUserById(pool, assigned_to);
                if (assignee_close) {
                    specificUsers.push({
                        PERSONNO: assignee_close.PERSONNO,
                        PERSON_NAME: assignee_close.PERSON_NAME,
                        EMAIL: assignee_close.EMAIL,
                        LineID: assignee_close.LineID || null,
                        notification_reason: 'Assignee Notification - Ticket Closed',
                        recipient_type: 'assignee'
                    });
                }
                break;
        }
        
        allUsers.push(...specificUsers);
        
        // 5. Always add actor if provided
        if (actorPersonno) {
            const actor = await getUserById(pool, actorPersonno);
            if (actor) {
                allUsers.push({
                    PERSONNO: actor.PERSONNO,
                    PERSON_NAME: actor.PERSON_NAME,
                    EMAIL: actor.EMAIL,
                    LineID: actor.LineID || null,
                    notification_reason: `Actor Notification - Performed Action: ${actionType}`,
                    recipient_type: 'Actor'
                });
            }
        }
        
        // 6. Remove duplicates based on PERSONNO (most wins strategy)
        const uniqueUsers = [];
        const seenUserIds = new Set();
        
        allUsers.forEach(user => {
            if (!seenUserIds.has(user.PERSONNO)) {
                seenUserIds.add(user.PERSONNO);
                uniqueUsers.push(user);
            }
        });
        
        console.log(`📊 Deduplication: ${allUsers.length} total → ${uniqueUsers.length} unique users`);
        
        return uniqueUsers;
        
    } catch (error) {
        console.error('Error getting ticket notification recipients:', error);
        return [];
    }
};

// Helper function to get user by ID with LineID
const getUserById = async (pool, userId) => {
    if (!userId) return null;
    
    const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .query(`
            SELECT p.PERSONNO, p.PERSON_NAME, p.EMAIL,
                   u.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
            WHERE p.PERSONNO = @user_id
              AND p.FLAGDEL != 'Y'
        `);
    
    return result.recordset[0] || null;
};

const generateTicketNumber = async (pool) => {
    try {
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
            (today.getMonth() + 1).toString().padStart(2, '0') +
            today.getDate().toString().padStart(2, '0');

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
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `TKT-${timestamp}-${random}`;
    }
};

const addStatusChangeComment = async (pool, ticketId, userId, oldStatus, newStatus, actionNote) => {
    try {
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT FIRSTNAME, LASTNAME FROM Person WHERE PERSONNO = @userId');

        const userName = userResult.recordset.length > 0
            ? `${userResult.recordset[0].FIRSTNAME} ${userResult.recordset[0].LASTNAME}`
            : `User ${userId}`;

        const statusChangeMessage = `Status changed from ${oldStatus} to ${newStatus}${actionNote ? ` - ${actionNote}` : ''}`;

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
    }
};

const insertStatusHistory = async (pool, { ticketId, oldStatus, newStatus, changedBy, notes, toUser = null }) => {
    const sanitizedNotes = typeof notes === 'undefined' ? null : notes;
    const inputs = [
        { name: 'ticket_id', type: sql.Int, value: ticketId },
        { name: 'old_status', type: sql.VarChar(50), value: oldStatus },
        { name: 'new_status', type: sql.VarChar(50), value: newStatus },
        { name: 'changed_by', type: sql.Int, value: changedBy },
        { name: 'notes', type: sql.NVarChar(500), value: sanitizedNotes },
    ];

    const columns = ['ticket_id', 'old_status', 'new_status', 'changed_by', 'notes'];
    const values = ['@ticket_id', '@old_status', '@new_status', '@changed_by', '@notes'];

    if (typeof toUser === 'number') {
        inputs.push({ name: 'to_user', type: sql.Int, value: toUser });
        columns.push('to_user');
        values.push('@to_user');
    }

    await runQuery(
        pool,
        `INSERT INTO TicketStatusHistory (${columns.join(', ')}) VALUES (${values.join(', ')})`,
        inputs
    );
};

const safeSendEmail = async (description, sendFn) => {
    if (typeof sendFn !== 'function') {
        console.warn(`safeSendEmail: provided handler for ${description} is not a function.`);
        return;
    }

    try {
        await sendFn();
    } catch (error) {
        console.error(`Failed to ${description}:`, error);
    }
};

const safeSendLineNotification = async (description, sendFn) => {
    if (typeof sendFn !== 'function') {
        console.warn(`safeSendLineNotification: provided handler for ${description} is not a function.`);
        return;
    }

    try {
        await sendFn();
    } catch (error) {
        console.error(`Failed to ${description}:`, error);
    }
};

module.exports = {
    ACTION_MAPPING,
    addStatusChangeComment,
    canUserPerformAction,
    checkUserActionPermission,
    createSqlRequest,
    firstRecord,
    formatPersonName,
    generateTicketNumber,
    getActionsForLevel,
    getBackendBaseUrl,
    getFrontendBaseUrl,
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
    runQuery,
    runStoredProcedure
};
