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

const getUsersForNotification = async (puno, approvalLevel, excludeUserId = null) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('puno', sql.Int, puno)
            .input('approval_level', sql.Int, approvalLevel)
            .input('exclude_user_id', sql.Int, excludeUserId)
            .execute('sp_GetUsersForNotification');

        return result.recordset;
    } catch (error) {
        console.error('Error getting users for notification:', error);
        return [];
    }
};

const getTicketNotificationUsers = async (ticketId, actionType, actorPersonno = null) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request()
            .input('ticket_id', sql.Int, ticketId)
            .input('action_type', sql.NVarChar, actionType);  // Updated parameter name
        
        // Add actor parameter if provided
        if (actorPersonno) {
            request.input('actor_personno', sql.Int, actorPersonno);
        }
        
        const result = await request.execute('sp_GetTicketNotificationUsers');

        return result.recordset;
    } catch (error) {
        console.error('Error getting ticket notification users:', error);
        return [];
    }
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
    getTicketNotificationUsers,
    getUserDisplayNameFromRequest,
    getUserMaxApprovalLevelForPU,
    getUsersForNotification,
    insertStatusHistory,
    mapImagesToLinePayload,
    mapRecordset,
    safeSendEmail,
    safeSendLineNotification,
    runQuery,
    runStoredProcedure
};
