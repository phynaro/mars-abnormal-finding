const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SQL Server configuration
const dbConfig = {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Global SQL connection pool
let pool;

// Initialize database connection
async function initializeDatabase() {
    try {
        pool = await sql.connect(dbConfig);
        console.log('✅ Connected to SQL Server database');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Helper function to get current date/time in required format
function getCurrentDateTime() {
    const now = new Date();
    const date = now.getFullYear().toString() + 
                (now.getMonth() + 1).toString().padStart(2, '0') + 
                now.getDate().toString().padStart(2, '0');
    const time = now.getHours().toString().padStart(2, '0') + 
                now.getMinutes().toString().padStart(2, '0') + 
                now.getSeconds().toString().padStart(2, '0');
    return { date, time };
}

// Validation function for required parameters
function validateWorkOrderParams(body) {
    const required = [
        'woProblem', 'deptNo', 'woTypeNo', 'puNo', 'eqNo', 
        'costCenterNo', 'priorityNo', 'updateUser', 'receivePersonNo'
    ];
    
    const missing = required.filter(param => 
        body[param] === undefined || body[param] === null || body[param] === ''
    );
    
    if (missing.length > 0) {
        return {
            isValid: false,
            message: `Missing required parameters: ${missing.join(', ')}`
        };
    }
    
    return { isValid: true };
}

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: pool ? 'Connected' : 'Disconnected'
    });
});

// Create Work Order with Workflow
app.post('/api/work-orders', async (req, res) => {
    try {
        // Validate required parameters
        const validation = validateWorkOrderParams(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        const {
            woProblem,
            deptNo,
            woTypeNo,
            puNo,
            eqNo,
            costCenterNo,
            priorityNo,
            updateUser,
            receivePersonNo,
            siteNo = 3,
            schDuration = 120,
            woCause = '',
            woPlan = '',
            requesterName = '',
            reqPhone = '',
            reqEmail = ''
        } = req.body;

        // Get current date/time
        const { date: currentDate, time: currentTime } = getCurrentDateTime();

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Step 1: Create Work Order using sp_WOMain_Insert
            const woRequest = transaction.request();
            woRequest.input('WOCode', sql.VarChar(20), null);
            woRequest.input('WODate', sql.VarChar(8), currentDate);
            woRequest.input('WOTime', sql.VarChar(8), currentTime);
            woRequest.input('WRNo', sql.Int, 0);
            woRequest.input('WRCode', sql.NVarChar(20), '');
            woRequest.input('WRDate', sql.NVarChar(8), '');
            woRequest.input('WRTime', sql.NVarChar(8), '');
            woRequest.input('Text1', sql.NVarChar(50), '');
            woRequest.input('Text2', sql.NVarChar(50), '');
            woRequest.input('Text3', sql.NVarChar(50), '');
            woRequest.input('PriorityNo', sql.Int, priorityNo);
            woRequest.input('DeptNo', sql.Int, deptNo);
            woRequest.input('WoTypeNo', sql.Int, woTypeNo);
            woRequest.input('PUNo', sql.Int, puNo);
            woRequest.input('EQTypeNo', sql.Int, 0);
            woRequest.input('EQNo', sql.Int, eqNo);
            woRequest.input('CostCenterNo', sql.Int, costCenterNo);
            woRequest.input('VendorNo', sql.Int, 0);
            woRequest.input('ContrNo', sql.Int, 0);
            woRequest.input('BudgetNo', sql.Int, 0);
            woRequest.input('PJNo', sql.Int, 0);
            woRequest.input('UpdateUser', sql.Int, updateUser);
            woRequest.input('SiteNo', sql.Int, siteNo);
            woRequest.input('HotWork', sql.NVarChar(1), 'F');
            woRequest.input('ConfineSpace', sql.NVarChar(1), 'F');
            woRequest.input('WorkAtHeight', sql.NVarChar(1), 'F');
            woRequest.input('LockOutTagOut', sql.NVarChar(1), 'F');
            woRequest.input('SchCurrentStartDate', sql.NVarChar(8), currentDate);
            woRequest.input('SchStartDate', sql.NVarChar(8), currentDate);
            woRequest.input('SchStartTime', sql.NVarChar(8), currentTime);
            woRequest.input('SchFinishDate', sql.NVarChar(8), currentDate);
            woRequest.input('SchFinishTime', sql.NVarChar(8), currentTime);
            woRequest.input('SchDuration', sql.Float, schDuration);
            woRequest.input('AssignToNo', sql.Int, 0);
            woRequest.input('SchChangeNote', sql.NVarChar(250), '');
            woRequest.input('MeterNo', sql.Int, 0);
            woRequest.input('MeterDone', sql.Float, 0);
            woRequest.input('WO_PROBLEM', sql.NVarChar(sql.MAX), woProblem);
            woRequest.input('WoNo', sql.Int, 0); // INOUT parameter - initialize with 0
            woRequest.input('FlagPU', sql.VarChar(1), 'T');
            woRequest.input('FlagSafety', sql.NVarChar(1), 'F');
            woRequest.input('FlagEnvironment', sql.NVarChar(1), 'F');
            woRequest.input('PUNO_Effected', sql.Int, 0);
            woRequest.input('DT_Start_D', sql.NVarChar(8), '');
            woRequest.input('DT_Start_T', sql.NVarChar(8), '');
            woRequest.input('DT_Finish_D', sql.NVarChar(8), '');
            woRequest.input('DT_Finish_T', sql.NVarChar(8), '');
            woRequest.input('DT_Duration', sql.Float, 0);
            woRequest.input('UrgentNo', sql.Int, 0);
            woRequest.input('DATE_REQ', sql.NVarChar(8), currentDate);
            woRequest.input('Time_REQ', sql.NVarChar(8), currentTime);
            woRequest.input('RequesterName', sql.NVarChar(100), requesterName);
            woRequest.input('REQ_PHONE', sql.NVarChar(20), reqPhone);
            woRequest.input('DEPT_REQ', sql.Int, deptNo);
            woRequest.input('Receiver', sql.Int, updateUser);
            woRequest.input('ProcedureNo', sql.Int, 0);
            woRequest.input('SymptomNo', sql.Int, 0);
            woRequest.input('WOSubTypeNo', sql.Int, 0);
            woRequest.input('REQ_Email', sql.NVarChar(50), reqEmail);
            woRequest.input('TaskProcedure', sql.NVarChar(2000), woPlan);
            woRequest.input('FlagEQ', sql.NVarChar(1), 'T');
            woRequest.input('WarrantyDate', sql.NVarChar(8), '');
            woRequest.input('WOCause', sql.NVarChar(sql.MAX), woCause);
            woRequest.input('Note', sql.NVarChar(100), '');
            woRequest.input('RecordActualBy', sql.Int, 0);
            woRequest.input('RecordActualDate', sql.NVarChar(8), '');
            woRequest.input('RecordActualTime', sql.NVarChar(8), '');
            woRequest.input('FlagTPM', sql.NVarChar(1), 'F');
            woRequest.input('TPMNo', sql.Int, 0);
            woRequest.input('EQCompNo', sql.Int, null);
            woRequest.input('WOPlan', sql.NVarChar(sql.MAX), woPlan);
            woRequest.input('AssignRemark', sql.NVarChar(1000), '');
            woRequest.input('SchCurrentFinishDate', sql.NVarChar(8), null);
            woRequest.input('AccNo', sql.Int, null);
            woRequest.input('JsaType', sql.Int, null);
            woRequest.input('JsaNo', sql.NVarChar(100), null);
            woRequest.input('FlagCleaningJobFinish', sql.NVarChar(1), 'F');
            woRequest.input('FlagCleaningJobFinishNotReq', sql.NVarChar(1), 'F');
            woRequest.input('FlagHandoverOper', sql.NVarChar(1), 'F');
            woRequest.input('FlagHandoverOperNotReq', sql.NVarChar(1), 'F');

            console.log('Executing sp_WOMain_Insert...');
            const result = await woRequest.execute('sp_WOMain_Insert');
            console.log('Stored procedure executed. Result:', result);
            
            // Get the WO number from the database since the parameter isn't returning properly
            const woNoRequest = transaction.request();
            const woNoResult = await woNoRequest.query('SELECT IDENT_CURRENT(\'WO\') as WONO');
            const woNo = woNoResult.recordset[0].WONO;
            console.log('Retrieved WO Number from IDENT_CURRENT:', woNo);

            if (!woNo || woNo === 0) {
                throw new Error('Failed to create Work Order - no WO number returned');
            }

            // Update WO status to "Work Initiated" (WOStatusNo = 1, WFStatusCode = '10')
            const updateStatusRequest = transaction.request();
            await updateStatusRequest.query(`
                UPDATE WO 
                SET WOStatusNo = 1, WFStatusCode = '10' 
                WHERE WONO = ${woNo}
            `);
            console.log('Updated WO status to Work Initiated');

            // Step 2: Initiate Workflow using sp_WF_SendTo_WOInsert
            const wfRequest = transaction.request();
            wfRequest.input('WONo', sql.Int, woNo);
            wfRequest.input('Event_Desc', sql.VarChar(250), 'Work Order created via API and sent for approval');
            wfRequest.input('Send_For', sql.Int, 1); // 1 = Approve
            wfRequest.input('Receive_PersonNo', sql.Int, receivePersonNo);
            wfRequest.input('WFActionForNo', sql.Int, 1);
            wfRequest.input('UPDATEUSER', sql.Int, updateUser);

            await wfRequest.execute('sp_WF_SendTo_WOInsert');

            // Commit transaction
            await transaction.commit();

            // Get WO Code for response
            const codeRequest = pool.request();
            codeRequest.input('WONo', sql.Int, woNo);
            const codeResult = await codeRequest.query('SELECT WOCODE FROM WO WHERE WONO = @WONo');
            const woCode = codeResult.recordset[0]?.WOCODE || `WO${woNo}`;

            res.json({
                success: true,
                message: 'Work Order created successfully with workflow integration',
                data: {
                    woNo: woNo,
                    woCode: woCode,
                    woStatus: 'Work Initiated',
                    workflowInitiated: true,
                    createdAt: new Date().toISOString()
                }
            });

        } catch (error) {
            // Rollback transaction on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error creating Work Order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create Work Order',
            error: error.message
        });
    }
});

// Get Work Order Types
app.get('/api/work-order-types', async (req, res) => {
    try {
        const request = pool.request();
        const result = await request.query('SELECT WOTypeNo, WOTypeCode, WOTypeName FROM WOType ORDER BY WOTypeCode');
        
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching Work Order types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Work Order types',
            error: error.message
        });
    }
});

// Get Work Order Statuses
app.get('/api/work-order-statuses', async (req, res) => {
    try {
        const request = pool.request();
        const result = await request.query('SELECT WOStatusNo, WOStatusCode, WOStatusName FROM WOStatus ORDER BY WOStatusNo');
        
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching Work Order statuses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Work Order statuses',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Start server
async function startServer() {
    const dbConnected = await initializeDatabase();
    
    if (!dbConnected) {
        console.error('❌ Failed to connect to database. Server will not start.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`🚀 CMMS Work Order API Server running on port ${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 API docs: http://localhost:${PORT}/api/work-order-types`);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    if (pool) {
        await pool.close();
        console.log('✅ Database connection closed');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    if (pool) {
        await pool.close();
        console.log('✅ Database connection closed');
    }
    process.exit(0);
});

startServer();
