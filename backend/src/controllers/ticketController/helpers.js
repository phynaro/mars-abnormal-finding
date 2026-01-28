const sql = require('mssql');
const dbConfig = require('../../config/dbConfig');

const DEFAULT_BACKEND_BASE_URL = 'http://localhost:3001';
const DEFAULT_FRONTEND_BASE_URL = 'http://localhost:3000';

const ACTION_MAPPING = {
    L1: ['create', 'approve_review', 'reopen'],
    L2: ['accept', 'reject', 'escalate', 'finish'],
    L3: ['reassign', 'reject_final'],
    L4: ['approve_close']
};

//const getBackendBaseUrl = () => process.env.BACKEND_URL || process.env.FRONTEND_URL || DEFAULT_BACKEND_BASE_URL;
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

/**
 * Send emails sequentially with rate limiting to avoid API rate limits
 * @param {Array} emailPromises - Array of email sending functions
 * @param {number} delayMs - Delay between emails in milliseconds (default: 600ms for 2 requests per second)
 */
const sendEmailsSequentially = async (emailPromises, delayMs = 600) => {
    const results = [];
    for (let i = 0; i < emailPromises.length; i++) {
        try {
            const result = await emailPromises[i]();
            results.push(result);
            
            // Add delay between emails (except for the last one)
            if (i < emailPromises.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        } catch (error) {
            console.error(`Error sending email ${i + 1}/${emailPromises.length}:`, error.message);
            results.push({ success: false, error: error.message });
        }
    }
    return results;
};

const mapImagesToLinePayload = (records = [], baseUrl = getFrontendBaseUrl()) =>
    records.map((img) => ({
        url: `${baseUrl}${img.image_url}`,
        filename: img.image_name,
    }));

const getHeroImageUrl = (images, imageType = 'before') => {
    if (!images || images.length === 0) return null;

    if (images[0]?.url) {
        return images[0].url;
    }
    const baseUrl = getFrontendBaseUrl();
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
            .execute('sp_Igx_CheckUserActionPermission');
       
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
            .execute('sp_Igx_GetUserMaxApprovalLevelForPU');

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
            
        const result = await request.execute('sp_Igx_GetPUApprovers');
        
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

// Get notification approvers with LineID using existing sp_Igx_GetUsersForNotification + LineID enhancement  
const getNotificationApproversWithLineId = async (pool, puno, approvalLevel, excludeUserId = null) => {
    try {
        console.log(`🔍 Finding L${approvalLevel} notification approvers for puno: ${puno} using updated sp_Igx_GetUsersForNotification`);
        
        // Use updated SP that implements most specific wins + returns LineID
        const result = await pool.request()
            .input('puno', sql.Int, puno)
            .input('approval_level', sql.Int, approvalLevel)
            .input('exclude_user_id', sql.Int, excludeUserId)
            .execute('sp_Igx_GetUsersForNotification');

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
                SELECT puno, created_by, assigned_to
                FROM IgxTickets 
                WHERE id = @ticket_id
            `);
        
        const ticket = ticketResult.recordset[0];
        if (!ticket) return [];
        
        const { puno, created_by, assigned_to } = ticket;
        
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
            case 'start':
            case 'finish':
            case 'reject':
            case 'escalate':
                // Get requester
                const requester = await getUserById(pool, created_by);
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
                
            case 'plan':
                // Get creator (requester) and assignee for planning notifications
                const creator_plan = await getUserById(pool, created_by);
                const assignee_plan = await getUserById(pool, assigned_to);
                
                if (creator_plan) {
                    specificUsers.push({
                        PERSONNO: creator_plan.PERSONNO,
                        PERSON_NAME: creator_plan.PERSON_NAME,
                        EMAIL: creator_plan.EMAIL,
                        LineID: creator_plan.LineID || null,
                        notification_reason: 'Creator Notification',
                        recipient_type: 'creator'
                    });
                }
                
                if (assignee_plan) {
                    specificUsers.push({
                        PERSONNO: assignee_plan.PERSONNO,
                        PERSON_NAME: assignee_plan.PERSON_NAME,
                        EMAIL: assignee_plan.EMAIL,
                        LineID: assignee_plan.LineID || null,
                        notification_reason: 'Assignee Notification',
                        recipient_type: 'assignee'
                    });
                }
                break;
                
            case 'reassign':
                // Get requester and assignee
                const requester_rs = await getUserById(pool, created_by);
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
                const requester_close = await getUserById(pool, created_by);
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
                   ue.LineID
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
            LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
            WHERE p.PERSONNO = @user_id
              AND p.FLAGDEL != 'Y'
        `);
    
    return result.recordset[0] || null;
};

// Helper function to get user by ID with LineID and Avatar URL
const getUserByIdWithAvatar = async (pool, userId) => {
    if (!userId) return null;
    
    const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .query(`
            SELECT p.PERSONNO, p.PERSON_NAME, p.EMAIL,
                   ue.LineID, ue.AvatarUrl
            FROM Person p
            LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
            LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
            WHERE p.PERSONNO = @user_id
              AND p.FLAGDEL != 'Y'
        `);
    
    return result.recordset[0] || null;
};

// Get notification recipients for PU without ticket ID (for testing)
const getNotificationRecipientsForPU = async (puno, actionType, createdBy = null, assignedTo = null) => {
    try {
        const pool = await sql.connect(dbConfig);
        const allUsers = [];
        
        // 1. Get approvers based on action type using optimized query with LineID
        let approvers = [];
        switch (actionType) {
            case 'create':
                approvers = await getNotificationApproversWithLineId(pool, puno, 2, null);
                break;
            case 'reject':
                approvers = await getNotificationApproversWithLineId(pool, puno, 3, null);
                break;
            case 'escalate':
                // Get both L3 and L4 approvers
                const l3Approvers = await getNotificationApproversWithLineId(pool, puno, 3, null);
                const l4Approvers = await getNotificationApproversWithLineId(pool, puno, 4, null);
                approvers = [...l3Approvers, ...l4Approvers];
                break;
        }
        
        // 2. Add notifications context to approvers with avatar URLs
        for (const user of approvers) {
            const userWithAvatar = await getUserByIdWithAvatar(pool, user.PERSONNO);
            const reason = actionType === 'create' ? 'L2 Approval Required' :
                         actionType === 'reject' ? 'L3 Approval Required' :
                         'L3/L4 Approval Required';
            allUsers.push({
                PERSONNO: user.PERSONNO,
                PERSON_NAME: user.PERSON_NAME,
                EMAIL: user.EMAIL,
                LineID: user.LineID,
                AvatarUrl: userWithAvatar?.AvatarUrl || null,
                notification_reason: reason,
                recipient_type: actionType === 'create' ? 'L2ForPU' : 
                               actionType === 'reject' ? 'L3ForPU' : 'L3ForPU'
            });
        }
        
        // 3. Get specific users based on action type
        let specificUsers = [];
        switch (actionType) {
            case 'create':
                // For testing: Optionally include creator if provided
                if (createdBy) {
                    const creator = await getUserByIdWithAvatar(pool, createdBy);
                    if (creator) {
                        specificUsers.push({
                            PERSONNO: creator.PERSONNO,
                            PERSON_NAME: creator.PERSON_NAME,
                            EMAIL: creator.EMAIL,
                            LineID: creator.LineID || null,
                            AvatarUrl: creator.AvatarUrl || null,
                            notification_reason: 'Creator Notification (Testing Only)',
                            recipient_type: 'creator'
                        });
                    }
                }
                break;
            case 'accept':
            case 'start':
            case 'finish':
            case 'reject':
            case 'escalate':
                // Get requester
                if (createdBy) {
                    const requester = await getUserByIdWithAvatar(pool, createdBy);
                    if (requester) {
                        specificUsers.push({
                            PERSONNO: requester.PERSONNO,
                            PERSON_NAME: requester.PERSON_NAME,
                            EMAIL: requester.EMAIL,
                            LineID: requester.LineID || null,
                            AvatarUrl: requester.AvatarUrl || null,
                            notification_reason: 'Requester Notification',
                            recipient_type: 'requester'
                        });
                    }
                }
                break;
                
            case 'plan':
                // Get creator (requester) and assignee for planning notifications
                if (createdBy) {
                    const creator_plan = await getUserByIdWithAvatar(pool, createdBy);
                    if (creator_plan) {
                        specificUsers.push({
                            PERSONNO: creator_plan.PERSONNO,
                            PERSON_NAME: creator_plan.PERSON_NAME,
                            EMAIL: creator_plan.EMAIL,
                            LineID: creator_plan.LineID || null,
                            AvatarUrl: creator_plan.AvatarUrl || null,
                            notification_reason: 'Creator Notification',
                            recipient_type: 'creator'
                        });
                    }
                }
                
                if (assignedTo) {
                    const assignee_plan = await getUserByIdWithAvatar(pool, assignedTo);
                    if (assignee_plan) {
                        specificUsers.push({
                            PERSONNO: assignee_plan.PERSONNO,
                            PERSON_NAME: assignee_plan.PERSON_NAME,
                            EMAIL: assignee_plan.EMAIL,
                            LineID: assignee_plan.LineID || null,
                            AvatarUrl: assignee_plan.AvatarUrl || null,
                            notification_reason: 'Assignee Notification',
                            recipient_type: 'assignee'
                        });
                    }
                }
                break;
                
            case 'reassign':
                // Get requester and assignee
                if (createdBy) {
                    const requester_rs = await getUserByIdWithAvatar(pool, createdBy);
                    if (requester_rs) {
                        specificUsers.push({
                            PERSONNO: requester_rs.PERSONNO,
                            PERSON_NAME: requester_rs.PERSON_NAME,
                            EMAIL: requester_rs.EMAIL,
                            LineID: requester_rs.LineID || null,
                            AvatarUrl: requester_rs.AvatarUrl || null,
                            notification_reason: 'Requester Notification',
                            recipient_type: 'requester'
                        });
                    }
                }
                if (assignedTo) {
                    const assignee_rs = await getUserByIdWithAvatar(pool, assignedTo);
                    if (assignee_rs) {
                        specificUsers.push({
                            PERSONNO: assignee_rs.PERSONNO,
                            PERSON_NAME: assignee_rs.PERSON_NAME,
                            EMAIL: assignee_rs.EMAIL,
                            LineID: assignee_rs.LineID || null,
                            AvatarUrl: assignee_rs.AvatarUrl || null,
                            notification_reason: 'Assignee Notification',
                            recipient_type: 'assignee'
                        });
                    }
                }
                break;
                
            case 'reopen':
                // Get assignee
                if (assignedTo) {
                    const assignee_reopen = await getUserByIdWithAvatar(pool, assignedTo);
                    if (assignee_reopen) {
                        specificUsers.push({
                            PERSONNO: assignee_reopen.PERSONNO,
                            PERSON_NAME: assignee_reopen.PERSON_NAME,
                            EMAIL: assignee_reopen.EMAIL,
                            LineID: assignee_reopen.LineID || null,
                            AvatarUrl: assignee_reopen.AvatarUrl || null,
                            notification_reason: 'Assignee Notification',
                            recipient_type: 'assignee'
                        });
                    }
                }
                break;
                
            case 'approve_review':
                // Get assignee
                if (assignedTo) {
                    const assignee_review = await getUserByIdWithAvatar(pool, assignedTo);
                    if (assignee_review) {
                        specificUsers.push({
                            PERSONNO: assignee_review.PERSONNO,
                            PERSON_NAME: assignee_review.PERSON_NAME,
                            EMAIL: assignee_review.EMAIL,
                            LineID: assignee_review.LineID || null,
                            AvatarUrl: assignee_review.AvatarUrl || null,
                            notification_reason: 'Assignee Notification - Ticket Reviewed',
                            recipient_type: 'assignee'
                        });
                    }
                }
                
                // Get L4ForPU approvers with avatar URLs
                const l4Approvers_review = await getNotificationApproversWithLineId(pool, puno, 4, null);
                for (const user of l4Approvers_review) {
                    const userWithAvatar = await getUserByIdWithAvatar(pool, user.PERSONNO);
                    specificUsers.push({
                        PERSONNO: user.PERSONNO,
                        PERSON_NAME: user.PERSON_NAME,
                        EMAIL: user.EMAIL,
                        LineID: user.LineID,
                        AvatarUrl: userWithAvatar?.AvatarUrl || null,
                        notification_reason: 'L4 Approval Required - Final Close Authorization',
                        recipient_type: 'L4ForPU'
                    });
                }
                break;
                
            case 'approve_close':
                // Get requester
                if (createdBy) {
                    const requester_close = await getUserByIdWithAvatar(pool, createdBy);
                    if (requester_close) {
                        specificUsers.push({
                            PERSONNO: requester_close.PERSONNO,
                            PERSON_NAME: requester_close.PERSON_NAME,
                            EMAIL: requester_close.EMAIL,
                            LineID: requester_close.LineID || null,
                            AvatarUrl: requester_close.AvatarUrl || null,
                            notification_reason: 'Requester Notification - Ticket Closed',
                            recipient_type: 'requester'
                        });
                    }
                }
                
                // Get assignee
                if (assignedTo) {
                    const assignee_close = await getUserByIdWithAvatar(pool, assignedTo);
                    if (assignee_close) {
                        specificUsers.push({
                            PERSONNO: assignee_close.PERSONNO,
                            PERSON_NAME: assignee_close.PERSON_NAME,
                            EMAIL: assignee_close.EMAIL,
                            LineID: assignee_close.LineID || null,
                            AvatarUrl: assignee_close.AvatarUrl || null,
                            notification_reason: 'Assignee Notification - Ticket Closed',
                            recipient_type: 'assignee'
                        });
                    }
                }
                break;
        }
        
        allUsers.push(...specificUsers);
        
        // 4. Remove duplicates based on PERSONNO (most wins strategy)
        const uniqueUsers = [];
        const seenUserIds = new Set();
        
        allUsers.forEach(user => {
            if (!seenUserIds.has(user.PERSONNO)) {
                seenUserIds.add(user.PERSONNO);
                uniqueUsers.push(user);
            }
        });
        
        console.log(`📊 Test Notification Recipients: ${allUsers.length} total → ${uniqueUsers.length} unique users`);
        
        return uniqueUsers;
        
    } catch (error) {
        console.error('Error getting notification recipients for PU:', error);
        return [];
    }
};

const generateTicketNumber = async (pool) => {
    try {
        // Get current year's last 2 digits (e.g., 25 for 2025, 26 for 2026)
        const currentYear = new Date().getFullYear();
        const yearSuffix = currentYear.toString().slice(-2);
        const yearPrefix = `AB${yearSuffix}`;
        
        // Get the highest existing case number from tickets table for the current year
        const yearPattern = `${yearPrefix}-%`;
        const result = await pool.request()
            .input('yearPattern', sql.NVarChar(20), yearPattern)
            .query(`
                SELECT TOP 1 ticket_number 
                FROM IgxTickets 
                WHERE ticket_number LIKE @yearPattern
                ORDER BY CAST(SUBSTRING(ticket_number, 6, 5) AS INT) DESC
            `);

        let nextCaseNumber = 1;
        
        if (result.recordset.length > 0) {
            const latestTicketNumber = result.recordset[0].ticket_number;
            // Extract the case number part (after 'ABXX-' where XX is the year)
            const caseNumberStr = latestTicketNumber.substring(5);
            const currentCaseNumber = parseInt(caseNumberStr, 10);
            nextCaseNumber = currentCaseNumber + 1;
        }

        return `${yearPrefix}-${nextCaseNumber.toString().padStart(5, '0')}`;

    } catch (error) {
        console.error('Error generating ticket number:', error);
        // Fallback: use timestamp-based approach with current year
        const currentYear = new Date().getFullYear();
        const yearSuffix = currentYear.toString().slice(-2);
        const yearPrefix = `AB${yearSuffix}`;
        const timestamp = Date.now().toString().slice(-5);
        return `${yearPrefix}-${timestamp}`;
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
                INSERT INTO IgxTicketComments (ticket_id, user_id, comment, created_at)
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
        `INSERT INTO IgxTicketStatusHistory (${columns.join(', ')}) VALUES (${values.join(', ')})`,
        inputs
    );
};

const safeSendNotifications = async (description, sendFn) => {
    if (typeof sendFn !== 'function') {
        console.warn(`safeSendNotifications: provided handler for ${description} is not a function.`);
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
    getFrontendBaseUrl,
    getHeroImageUrl,
    getTicketDetailUrl,
    getTicketNotificationRecipients,
    getNotificationRecipientsForPU,
    getNotificationApproversWithLineId,
    getUserDisplayNameFromRequest,
    getUserMaxApprovalLevelForPU,
    getAvailableAssigneesForPU,
    insertStatusHistory,
    mapImagesToLinePayload,
    mapRecordset,
    safeSendNotifications,
    safeSendLineNotification,
    sendEmailsSequentially,
    runQuery,
    runStoredProcedure
};
