const express = require('express');
const sql = require('mssql');
const app = express();
app.use(express.json());

// MARS-specific configuration
const MARS_CONFIG = {
    siteNo: 3,
    customStatusCodes: {
        'PLANNED': '30-1 Work Planned (PM)',
        'IN_PROGRESS': '50-1 Work Started (PM)', 
        'COMPLETED': '70-1 Work Finish (PM)',
        'CANCELLED': '95-1 Work Cancelled (PM)',
        'HISTORY': '99'
    },
    defaultWFStepApproveNo: 'F'
};

// Database connection
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// MARS Work Order Update API
app.post('/api/mars/wo/:wono/update', async (req, res) => {
    const { wono } = req.params;
    const { 
        status, 
        actualStartDate, 
        actualStartTime, 
        actualFinishDate, 
        actualFinishTime,
        actualDuration,
        workBy,
        taskProcedure,
        woCause,
        updateUser = 1 
    } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        
        // Validate WO exists and belongs to MARS
        const woCheck = await pool.request()
            .input('wono', sql.Int, wono)
            .input('siteNo', sql.Int, MARS_CONFIG.siteNo)
            .query(`
                SELECT WONO, WOCODE, WOStatusNo, WFStatusCode 
                FROM WO 
                WHERE WONO = @wono AND SiteNo = @siteNo
            `);

        if (woCheck.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'Work Order not found or does not belong to MARS site' 
            });
        }

        const currentWO = woCheck.recordset[0];
        
        // Update WO based on MARS status
        await updateMARSWorkOrder(pool, wono, status, {
            actualStartDate,
            actualStartTime, 
            actualFinishDate,
            actualFinishTime,
            actualDuration,
            workBy,
            taskProcedure,
            woCause,
            updateUser
        });

        // Log the update
        await logMARSUpdate(pool, wono, status, updateUser);

        res.json({
            success: true,
            wono: wono,
            status: status,
            message: `Work Order ${wono} updated successfully with MARS status: ${status}`
        });

    } catch (error) {
        console.error('MARS WO Update Error:', error);
        res.status(500).json({ 
            error: 'Failed to update Work Order',
            details: error.message 
        });
    }
});

// Update MARS Work Order
async function updateMARSWorkOrder(pool, wono, marsStatus, updateData) {
    const {
        actualStartDate,
        actualStartTime,
        actualFinishDate, 
        actualFinishTime,
        actualDuration,
        workBy,
        taskProcedure,
        woCause,
        updateUser
    } = updateData;

    const updateDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const updateTime = new Date().toTimeString().slice(0, 8).replace(/:/g, '');

    // Map MARS status to Cedar fields
    const statusMapping = getMARSStatusMapping(marsStatus);
    
    // Build dynamic update query
    let updateFields = [];
    let updateValues = [];

    // Always update these fields
    updateFields.push('UPDATEUSER = @updateUser');
    updateFields.push('UPDATEDATE = @updateDate');
    updateFields.push('WFStepApproveNo = @wfStepApproveNo');
    updateValues.push({ name: 'updateUser', type: sql.Int, value: updateUser });
    updateValues.push({ name: 'updateDate', type: sql.NVarChar, value: updateDate });
    updateValues.push({ name: 'wfStepApproveNo', type: sql.NVarChar, value: MARS_CONFIG.defaultWFStepApproveNo });

    // Add status-specific fields
    if (statusMapping.wfStatusCode) {
        updateFields.push('WFStatusCode = @wfStatusCode');
        updateValues.push({ name: 'wfStatusCode', type: sql.NVarChar, value: statusMapping.wfStatusCode });
    }

    if (statusMapping.woStatusNo) {
        updateFields.push('WOStatusNo = @woStatusNo');
        updateValues.push({ name: 'woStatusNo', type: sql.Int, value: statusMapping.woStatusNo });
    }

    // Add actual work fields if provided
    if (actualStartDate) {
        updateFields.push('ACT_START_D = @actualStartDate');
        updateValues.push({ name: 'actualStartDate', type: sql.NVarChar, value: actualStartDate });
    }

    if (actualStartTime) {
        updateFields.push('ACT_START_T = @actualStartTime');
        updateValues.push({ name: 'actualStartTime', type: sql.NVarChar, value: actualStartTime });
    }

    if (actualFinishDate) {
        updateFields.push('ACT_FINISH_D = @actualFinishDate');
        updateValues.push({ name: 'actualFinishDate', type: sql.NVarChar, value: actualFinishDate });
    }

    if (actualFinishTime) {
        updateFields.push('ACT_FINISH_T = @actualFinishTime');
        updateValues.push({ name: 'actualFinishTime', type: sql.NVarChar, value: actualFinishTime });
    }

    if (actualDuration) {
        updateFields.push('ACT_DURATION = @actualDuration');
        updateValues.push({ name: 'actualDuration', type: sql.Float, value: actualDuration });
    }

    if (workBy) {
        updateFields.push('WORKBY = @workBy');
        updateValues.push({ name: 'workBy', type: sql.Int, value: workBy });
    }

    if (taskProcedure) {
        updateFields.push('TaskProcedure = @taskProcedure');
        updateValues.push({ name: 'taskProcedure', type: sql.NVarChar, value: taskProcedure });
    }

    if (woCause) {
        updateFields.push('WO_CAUSE = @woCause');
        updateValues.push({ name: 'woCause', type: sql.NVarChar, value: woCause });
    }

    // Add flag updates based on status
    if (statusMapping.flags) {
        Object.entries(statusMapping.flags).forEach(([flag, value]) => {
            updateFields.push(`${flag} = @${flag}`);
            updateValues.push({ name: flag, type: sql.NVarChar, value: value });
        });
    }

    // Execute update
    const request = pool.request();
    updateValues.forEach(param => {
        request.input(param.name, param.type, param.value);
    });
    request.input('wono', sql.Int, wono);

    const updateQuery = `UPDATE WO SET ${updateFields.join(', ')} WHERE WONO = @wono`;
    await request.query(updateQuery);
}

// Get MARS status mapping
function getMARSStatusMapping(marsStatus) {
    const mappings = {
        'PLANNED': {
            wfStatusCode: MARS_CONFIG.customStatusCodes.PLANNED,
            woStatusNo: 3,
            flags: { FlagWaitStatus: 'F', FlagApprove: 'F', FlagNotApproved: 'F', FlagHis: 'F', FlagCancel: 'F' }
        },
        'IN_PROGRESS': {
            wfStatusCode: MARS_CONFIG.customStatusCodes.IN_PROGRESS,
            woStatusNo: 4,
            flags: { FlagWaitStatus: 'F', FlagApprove: 'F', FlagNotApproved: 'F', FlagHis: 'F', FlagCancel: 'F' }
        },
        'COMPLETED': {
            wfStatusCode: MARS_CONFIG.customStatusCodes.COMPLETED,
            woStatusNo: 5,
            flags: { FlagWaitStatus: 'F', FlagApprove: 'F', FlagNotApproved: 'F', FlagHis: 'F', FlagCancel: 'F' }
        },
        'CANCELLED': {
            wfStatusCode: MARS_CONFIG.customStatusCodes.CANCELLED,
            woStatusNo: 8,
            flags: { FlagWaitStatus: 'F', FlagApprove: 'F', FlagNotApproved: 'F', FlagHis: 'F', FlagCancel: 'T' }
        },
        'HISTORY': {
            wfStatusCode: MARS_CONFIG.customStatusCodes.HISTORY,
            woStatusNo: 9,
            flags: { FlagWaitStatus: 'F', FlagApprove: 'F', FlagNotApproved: 'F', FlagHis: 'T', FlagCancel: 'F' }
        }
    };

    return mappings[marsStatus] || mappings['PLANNED'];
}

// Log MARS updates
async function logMARSUpdate(pool, wono, marsStatus, updateUser) {
    const updateDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const updateTime = new Date().toTimeString().slice(0, 8).replace(/:/g, '');

    try {
        await pool.request()
            .input('wono', sql.Int, wono)
            .input('marsStatus', sql.NVarChar, marsStatus)
            .input('updateUser', sql.Int, updateUser)
            .input('updateDate', sql.NVarChar, updateDate)
            .input('updateTime', sql.NVarChar, updateTime)
            .query(`
                INSERT INTO MARS_UpdateLog (WONO, MARSStatus, UpdateUser, UpdateDate, UpdateTime)
                VALUES (@wono, @marsStatus, @updateUser, @updateDate, @updateTime)
            `);
    } catch (error) {
        // Log table might not exist, that's okay
        console.log('MARS Update Log (table may not exist):', error.message);
    }
}

// Get MARS Work Order Status
app.get('/api/mars/wo/:wono/status', async (req, res) => {
    const { wono } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('wono', sql.Int, wono)
            .input('siteNo', sql.Int, MARS_CONFIG.siteNo)
            .query(`
                SELECT WONO, WOCODE, WOStatusNo, WFStatusCode, WFStepApproveNo,
                       SCH_START_D, SCH_START_T, SCH_FINISH_D, SCH_FINISH_T,
                       ACT_START_D, ACT_START_T, ACT_FINISH_D, ACT_FINISH_T,
                       WORKBY, TaskProcedure, WO_CAUSE
                FROM WO 
                WHERE WONO = @wono AND SiteNo = @siteNo
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'Work Order not found or does not belong to MARS site' 
            });
        }

        const wo = result.recordset[0];
        
        // Map Cedar status back to MARS status
        const marsStatus = getMARSStatusFromCedar(wo.WFStatusCode);

        res.json({
            wono: wo.WONO,
            wocode: wo.WOCODE,
            marsStatus: marsStatus,
            cedarStatus: {
                woStatusNo: wo.WOStatusNo,
                wfStatusCode: wo.WFStatusCode,
                wfStepApproveNo: wo.WFStepApproveNo
            },
            schedule: {
                startDate: wo.SCH_START_D,
                startTime: wo.SCH_START_T,
                finishDate: wo.SCH_FINISH_D,
                finishTime: wo.SCH_FINISH_T
            },
            actual: {
                startDate: wo.ACT_START_D,
                startTime: wo.ACT_START_T,
                finishDate: wo.ACT_FINISH_D,
                finishTime: wo.ACT_FINISH_T
            },
            workBy: wo.WORKBY,
            taskProcedure: wo.TaskProcedure,
            woCause: wo.WO_CAUSE
        });

    } catch (error) {
        console.error('MARS WO Status Error:', error);
        res.status(500).json({ 
            error: 'Failed to get Work Order status',
            details: error.message 
        });
    }
});

// Map Cedar status back to MARS status
function getMARSStatusFromCedar(cedarStatusCode) {
    const reverseMapping = {
        [MARS_CONFIG.customStatusCodes.PLANNED]: 'PLANNED',
        [MARS_CONFIG.customStatusCodes.IN_PROGRESS]: 'IN_PROGRESS', 
        [MARS_CONFIG.customStatusCodes.COMPLETED]: 'COMPLETED',
        [MARS_CONFIG.customStatusCodes.CANCELLED]: 'CANCELLED',
        [MARS_CONFIG.customStatusCodes.HISTORY]: 'HISTORY'
    };

    return reverseMapping[cedarStatusCode] || 'UNKNOWN';
}

// Health check endpoint
app.get('/api/mars/health', (req, res) => {
    res.json({
        status: 'healthy',
        system: 'MARS Integration API',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`MARS Integration API running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /api/mars/wo/:wono/update - Update MARS Work Order');
    console.log('  GET  /api/mars/wo/:wono/status  - Get MARS Work Order Status');
    console.log('  GET  /api/mars/health          - Health check');
});

module.exports = app;
