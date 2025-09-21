const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Utility function to map _secUsers table to Person table
const getUserPersonMapping = async (pool, userId) => {
  try {
    // Validate userId parameter - it can be string (UserID) or number
    if (!userId) {
      throw new Error(`Invalid userId parameter: ${userId}`);
    }

    // Get user from _secUsers table with direct Person mapping
    const userQuery = `
      SELECT 
        u.PersonNo,
        u.UserID,
        u.GroupNo,
        u.LevelReport,
        u.StoreRoom,
        u.DBNo,
        u.LineID,
        u.IsActive,
        p.PERSONNO,
        p.PERSON_NAME,
        p.EMAIL,
        p.PHONE,
        p.DEPTNO,
        p.TITLENO,
        p.SiteNo,
        dept.DEPTNAME
      FROM _secUsers u
      LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
      LEFT JOIN Dept dept ON p.DEPTNO = dept.DEPTNO
      WHERE u.UserID = @userId AND (u.IsActive = 1 OR u.IsActive IS NULL)
    `;
    
    const userResult = await pool.request()
      .input('userId', sql.VarChar(50), userId.toString())
      .query(userQuery);
    
    if (userResult.recordset.length === 0) {
      throw new Error('User not found or inactive in _secUsers');
    }
    
    const user = userResult.recordset[0];
    
    // Extract person and department information
    let personNo = user.PersonNo || 0;
    let deptNo = user.DEPTNO || 1;
    let siteNo = user.SiteNo || 1;
    
    // If no Person record found, warn but continue
    if (!user.PERSONNO) {
      console.warn(`No Person record found for user ${userId} (PersonNo: ${personNo}). Using defaults.`);
      personNo = 0;
      deptNo = 1;
      siteNo = 1;
    }
    
    // Default to department 1 if no department found
    if (!deptNo) {
      deptNo = 1;
      console.warn(`No department mapping found for user ${userId}. Using default department ID 1.`);
    }
    
    return {
      userId: user.UserID,
      personNo: personNo,
      email: user.EMAIL || null,
      name: user.PERSON_NAME || user.UserID,
      deptNo: deptNo,
      siteNo: siteNo,
      username: user.UserID,
      department: user.DEPTNAME || null,
      lineId: user.LineID || null,
      groupNo: user.GroupNo || null,
      levelReport: user.LevelReport || null,
      storeRoom: user.StoreRoom || null,
      dbNo: user.DBNo || null
    };
    
  } catch (error) {
    console.error('Error in getUserPersonMapping:', error);
    throw error;
  }
};

// Get all work requests with filtering and pagination
exports.getWorkRequests = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      status,
      urgency,
      requestType,
      startDate,
      endDate,
      search,
      sortBy = 'CREATEDATE',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereClause = "WHERE wr.FLAGDEL = 'F'";
    
    if (status) {
      whereClause += ` AND wr.WRSTATUSNO = ${status}`;
    }
    
    if (urgency) {
      whereClause += ` AND wr.WRURGENTNO = ${urgency}`;
    }
    
    if (requestType) {
      whereClause += ` AND wr.RequestTypeNo = ${requestType}`;
    }
    
    if (startDate) {
      whereClause += ` AND wr.WRDATE >= '${startDate.replace(/-/g, '')}'`;
    }
    
    if (endDate) {
      whereClause += ` AND wr.WRDATE <= '${endDate.replace(/-/g, '')}'`;
    }
    
    if (search) {
      whereClause += ` AND (wr.WRCODE LIKE '%${search}%' OR wr.WRDESC LIKE '%${search}%' OR wr.REQUESTERNAME LIKE '%${search}%')`;
    }

    // Main query with joins
    const query = `
      SELECT 
        wr.WRNO,
        wr.WRCODE,
        wr.WRDATE,
        wr.WRTIME,
        wr.WRDESC,
        wr.REQUESTERNAME,
        wr.REQ_PHONE,
        wr.REQ_Email,
        wr.REMARK,
        wr.DATE_REQ,
        wr.Time_REQ,
        wr.CREATEDATE,
        wr.UPDATEDATE,
        wr.Note,
        wr.BudgetCost,
        
        -- Status information
        ws.WRSTATUSCODE,
        ws.WRSTATUSNAME,
        wr.WFStatusCode,
        
        -- Urgency information
        wu.WRURGENTCODE,
        wu.WRURGENTNAME,
        
        -- Request Type information
        wrt.RequestTypeCode,
        wrt.RequestTypeName,
        
        -- Work Request Type information
        wt.WRTypeCode,
        wt.WRTypeName,
        
        -- Equipment/Asset information
        eq.EQCODE,
        eq.EQNAME,
        
        -- Production Unit information
        pu.PUCODE,
        pu.PUNAME,
        
        -- Department information
        dept_req.DEPTCODE as REQ_DEPTCODE,
        dept_req.DEPTNAME as REQ_DEPTNAME,
        dept_rec.DEPTCODE as REC_DEPTCODE,
        dept_rec.DEPTNAME as REC_DEPTNAME,
        
        -- Site information
        site.SITECODE,
        site.SITENAME,
        
        -- Safety flags
        wr.HotWork,
        wr.ConfineSpace,
        wr.WorkAtHeight,
        wr.LockOutTagOut,
        wr.FlagSafety,
        wr.FlagEnvironment,
        
        -- Approval information
        wr.FLAGAPPROVE,
        wr.APPROVEDATE,
        wr.APPROVETIME,
        wr.APPROVEBY,
        wr.FLAGAPPROVEM,
        wr.APPROVEDATEM,
        wr.APPROVETIMEM,
        wr.APPROVEBYM,
        wr.FLAGAPPROVEC,
        wr.APPROVEDATEC,
        wr.APPROVETIMEC,
        wr.APPROVEBYC,
        
        -- Schedule information
        wr.SCH_START_D,
        wr.SCH_START_T,
        wr.SCH_FINISH_D,
        wr.SCH_FINISH_T,
        wr.SCH_DURATION,
        
        -- Downtime information
        wr.DT_Start_D,
        wr.DT_Start_T,
        wr.DT_Finish_D,
        wr.DT_Finish_T,
        wr.DT_Duration,
        
        -- Related work order
        wr.WONO,
        
        -- Meter reading
        wr.MeterNo,
        wr.MeterRead,
        
        -- Images
        wr.IMG
        
      FROM WR wr
      LEFT JOIN WRStatus ws ON wr.WRSTATUSNO = ws.WRSTATUSNO
      LEFT JOIN WRUrgent wu ON wr.WRURGENTNO = wu.WRURGENTNO
      LEFT JOIN WRRequestType wrt ON wr.RequestTypeNo = wrt.RequestTypeNo
      LEFT JOIN WRType wt ON wr.WOTYPENO = wt.WRTypeNo
      LEFT JOIN EQ eq ON wr.EQNO = eq.EQNO
      LEFT JOIN PU pu ON wr.PUNO = pu.PUNO
      LEFT JOIN Dept dept_req ON wr.DEPT_REQ = dept_req.DEPTNO
      LEFT JOIN Dept dept_rec ON wr.DEPT_REC = dept_rec.DEPTNO
      LEFT JOIN Site site ON wr.SiteNo = site.SiteNo
      ${whereClause}
      ORDER BY wr.${sortBy} ${sortOrder}
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM WR wr
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request().query(query),
      pool.request().query(countQuery)
    ]);

    const workRequests = result.recordset.map(wr => ({
      id: wr.WRNO,
      wrCode: wr.WRCODE,
      date: wr.WRDATE,
      time: wr.WRTIME,
      description: wr.WRDESC,
      remark: wr.REMARK,
      note: wr.Note,
      budgetCost: wr.BudgetCost,
      
      // Requester information
      requester: {
        name: wr.REQUESTERNAME,
        phone: wr.REQ_PHONE,
        email: wr.REQ_Email,
        requestDate: wr.DATE_REQ,
        requestTime: wr.Time_REQ
      },
      
      // Status
      status: {
        id: wr.WRSTATUSNO,
        code: wr.WRSTATUSCODE,
        name: wr.WRSTATUSNAME,
        workflowStatus: wr.WFStatusCode
      },
      
      // Urgency
      urgency: {
        id: wr.WRURGENTNO,
        code: wr.WRURGENTCODE,
        name: wr.WRURGENTNAME
      },
      
      // Request Type
      requestType: {
        id: wr.RequestTypeNo,
        code: wr.RequestTypeCode,
        name: wr.RequestTypeName
      },
      
      // Work Request Type
      wrType: {
        id: wr.WOTYPENO,
        code: wr.WRTypeCode,
        name: wr.WRTypeName
      },
      
      // Equipment
      equipment: {
        id: wr.EQNO,
        code: wr.EQCODE,
        name: wr.EQNAME
      },
      
      // Production Unit
      productionUnit: {
        id: wr.PUNO,
        code: wr.PUCODE,
        name: wr.PUNAME
      },
      
      // Departments
      departments: {
        requesting: {
          code: wr.REQ_DEPTCODE,
          name: wr.REQ_DEPTNAME
        },
        receiving: {
          code: wr.REC_DEPTCODE,
          name: wr.REC_DEPTNAME
        }
      },
      
      // Site
      site: {
        code: wr.SITECODE,
        name: wr.SITENAME
      },
      
      // Safety flags
      safety: {
        hotWork: wr.HotWork === 'T',
        confineSpace: wr.ConfineSpace === 'T',
        workAtHeight: wr.WorkAtHeight === 'T',
        lockOutTagOut: wr.LockOutTagOut === 'T',
        safety: wr.FlagSafety === 'T',
        environment: wr.FlagEnvironment === 'T'
      },
      
      // Approvals
      approvals: {
        general: {
          approved: wr.FLAGAPPROVE === 'T',
          date: wr.APPROVEDATE,
          time: wr.APPROVETIME,
          approvedBy: wr.APPROVEBY
        },
        manager: {
          approved: wr.FLAGAPPROVEM === 'T',
          date: wr.APPROVEDATEM,
          time: wr.APPROVETIMEM,
          approvedBy: wr.APPROVEBYM
        },
        coordinator: {
          approved: wr.FLAGAPPROVEC === 'T',
          date: wr.APPROVEDATEC,
          time: wr.APPROVETIMEC,
          approvedBy: wr.APPROVEBYC
        }
      },
      
      // Schedule information
      schedule: {
        startDate: wr.SCH_START_D,
        startTime: wr.SCH_START_T,
        finishDate: wr.SCH_FINISH_D,
        finishTime: wr.SCH_FINISH_T,
        duration: wr.SCH_DURATION
      },
      
      // Downtime information
      downtime: {
        startDate: wr.DT_Start_D,
        startTime: wr.DT_Start_T,
        finishDate: wr.DT_Finish_D,
        finishTime: wr.DT_Finish_T,
        duration: wr.DT_Duration
      },
      
      // Related records
      related: {
        workOrderId: wr.WONO,
        meterNumber: wr.MeterNo,
        meterReading: wr.MeterRead
      },
      
      // Images
      imagePath: wr.IMG,
      
      // Timestamps
      createdDate: wr.CREATEDATE,
      updatedDate: wr.UPDATEDATE
    }));

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        workRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching work requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work requests',
      error: error.message
    });
  }
};

// Get work request by ID
exports.getWorkRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        wr.*,
        ws.WRSTATUSCODE,
        ws.WRSTATUSNAME,
        wu.WRURGENTCODE,
        wu.WRURGENTNAME,
        wrt.RequestTypeCode,
        wrt.RequestTypeName,
        wt.WRTypeCode,
        wt.WRTypeName,
        eq.EQCODE,
        eq.EQNAME,
        pu.PUCODE,
        pu.PUNAME,
        dept_req.DEPTCODE as REQ_DEPTCODE,
        dept_req.DEPTNAME as REQ_DEPTNAME,
        dept_rec.DEPTCODE as REC_DEPTCODE,
        dept_rec.DEPTNAME as REC_DEPTNAME,
        site.SITECODE,
        site.SITENAME
      FROM WR wr
      LEFT JOIN WRStatus ws ON wr.WRSTATUSNO = ws.WRSTATUSNO
      LEFT JOIN WRUrgent wu ON wr.WRURGENTNO = wu.WRURGENTNO
      LEFT JOIN WRRequestType wrt ON wr.RequestTypeNo = wrt.RequestTypeNo
      LEFT JOIN WRType wt ON wr.WOTYPENO = wt.WRTypeNo
      LEFT JOIN EQ eq ON wr.EQNO = eq.EQNO
      LEFT JOIN PU pu ON wr.PUNO = pu.PUNO
      LEFT JOIN Dept dept_req ON wr.DEPT_REQ = dept_req.DEPTNO
      LEFT JOIN Dept dept_rec ON wr.DEPT_REC = dept_rec.DEPTNO
      LEFT JOIN Site site ON wr.SiteNo = site.SiteNo
      WHERE wr.WRNO = @id AND wr.FLAGDEL = 'F'
    `;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work request not found'
      });
    }

    const wr = result.recordset[0];
    
    const workRequest = {
      id: wr.WRNO,
      wrCode: wr.WRCODE,
      date: wr.WRDATE,
      time: wr.WRTIME,
      description: wr.WRDESC,
      remark: wr.REMARK,
      note: wr.Note,
      budgetCost: wr.BudgetCost,
      
      // Complete work request data structure similar to getWorkRequests
      // ... (same mapping as above)
      
      // All additional fields from the WR table
      allFields: wr
    };

    res.json({
      success: true,
      data: workRequest
    });

  } catch (error) {
    console.error('Error fetching work request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work request',
      error: error.message
    });
  }
};

// Get work request statistics
exports.getWorkRequestStats = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const statsQuery = `
      SELECT 
        COUNT(*) as totalWorkRequests,
        SUM(CASE WHEN ws.STATUSTYPE = 'U' THEN 1 ELSE 0 END) as pendingWorkRequests,
        SUM(CASE WHEN ws.STATUSTYPE = 'S' THEN 1 ELSE 0 END) as completedWorkRequests,
        SUM(CASE WHEN wr.WRSTATUSNO = 1 THEN 1 ELSE 0 END) as initiatedWorkRequests,
        SUM(CASE WHEN wr.WRSTATUSNO = 3 THEN 1 ELSE 0 END) as approvedWorkRequests,
        SUM(CASE WHEN wr.WRSTATUSNO = 6 THEN 1 ELSE 0 END) as woGeneratedWorkRequests,
        AVG(CASE WHEN wr.DT_Duration IS NOT NULL THEN wr.DT_Duration END) as avgDowntime,
        AVG(CASE WHEN wr.BudgetCost IS NOT NULL THEN wr.BudgetCost END) as avgBudgetCost
      FROM WR wr
      LEFT JOIN WRStatus ws ON wr.WRSTATUSNO = ws.WRSTATUSNO
      WHERE wr.FLAGDEL = 'F'
    `;

    const urgencyStatsQuery = `
      SELECT 
        ISNULL(wu.WRURGENTNAME, 'No Urgency') as urgencyName,
        ISNULL(wu.WRURGENTCODE, 'N/A') as urgencyCode,
        COUNT(*) as count
      FROM WR wr
      LEFT JOIN WRUrgent wu ON wr.WRURGENTNO = wu.WRURGENTNO
      WHERE wr.FLAGDEL = 'F'
      GROUP BY wu.WRURGENTNAME, wu.WRURGENTCODE
      ORDER BY count DESC
    `;

    const requestTypeStatsQuery = `
      SELECT 
        ISNULL(wrt.RequestTypeName, 'No Type') as typeName,
        ISNULL(wrt.RequestTypeCode, 'N/A') as typeCode,
        COUNT(*) as count
      FROM WR wr
      LEFT JOIN WRRequestType wrt ON wr.RequestTypeNo = wrt.RequestTypeNo
      WHERE wr.FLAGDEL = 'F'
      GROUP BY wrt.RequestTypeName, wrt.RequestTypeCode
      ORDER BY count DESC
    `;

    const [statsResult, urgencyStatsResult, requestTypeStatsResult] = await Promise.all([
      pool.request().query(statsQuery),
      pool.request().query(urgencyStatsQuery),
      pool.request().query(requestTypeStatsQuery)
    ]);

    const stats = statsResult.recordset[0];

    res.json({
      success: true,
      data: {
        overview: {
          total: stats.totalWorkRequests,
          pending: stats.pendingWorkRequests,
          completed: stats.completedWorkRequests,
          initiated: stats.initiatedWorkRequests,
          approved: stats.approvedWorkRequests,
          woGenerated: stats.woGeneratedWorkRequests,
          avgDowntime: Math.round(stats.avgDowntime || 0),
          avgBudgetCost: Math.round(stats.avgBudgetCost || 0)
        },
        byUrgency: urgencyStatsResult.recordset,
        byRequestType: requestTypeStatsResult.recordset
      }
    });

  } catch (error) {
    console.error('Error fetching work request stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work request statistics',
      error: error.message
    });
  }
};

// Get work request types
exports.getWorkRequestTypes = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        WRTypeNo as id,
        WRTypeCode as code,
        WRTypeName as name
      FROM WRType
      WHERE FlagDel = 'F'
      ORDER BY WRTypeName
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching work request types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work request types',
      error: error.message
    });
  }
};

// Get work request statuses
exports.getWorkRequestStatuses = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        WRSTATUSNO as id,
        WRSTATUSCODE as code,
        WRSTATUSNAME as name,
        STATUSTYPE as type,
        Status_After as nextStatus
      FROM WRStatus
      WHERE FLAGDEL = 'F'
      ORDER BY WRSTATUSCODE
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching work request statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work request statuses',
      error: error.message
    });
  }
};

// Get work request urgency levels
exports.getWorkRequestUrgencies = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        WRURGENTNO as id,
        WRURGENTCODE as code,
        WRURGENTNAME as name
      FROM WRUrgent
      WHERE FLAGDEL = 'F'
      ORDER BY WRURGENTCODE
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching work request urgencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work request urgencies',
      error: error.message
    });
  }
};

// Get work request categories (request types)
exports.getWorkRequestCategories = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        RequestTypeNo as id,
        RequestTypeCode as code,
        RequestTypeName as name,
        SiteNo as siteId
      FROM WRRequestType
      WHERE FLAGDEL = 'F'
      ORDER BY RequestTypeName
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching work request categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work request categories',
      error: error.message
    });
  }
};

// Get work request resources
exports.getWorkRequestResources = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        WR_RescNo as id,
        WRNo as workRequestId,
        RescType as resourceType,
        RescSubType as resourceSubType,
        Name as name,
        Unit as unit,
        UnitCost as unitCost,
        Qty as quantity,
        Hours as hours,
        QtyHours as quantityHours,
        Amount as amount,
        Remark as remark,
        FlagAct as isActual,
        TrDate as transactionDate,
        CraftNo as craftId,
        ToolNo as toolId,
        PartNo as partId,
        CREATEDATE as createdDate,
        CREATEUSER as createdBy
      FROM WR_Resource
      WHERE WRNo = @workRequestId AND (FLAGDEL IS NULL OR FLAGDEL = 'F')
      ORDER BY TrDate DESC
    `;

    const result = await pool.request()
      .input('workRequestId', sql.Int, id)
      .query(query);

    const resources = result.recordset.map(resource => ({
      id: resource.id,
      workRequestId: resource.workRequestId,
      type: resource.resourceType,
      subType: resource.resourceSubType,
      name: resource.name,
      unit: resource.unit,
      unitCost: resource.unitCost,
      quantity: resource.quantity,
      hours: resource.hours,
      quantityHours: resource.quantityHours,
      amount: resource.amount,
      remark: resource.remark,
      isActual: resource.isActual === 'T',
      transactionDate: resource.transactionDate,
      relatedIds: {
        craft: resource.craftId,
        tool: resource.toolId,
        part: resource.partId
      },
      createdDate: resource.createdDate,
      createdBy: resource.createdBy
    }));

    res.json({
      success: true,
      data: resources
    });

  } catch (error) {
    console.error('Error fetching work request resources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work request resources',
      error: error.message
    });
  }
};

// Create new work request with workflow
exports.createWorkRequest = async (req, res) => {
  let pool;
  let transaction;
  
  try {
    const userId = req.user?.userId || req.user?.id; // Support both userId and id for compatibility
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // userId can be string (username) or number (userId) - no need to convert

    const {
      description,
      equipmentCode,        // EQCODE for equipment lookup
      productionUnitId,     // PUNO
      equipmentId,          // EQNO (alternative to equipmentCode)
      costCenterId,         // COSTCENTERNO
      urgencyId = 1,        // WRURGENTNO (default to normal)
      requestTypeId,        // RequestTypeNo
      requestDate,          // DATE_REQ
      requestTime,          // TIME_REQ
      scheduledStartDate,   // SCH_START_D
      scheduledStartTime,   // SCH_START_T
      remark,               // REMARK
      note,                 // Note
      budgetCost,           // BudgetCost
      meterNumber,          // MeterNo
      meterReading,         // MeterRead
      failureModeId,        // FailureModeNo
      symptomId,            // SymptomNo
      phoneNumber,          // REQ_PHONE
      flagPU = false,       // FlagPU - Production Unit affected
      flagTPM = false,      // FlagTPM - TPM related
      tpmId,                // TPMNo
      sjId,                 // SJNO
      taskId,               // TASKNO
      // Safety flags
      hotWork = false,      // HotWork
      confineSpace = false, // ConfineSpace
      workAtHeight = false, // WorkAtHeight
      lockOutTagOut = false, // LockOutTagOut
      flagSafety = false,   // FlagSafety
      flagEnvironment = false, // FlagEnvironment
      // Additional fields
      text1,                // Text1
      eqCompNo,             // EQCompNo
      flagEQ = false,       // FlagEQ
      requestor             // Requestor
    } = req.body;
    console.log(req.body);
    // Validation
    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    pool = await sql.connect(dbConfig);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Get user and person mapping
    const userMapping = await getUserPersonMapping(pool, userId);
    
    // Validate user mapping
    if (!userMapping) {
      throw new Error('Failed to retrieve user mapping');
    }
    
    if (!userMapping.personNo && userMapping.personNo !== 0) {
      console.warn(`No person mapping found for user ${userId}. Using personNo = 0`);
    }
    
    if (!userMapping.deptNo) {
      console.warn(`No department mapping found for user ${userId}. Using deptNo = 1`);
    }
    
    // Get current date and time
    const now = new Date();
    const wrDate = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const wrTime = now.toTimeString().slice(0, 5).replace(':', ''); // HHMM

    // Prepare parameters for stored procedure
    const request = transaction.request();
    
    // Format request date and time if provided
    const formattedRequestDate = requestDate ? 
      new Date(requestDate).toISOString().slice(0, 10).replace(/-/g, '') : wrDate;
    const formattedRequestTime = requestTime || wrTime;
    
    const formattedScheduledStartDate = scheduledStartDate ? 
      new Date(scheduledStartDate).toISOString().slice(0, 10).replace(/-/g, '') : null;
    const formattedScheduledStartTime = scheduledStartTime || null;

    // Add required parameters for sp_WRMain_Insert (removed excess TPM parameters)
    request
      .input('WRDATE', sql.VarChar(8), wrDate)
      .input('WRTIME', sql.VarChar(8), wrTime)
      .input('WRDESC', sql.NVarChar(1000), description.trim())
      .input('SiteNo', sql.Int, userMapping.siteNo || 1)
      .input('UPDATEUSER', sql.Int, userMapping.personNo || 0)
      .input('HotWork', sql.VarChar(1), hotWork ? 'T' : 'F')
      .input('ConfineSpace', sql.VarChar(1), confineSpace ? 'T' : 'F')
      .input('WorkAtHeight', sql.VarChar(1), workAtHeight ? 'T' : 'F')
      .input('LockOutTagOut', sql.VarChar(1), lockOutTagOut ? 'T' : 'F')
      .input('FlagPU', sql.VarChar(1), flagPU ? 'T' : 'F')
      .input('FlagSafety', sql.VarChar(1), flagSafety ? 'T' : 'F')
      .input('FlagEnvironment', sql.VarChar(1), flagEnvironment ? 'T' : 'F')
      .input('PUNO_Effected', sql.Int, flagPU ? productionUnitId : null)
      .input('PUNO', sql.Int, productionUnitId || null)
      .input('EQNO', sql.Int, equipmentId || null)
      .input('EQTypeNo', sql.Int, null) // Will be determined from equipment
      .input('WRURGENTNO', sql.Int, urgencyId)
      .input('DT_Start_D', sql.VarChar(8), formattedScheduledStartDate)
      .input('DT_Start_T', sql.VarChar(8), formattedScheduledStartTime)
      .input('DATE_REQ', sql.VarChar(8), formattedRequestDate)
      .input('Time_REQ', sql.VarChar(8), formattedRequestTime)
      .input('COSTCENTERNO', sql.Int, costCenterId || null)
      .input('REQUESTERNAME', sql.NVarChar(50), userMapping.name || 'Unknown User')
      .input('REQ_PHONE', sql.VarChar(20), phoneNumber || null)
      .input('REQ_Email', sql.NVarChar(50), userMapping.email || null)
      .input('DEPT_REQ', sql.Int, userMapping.deptNo || 1)
      .input('DEPT_REC', sql.Int, null) // Will be determined by equipment/PU
      .input('RECEIVER', sql.Int, null) // Will be determined by workflow
      .input('REQUESTER', sql.Int, userMapping.personNo || 0)
      .input('RequestTypeNo', sql.Int, requestTypeId || null)
      .input('SymptomNo', sql.Int, symptomId || null)
      .input('MeterNo', sql.Int, meterNumber || null)
      .input('MeterRead', sql.Float, meterReading || null)
      .input('FailureModeNo', sql.Int, failureModeId || null)
      .input('Text1', sql.NVarChar(50), text1 || null)
      .input('Note', sql.NVarChar(100), note || null)
      //.input('REMARK', sql.NVarChar(500), remark || null)
      .input('BudgetCost', sql.Decimal(18, 2), budgetCost || null)
      .input('SCH_START_D', sql.VarChar(8), formattedScheduledStartDate)
      .input('SCH_START_T', sql.VarChar(8), formattedScheduledStartTime)
      .input('FlagTPM', sql.NVarChar(1), flagTPM ? 'T' : 'F')
      .input('TPMNo', sql.Int, tpmId || null)
      .input('EQCompNo', sql.Int, eqCompNo || null)
      .input('SJNO', sql.Int, sjId || null)
      .input('TASKNO', sql.Int, taskId || null)
      .input('FlagEQ', sql.VarChar(1), flagEQ ? 'T' : 'F')
      .input('Requestor', sql.Int, requestor || null)
      .output('WRNO', sql.Int);
      

    // Execute the stored procedure to create work request using sp_WRMain_Insert
    console.log('Creating work request with sp_WRMain_Insert...');
    console.log('User mapping:', {
      personNo: userMapping.personNo,
      deptNo: userMapping.deptNo,
      siteNo: userMapping.siteNo,
      name: userMapping.name
    });
    
    const result = await request.execute('sp_WRMain_Insert');
    
    const newWRNO = result.output.WRNO;

    if (!newWRNO) {
      console.error('Stored procedure result:', result);
      throw new Error('Failed to create work request - no WRNO returned from stored procedure');
    }

    console.log(`Work request created with WRNO: ${newWRNO}`);

    // Start the workflow process
    console.log('Starting workflow process...');
    const workflowRequest = transaction.request();
    workflowRequest
      .input('WRNO', sql.Int, newWRNO)
      .input('ACTIONNO', sql.Int, 0) // 0 for auto-routing from start
      .input('DESC', sql.NVarChar(1000), 'Initial work request submission')
      .input('UPDATEUSER', sql.Int, userMapping.personNo || 0);

    const workflowResult = await workflowRequest.execute('sp_WFN_EXEC_NODE_WR');
    console.log('Workflow execution result:', workflowResult.returnValue);
    
    if (workflowResult.returnValue !== 0) {
      console.warn(`Workflow execution returned non-zero value: ${workflowResult.returnValue}`);
    }

    await transaction.commit();
    transaction = null; // Clear transaction reference after successful commit

    // Fetch the created work request with full details
    const createdWRQuery = `
      SELECT 
        wr.WRNO,
        wr.WRCODE,
        wr.WRDATE,
        wr.WRTIME,
        wr.WRDESC,
        wr.WFStatusCode,
        wr.WRSTATUSNO,
        ws.WRSTATUSNAME,
        wr.REQUESTERNAME,
        wr.REQ_PHONE,
        wr.REQ_Email,
        wr.DATE_REQ,
        wr.Time_REQ,
        wu.WRURGENTNAME,
        dept.DEPTNAME as REQ_DEPTNAME,
        wr.Note,
        wr.REMARK,
        wr.BudgetCost
      FROM WR wr
      LEFT JOIN WRStatus ws ON wr.WRSTATUSNO = ws.WRSTATUSNO
      LEFT JOIN WRUrgent wu ON wr.WRURGENTNO = wu.WRURGENTNO
      LEFT JOIN Dept dept ON wr.DEPT_REQ = dept.DEPTNO
      WHERE wr.WRNO = @wrno
    `;

    const createdWRResult = await pool.request()
      .input('wrno', sql.Int, newWRNO)
      .query(createdWRQuery);

    const createdWR = createdWRResult.recordset[0];

    res.status(201).json({
      success: true,
      message: 'Work request created and workflow started successfully',
      data: {
        id: createdWR.WRNO,
        wrCode: createdWR.WRCODE,
        description: createdWR.WRDESC,
        status: {
          id: createdWR.WRSTATUSNO,
          name: createdWR.WRSTATUSNAME,
          workflowStatus: createdWR.WFStatusCode
        },
        requester: {
          name: createdWR.REQUESTERNAME,
          phone: createdWR.REQ_PHONE,
          email: createdWR.REQ_Email,
          department: createdWR.REQ_DEPTNAME
        },
        dates: {
          created: createdWR.WRDATE,
          createdTime: createdWR.WRTIME,
          requested: createdWR.DATE_REQ,
          requestedTime: createdWR.Time_REQ
        },
        urgency: createdWR.WRURGENTNAME,
        remark: createdWR.REMARK,
        note: createdWR.Note,
        budgetCost: createdWR.BudgetCost,
        responseEmail: userMapping.email
      }
    });

  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('Transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    console.error('Error creating work request:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create work request';
    if (error.message.includes('User not found')) {
      errorMessage = 'User authentication failed - user not found';
    } else if (error.message.includes('database')) {
      errorMessage = 'Database connection error';
    } else if (error.message.includes('WRNO')) {
      errorMessage = 'Failed to create work request - database constraint violation';
    } else if (error.message.includes('mapping')) {
      errorMessage = 'User mapping error - please contact administrator';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Error closing pool:', closeError);
      }
    }
  }
};

// Execute workflow action on work request
exports.executeWorkflowAction = async (req, res) => {
  let pool;
  let transaction;
  
  try {
    const { id } = req.params; // Work Request ID
    const userId = req.user?.userId || req.user?.id; // Support both userId and id for compatibility
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const {
      actionType,    // 'approve', 'reject', 'cancel', 'generate_wo'
      actionId,      // Specific action ID from workflow configuration
      description,   // Action description/comment
      reason         // Reason for rejection/cancellation
    } = req.body;

    // Validation
    if (!actionType) {
      return res.status(400).json({
        success: false,
        message: 'Action type is required'
      });
    }

    pool = await sql.connect(dbConfig);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Get user and person mapping
    const userMapping = await getUserPersonMapping(pool, userId);

    // Check if work request exists and get current status
    const wrCheckQuery = `
      SELECT 
        wr.WRNO,
        wr.WRCODE,
        wr.WRSTATUSNO,
        wr.WFStatusCode,
        wr.WFNodeNo,
        ws.WRSTATUSNAME,
        wn.NODETYPE,
        wn.NODENAME
      FROM WR wr
      LEFT JOIN WRStatus ws ON wr.WRSTATUSNO = ws.WRSTATUSNO
      LEFT JOIN WF_NODE wn ON wr.WFNodeNo = wn.NODENO
      WHERE wr.WRNO = @wrno AND wr.FLAGDEL = 'F'
    `;

    const wrCheckResult = await pool.request()
      .input('wrno', sql.Int, id)
      .query(wrCheckQuery);

    if (wrCheckResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work request not found'
      });
    }

    const workRequest = wrCheckResult.recordset[0];
    console.log(`Processing ${actionType} action for WR ${workRequest.WRCODE} (Status: ${workRequest.WRSTATUSNAME})`);

    let actionResult;
    const actionDescription = description || `${actionType} action by ${userMapping.name}`;

    switch (actionType.toLowerCase()) {
      case 'approve':
        // Execute approval workflow
        const approveRequest = transaction.request();
        approveRequest
          .input('WRNO', sql.Int, id)
          .input('FlagApprove', sql.Int, 1) // 1 = Approve
          .input('MassageApprove', sql.NVarChar(150), actionDescription)
          .input('UPDATEUSER', sql.Int, userMapping.personNo || 0);
        
        actionResult = await approveRequest.execute('sp_WF_WRApprove');
        break;

      case 'reject':
        // Execute rejection workflow
        const rejectRequest = transaction.request();
        rejectRequest
          .input('WRNO', sql.Int, id)
          .input('FlagApprove', sql.Int, 0) // 0 = Reject
          .input('MassageApprove', sql.NVarChar(150), reason || actionDescription)
          .input('UPDATEUSER', sql.Int, userMapping.personNo || 0);
        
        actionResult = await rejectRequest.execute('sp_WF_WRApprove');
        break;

      case 'cancel':
        // Execute cancellation workflow
        const cancelRequest = transaction.request();
        cancelRequest
          .input('WRNO', sql.Int, id)
          .input('ACTION', sql.Int, 7) // Action 7 = Cancel
          .input('UPDATEUSER', sql.Int, userMapping.personNo || 0);
        
        actionResult = await cancelRequest.execute('sp_WF_WRStatusUpdate');
        break;

      case 'generate_wo':
        // Generate Work Order from Work Request
        const {
          woTypeId = 1,
          assignedDeptId,
          assignedPersonId,
          assignedUserGroupId,
          vendorId,
          accountId = 0
        } = req.body;

        const generateWORequest = transaction.request();
        generateWORequest
          .input('WONO', sql.Int, null) // OUTPUT
          .input('WRNO', sql.Int, id)
          .input('WOTypeNo', sql.Int, woTypeId)
          .input('DeptNo', sql.Int, assignedDeptId || userMapping.deptNo)
          .input('ASSIGN', sql.Int, assignedPersonId || userMapping.personNo || 0)
          .input('USERGROUPNO', sql.Int, assignedUserGroupId || 0)
          .input('UPDATEUSER', sql.Int, userMapping.personNo || 0)
          .input('VendorNo', sql.Int, vendorId || null)
          .input('AccNo', sql.Int, accountId)
          .output('WONO', sql.Int);

        actionResult = await generateWORequest.execute('sp_WF_WR_Generate_WO');
        break;

      case 'route':
        // Execute specific workflow routing
        if (!actionId) {
          return res.status(400).json({
            success: false,
            message: 'Action ID is required for routing'
          });
        }

        const routeRequest = transaction.request();
        routeRequest
          .input('WRNO', sql.Int, id)
          .input('ACTIONNO', sql.Int, actionId)
          .input('DESC', sql.NVarChar(1000), actionDescription)
          .input('UPDATEUSER', sql.Int, userMapping.personNo || 0);

        actionResult = await routeRequest.execute('sp_WFN_EXEC_NODE_WR');
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported action type: ${actionType}`
        });
    }

    await transaction.commit();

    // Fetch updated work request status
    const updatedWRResult = await pool.request()
      .input('wrno', sql.Int, id)
      .query(wrCheckQuery);

    const updatedWR = updatedWRResult.recordset[0];

    // Get workflow tracking history
    const trackingQuery = `
      SELECT TOP 5
        wft.Event_Order,
        wft.Subject,
        wft.Event_Desc,
        wft.From_PersonNo,
        wft.Event_Date,
        wft.Event_Time,
        wft.Send_for,
        p.PERSON_NAME
      FROM WFTrackeds wft
      LEFT JOIN PERSON p ON wft.From_PersonNo = p.PERSONNO
      WHERE wft.DOCNO = @wrno AND wft.WFDocFlowCode = 'WR'
      ORDER BY wft.Event_Order DESC
    `;

    const trackingResult = await pool.request()
      .input('wrno', sql.Int, id)
      .query(trackingQuery);

    res.json({
      success: true,
      message: `${actionType} action executed successfully`,
      data: {
        workRequest: {
          id: updatedWR.WRNO,
          code: updatedWR.WRCODE,
          status: {
            id: updatedWR.WRSTATUSNO,
            name: updatedWR.WRSTATUSNAME,
            workflowStatus: updatedWR.WFStatusCode
          },
          workflowNode: {
            id: updatedWR.WFNodeNo,
            type: updatedWR.NODETYPE,
            name: updatedWR.NODENAME
          }
        },
        actionResult: {
          type: actionType,
          returnValue: actionResult?.returnValue,
          generatedWONO: actionResult?.output?.WONO
        },
        recentActivity: trackingResult.recordset.map(track => ({
          order: track.Event_Order,
          subject: track.Subject,
          description: track.Event_Desc,
          date: track.Event_Date,
          time: track.Event_Time,
          actionBy: track.PERSON_NAME,
          sendFor: track.Send_for
        }))
      }
    });

  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    console.error('Error executing workflow action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute workflow action',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Error closing pool:', closeError);
      }
    }
  }
};

// Get workflow status and available actions for work request
exports.getWorkflowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id; // Support both userId and id for compatibility
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const pool = await sql.connect(dbConfig);
    
    // Get user and person mapping
    const userMapping = await getUserPersonMapping(pool, userId);

    // Get work request workflow status
    const workflowStatusQuery = `
      SELECT 
        wr.WRNO,
        wr.WRCODE,
        wr.WRSTATUSNO,
        wr.WFStatusCode,
        wr.WFNodeNo,
        wr.WFStepApproveNo,
        ws.WRSTATUSNAME,
        ws.STATUSTYPE,
        wn.NODETYPE,
        wn.NODENAME,
        wn.WFNO
      FROM WR wr
      LEFT JOIN WRStatus ws ON wr.WRSTATUSNO = ws.WRSTATUSNO
      LEFT JOIN WF_NODE wn ON wr.WFNodeNo = wn.NODENO
      WHERE wr.WRNO = @wrno AND wr.FLAGDEL = 'F'
    `;

    const workflowResult = await pool.request()
      .input('wrno', sql.Int, id)
      .query(workflowStatusQuery);

    if (workflowResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work request not found'
      });
    }

    const wr = workflowResult.recordset[0];

    // Get available actions for current user and workflow node
    const availableActionsQuery = `
      SELECT 
        wna.ACTIONNO,
        wna.ACTIONNAME,
        wna.ACTIONDESC,
        wna.SEQ,
        wna.FLAG_ROUTE,
        wnr.TO_GROUP,
        wnr.FROM_GROUP
      FROM WF_NODE_ACTION wna
      LEFT JOIN WF_NODE_ROUTE wnr ON wna.ACTIONNO = wnr.ACTIONNO
      LEFT JOIN USERGROUP_MEMBER ugm ON wnr.FROM_GROUP = ugm.USERGROUPNO
      WHERE wna.NODENO = @nodeno 
        AND (ugm.PERSON = @personno OR wnr.FROM_GROUP IS NULL)
      ORDER BY wna.SEQ
    `;

    const actionsResult = await pool.request()
      .input('nodeno', sql.Int, wr.WFNodeNo)
      .input('personno', sql.Int, userMapping.personNo || 0)
      .query(availableActionsQuery);

    // Get workflow tracking history
    const trackingQuery = `
      SELECT 
        wft.Event_Order,
        wft.Subject,
        wft.Event_Desc,
        wft.From_PersonNo,
        wft.Event_Date,
        wft.Event_Time,
        wft.Send_for,
        wft.Receive_PersonNo,
        wft.Receive_UserGroupNo,
        wft.ActionNo,
        wft.Approved_Flag,
        wft.NotApproved_Flag,
        wft.Readed_Flag,
        wft.Action_Flag,
        p.PERSON_NAME as FROM_PERSON_NAME,
        rp.PERSON_NAME as TO_PERSON_NAME
      FROM WFTrackeds wft
      LEFT JOIN PERSON p ON wft.From_PersonNo = p.PERSONNO
      LEFT JOIN PERSON rp ON wft.Receive_PersonNo = rp.PERSONNO
      WHERE wft.DOCNO = @wrno AND wft.WFDocFlowCode = 'WR'
      ORDER BY wft.Event_Order
    `;

    const trackingResult = await pool.request()
      .input('wrno', sql.Int, id)
      .query(trackingQuery);

    // Check if current user can perform actions
    const canApprove = wr.NODETYPE === 'A' && wr.STATUSTYPE === 'U'; // Approval node and status is Under process
    const canReject = canApprove;
    const canCancel = wr.STATUSTYPE === 'U' && !['7', '8'].includes(wr.WRSTATUSNO?.toString()); // Not already cancelled or completed
    const canGenerateWO = wr.WRSTATUSNO === 3; // Approved status

    res.json({
      success: true,
      data: {
        workRequest: {
          id: wr.WRNO,
          code: wr.WRCODE,
          status: {
            id: wr.WRSTATUSNO,
            name: wr.WRSTATUSNAME,
            type: wr.STATUSTYPE,
            workflowStatus: wr.WFStatusCode,
            stepApproveNo: wr.WFStepApproveNo
          },
          workflowNode: {
            id: wr.WFNodeNo,
            type: wr.NODETYPE,
            name: wr.NODENAME,
            workflowId: wr.WFNO
          }
        },
        availableActions: {
          canApprove,
          canReject,
          canCancel,
          canGenerateWO,
          workflowActions: actionsResult.recordset.map(action => ({
            id: action.ACTIONNO,
            name: action.ACTIONNAME,
            description: action.ACTIONDESC,
            sequence: action.SEQ,
            isRouting: action.FLAG_ROUTE === 'T',
            fromGroup: action.FROM_GROUP,
            toGroup: action.TO_GROUP
          }))
        },
        workflowHistory: trackingResult.recordset.map(track => ({
          order: track.Event_Order,
          subject: track.Subject,
          description: track.Event_Desc,
          actionId: track.ActionNo,
          date: track.Event_Date,
          time: track.Event_Time,
          from: {
            personId: track.From_PersonNo,
            personName: track.FROM_PERSON_NAME
          },
          to: {
            personId: track.Receive_PersonNo,
            personName: track.TO_PERSON_NAME,
            userGroupId: track.Receive_UserGroupNo
          },
          flags: {
            sendFor: track.Send_for,
            approved: track.Approved_Flag === 'T',
            notApproved: track.NotApproved_Flag === 'T',
            readed: track.Readed_Flag === 'T',
            actionCompleted: track.Action_Flag === 'T'
          }
        })),
        userContext: {
          userId: userMapping.userId,
          personId: userMapping.personNo,
          name: userMapping.name,
          departmentId: userMapping.deptNo
        }
      }
    });

  } catch (error) {
    console.error('Error fetching workflow status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow status',
      error: error.message
    });
  }
};

// Get user's workflow tasks (items in their inbox)
exports.getMyWorkflowTasks = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id; // Support both userId and id for compatibility
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const {
      page = 1,
      limit = 20,
      taskType = 'pending' // 'pending', 'completed', 'all'
    } = req.query;

    const offset = (page - 1) * limit;
    const pool = await sql.connect(dbConfig);
    
    // Get user and person mapping
    const userMapping = await getUserPersonMapping(pool, userId);

    let whereClause = `
      WHERE (wft.Receive_PersonNo = @personno OR wft.Receive_UserGroupNo IN (
        SELECT USERGROUPNO FROM USERGROUP_MEMBER WHERE PERSON = @personno
      ))
      AND wft.WFDocFlowCode = 'WR'
    `;

    if (taskType === 'pending') {
      whereClause += ` AND wft.Action_Flag = 'F' AND wft.Send_for = 1`;
    } else if (taskType === 'completed') {
      whereClause += ` AND wft.Action_Flag = 'T'`;
    }

    const query = `
      SELECT 
        wft.DOCNO as WRNO,
        wft.DOCCODE as WRCODE,
        wft.Subject,
        wft.Event_Desc,
        wft.Event_Date,
        wft.Event_Time,
        wft.Send_for,
        wft.Action_Flag,
        wft.Approved_Flag,
        wft.Readed_Flag,
        wr.WRDESC,
        wr.REQUESTERNAME,
        wr.DATE_REQ,
        wr.WRSTATUSNO,
        ws.WRSTATUSNAME,
        wu.WRURGENTNAME,
        wu.WRURGENTCODE,
        dept.DEPTNAME as REQ_DEPT_NAME
      FROM WFTrackeds wft
      LEFT JOIN WR wr ON wft.DOCNO = wr.WRNO
      LEFT JOIN WRStatus ws ON wr.WRSTATUSNO = ws.WRSTATUSNO
      LEFT JOIN WRUrgent wu ON wr.WRURGENTNO = wu.WRURGENTNO
      LEFT JOIN Dept dept ON wr.DEPT_REQ = dept.DEPTNO
      ${whereClause}
      ORDER BY wft.Event_Date DESC, wft.Event_Time DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM WFTrackeds wft
      LEFT JOIN WR wr ON wft.DOCNO = wr.WRNO
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request()
        .input('personno', sql.Int, userMapping.personNo || 0)
        .query(query),
      pool.request()
        .input('personno', sql.Int, userMapping.personNo || 0)
        .query(countQuery)
    ]);

    const tasks = result.recordset.map(task => ({
      workRequest: {
        id: task.WRNO,
        code: task.WRCODE,
        description: task.WRDESC,
        requester: task.REQUESTERNAME,
        requestDate: task.DATE_REQ,
        department: task.REQ_DEPT_NAME,
        status: {
          id: task.WRSTATUSNO,
          name: task.WRSTATUSNAME
        },
        urgency: {
          code: task.WRURGENTCODE,
          name: task.WRURGENTNAME
        }
      },
      workflow: {
        subject: task.Subject,
        description: task.Event_Desc,
        eventDate: task.Event_Date,
        eventTime: task.Event_Time,
        sendFor: task.Send_for,
        flags: {
          actionCompleted: task.Action_Flag === 'T',
          approved: task.Approved_Flag === 'T',
          read: task.Readed_Flag === 'T'
        }
      }
    }));

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        summary: {
          taskType,
          userContext: {
            userId: userMapping.userId,
            personId: userMapping.personNo,
            name: userMapping.name
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching workflow tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow tasks',
      error: error.message
    });
  }
};
