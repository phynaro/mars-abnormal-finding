const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Get all work orders with filtering and pagination
exports.getWorkOrders = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      startDate,
      endDate,
      search,
      sortBy = 'CREATEDATE',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereClause = "WHERE wo.FLAGDEL = 'F'";
    
    if (status) {
      whereClause += ` AND wo.WOSTATUSNO = ${status}`;
    }
    
    if (type) {
      whereClause += ` AND wo.WOTYPENO = ${type}`;
    }
    
    if (priority) {
      whereClause += ` AND wo.PRIORITYNO = ${priority}`;
    }
    
    if (startDate) {
      whereClause += ` AND wo.WODATE >= '${startDate.replace(/-/g, '')}'`;
    }
    
    if (endDate) {
      whereClause += ` AND wo.WODATE <= '${endDate.replace(/-/g, '')}'`;
    }
    
    if (search) {
      whereClause += ` AND (wo.WOCODE LIKE '%${search}%' OR wo.WO_PROBLEM LIKE '%${search}%' OR wo.RequesterName LIKE '%${search}%')`;
    }

    // Main query with joins
    const query = `
      SELECT 
        wo.WONO,
        wo.WOCODE,
        wo.WODATE,
        wo.WOTIME,
        wo.WO_PROBLEM,
        wo.WO_PLAN,
        wo.WO_CAUSE,
        wo.WO_ACTION,
        wo.SCH_START_D,
        wo.SCH_START_T,
        wo.SCH_FINISH_D,
        wo.SCH_FINISH_T,
        wo.SCH_DURATION,
        wo.ACT_START_D,
        wo.ACT_START_T,
        wo.ACT_FINISH_D,
        wo.ACT_FINISH_T,
        wo.ACT_DURATION,
        wo.RequesterName,
        wo.REQ_PHONE,
        wo.REQ_Email,
        wo.TaskProcedure,
        wo.CREATEDATE,
        wo.UPDATEDATE,
        wo.PMNO,
        wo.EQNO,
        wo.PUNO,
        wo.WRNO,
        wo.WRCODE,
        
        -- Status information
        ws.WOSTATUSCODE,
        ws.WOSTATUSNAME,
        wo.WFStatusCode,
        
        -- Type information
        wt.WOTYPECODE,
        wt.WOTYPENAME,
        
        -- Priority information
        wp.PRIORITYCODE,
        wp.PRIORITYNAME,
        
        -- Equipment/Asset information
        eq.EQCODE,
        eq.EQNAME,
        
        -- Production Unit information
        pu.PUCODE,
        pu.PUNAME,
        
        -- Department information
        dept.DEPTCODE,
        dept.DEPTNAME,
        
        -- Site information
        site.SITECODE,
        site.SITENAME,
        
        -- Safety flags
        wo.HotWork,
        wo.ConfineSpace,
        wo.WorkAtHeight,
        wo.LockOutTagOut,
        wo.FlagSafety,
        wo.FlagEnvironment,
        
        -- Cost information
        wo.PlanMHAmountOfCost,
        wo.ActMHAmountOfCost,
        wo.PlanMTAmountOfCost,
        wo.ActMTAmountOfCost,
        
        -- Evaluation information
        wo.HasEvaluate,
        wo.EvaluateDate,
        wo.EvaluateTime,
        wo.EvaluateNote
        
      FROM WO wo
      LEFT JOIN WOStatus ws ON wo.WOSTATUSNO = ws.WOSTATUSNO
      LEFT JOIN WOType wt ON wo.WOTYPENO = wt.WOTYPENO
      LEFT JOIN WOPriority wp ON wo.PRIORITYNO = wp.PRIORITYNO
      LEFT JOIN EQ eq ON wo.EQNO = eq.EQNO
      LEFT JOIN PU pu ON wo.PUNO = pu.PUNO
      LEFT JOIN Dept dept ON wo.DEPTNO = dept.DEPTNO
      LEFT JOIN Site site ON wo.SiteNo = site.SiteNo
      ${whereClause}
      ORDER BY wo.${sortBy} ${sortOrder}
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM WO wo
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request().query(query),
      pool.request().query(countQuery)
    ]);

    const workOrders = result.recordset.map(wo => ({
      id: wo.WONO,
      woCode: wo.WOCODE,
      date: wo.WODATE,
      time: wo.WOTIME,
      problem: wo.WO_PROBLEM,
      plan: wo.WO_PLAN,
      cause: wo.WO_CAUSE,
      action: wo.WO_ACTION,
      
      // Schedule information
      schedule: {
        startDate: wo.SCH_START_D,
        startTime: wo.SCH_START_T,
        finishDate: wo.SCH_FINISH_D,
        finishTime: wo.SCH_FINISH_T,
        duration: wo.SCH_DURATION
      },
      
      // Actual information
      actual: {
        startDate: wo.ACT_START_D,
        startTime: wo.ACT_START_T,
        finishDate: wo.ACT_FINISH_D,
        finishTime: wo.ACT_FINISH_T,
        duration: wo.ACT_DURATION
      },
      
      // Requester information
      requester: {
        name: wo.RequesterName,
        phone: wo.REQ_PHONE,
        email: wo.REQ_Email
      },
      
      // Status
      status: {
        id: wo.WOSTATUSNO,
        code: wo.WOSTATUSCODE,
        name: wo.WOSTATUSNAME,
        workflowStatus: wo.WFStatusCode
      },
      
      // Type
      type: {
        id: wo.WOTYPENO,
        code: wo.WOTYPECODE,
        name: wo.WOTYPENAME
      },
      
      // Priority
      priority: {
        id: wo.PRIORITYNO,
        code: wo.PRIORITYCODE,
        name: wo.PRIORITYNAME
      },
      
      // Related records
      related: {
        pmNo: wo.PMNO,
        eqNo: wo.EQNO,
        puNo: wo.PUNO,
        wrNo: wo.WRNO,
        wrCode: wo.WRCODE
      },
      
      // Equipment
      equipment: {
        code: wo.EQCODE,
        name: wo.EQNAME
      },
      
      // Production Unit
      productionUnit: {
        code: wo.PUCODE,
        name: wo.PUNAME
      },
      
      // Department
      department: {
        code: wo.DEPTCODE,
        name: wo.DEPTNAME
      },
      
      // Site
      site: {
        code: wo.SITECODE,
        name: wo.SITENAME
      },
      
      // Safety flags
      safety: {
        hotWork: wo.HotWork === 'T',
        confineSpace: wo.ConfineSpace === 'T',
        workAtHeight: wo.WorkAtHeight === 'T',
        lockOutTagOut: wo.LockOutTagOut === 'T',
        safety: wo.FlagSafety === 'T',
        environment: wo.FlagEnvironment === 'T'
      },
      
      // Cost information
      costs: {
        plannedManHours: wo.PlanMHAmountOfCost,
        actualManHours: wo.ActMHAmountOfCost,
        plannedMaterials: wo.PlanMTAmountOfCost,
        actualMaterials: wo.ActMTAmountOfCost
      },
      
      // Evaluation
      evaluation: {
        hasEvaluate: wo.HasEvaluate === 'T',
        date: wo.EvaluateDate,
        time: wo.EvaluateTime,
        note: wo.EvaluateNote
      },
      
      // Procedure
      taskProcedure: wo.TaskProcedure,
      
      // Timestamps
      createdDate: wo.CREATEDATE,
      updatedDate: wo.UPDATEDATE
    }));

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        workOrders,
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
    console.error('Error fetching work orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work orders',
      error: error.message
    });
  }
};

// Get work order by ID
exports.getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        wo.*,
        ws.WOSTATUSCODE,
        ws.WOSTATUSNAME,
        wt.WOTYPECODE,
        wt.WOTYPENAME,
        wp.PRIORITYCODE,
        wp.PRIORITYNAME,
        eq.EQCODE,
        eq.EQNAME,
        pu.PUCODE,
        pu.PUNAME,
        dept.DEPTCODE,
        dept.DEPTNAME,
        site.SITECODE,
        site.SITENAME
      FROM WO wo
      LEFT JOIN WOStatus ws ON wo.WOSTATUSNO = ws.WOSTATUSNO
      LEFT JOIN WOType wt ON wo.WOTYPENO = wt.WOTYPENO
      LEFT JOIN WOPriority wp ON wo.PRIORITYNO = wp.PRIORITYNO
      LEFT JOIN EQ eq ON wo.EQNO = eq.EQNO
      LEFT JOIN PU pu ON wo.PUNO = pu.PUNO
      LEFT JOIN Dept dept ON wo.DEPTNO = dept.DEPTNO
      LEFT JOIN Site site ON wo.SiteNo = site.SiteNo
      WHERE wo.WONO = @id AND wo.FLAGDEL = 'F'
    `;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }

    const wo = result.recordset[0];
    
    const workOrder = {
      id: wo.WONO,
      woCode: wo.WOCODE,
      date: wo.WODATE,
      time: wo.WOTIME,
      problem: wo.WO_PROBLEM,
      plan: wo.WO_PLAN,
      cause: wo.WO_CAUSE,
      action: wo.WO_ACTION,
      
      // Complete work order data structure similar to getWorkOrders
      // ... (same mapping as above)
      
      // All additional fields from the WO table
      allFields: wo
    };

    res.json({
      success: true,
      data: workOrder
    });

  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work order',
      error: error.message
    });
  }
};

// Get work order statistics
exports.getWorkOrderStats = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const statsQuery = `
      SELECT 
        COUNT(*) as totalWorkOrders,
        SUM(CASE WHEN ws.STATUSTYPE = 'N' THEN 1 ELSE 0 END) as activeWorkOrders,
        SUM(CASE WHEN ws.STATUSTYPE = 'S' THEN 1 ELSE 0 END) as completedWorkOrders,
        SUM(CASE WHEN wo.WOSTATUSNO = 1 THEN 1 ELSE 0 END) as initiatedWorkOrders,
        SUM(CASE WHEN wo.WOSTATUSNO = 4 THEN 1 ELSE 0 END) as inProgressWorkOrders,
        SUM(CASE WHEN wo.WOSTATUSNO = 5 THEN 1 ELSE 0 END) as finishedWorkOrders,
        AVG(CASE WHEN wo.ACT_DURATION IS NOT NULL THEN wo.ACT_DURATION END) as avgCompletionTime
      FROM WO wo
      LEFT JOIN WOStatus ws ON wo.WOSTATUSNO = ws.WOSTATUSNO
      WHERE wo.FLAGDEL = 'F'
    `;

    const typeStatsQuery = `
      SELECT 
        wt.WOTYPENAME,
        wt.WOTYPECODE,
        COUNT(*) as count
      FROM WO wo
      LEFT JOIN WOType wt ON wo.WOTYPENO = wt.WOTYPENO
      WHERE wo.FLAGDEL = 'F'
      GROUP BY wt.WOTYPENAME, wt.WOTYPECODE
      ORDER BY count DESC
    `;

    const priorityStatsQuery = `
      SELECT 
        ISNULL(wp.PRIORITYNAME, 'No Priority') as priorityName,
        ISNULL(wp.PRIORITYCODE, 'N/A') as priorityCode,
        COUNT(*) as count
      FROM WO wo
      LEFT JOIN WOPriority wp ON wo.PRIORITYNO = wp.PRIORITYNO
      WHERE wo.FLAGDEL = 'F'
      GROUP BY wp.PRIORITYNAME, wp.PRIORITYCODE
      ORDER BY count DESC
    `;

    const [statsResult, typeStatsResult, priorityStatsResult] = await Promise.all([
      pool.request().query(statsQuery),
      pool.request().query(typeStatsQuery),
      pool.request().query(priorityStatsQuery)
    ]);

    const stats = statsResult.recordset[0];

    res.json({
      success: true,
      data: {
        overview: {
          total: stats.totalWorkOrders,
          active: stats.activeWorkOrders,
          completed: stats.completedWorkOrders,
          initiated: stats.initiatedWorkOrders,
          inProgress: stats.inProgressWorkOrders,
          finished: stats.finishedWorkOrders,
          avgCompletionTime: Math.round(stats.avgCompletionTime || 0)
        },
        byType: typeStatsResult.recordset,
        byPriority: priorityStatsResult.recordset
      }
    });

  } catch (error) {
    console.error('Error fetching work order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work order statistics',
      error: error.message
    });
  }
};

// Get work order types
exports.getWorkOrderTypes = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        WOTYPENO as id,
        WOTYPECODE as code,
        WOTYPENAME as name,
        WOTYPEPARENT as parentId,
        HIERARCHYNO as hierarchy,
        CURR_LEVEL as level,
        WOTypeGroupNo as groupNo,
        FlagProject as isProject,
        FlagFailure as isFailure
      FROM WOType
      WHERE FLAGDEL = 'F'
      ORDER BY CURR_LEVEL, WOTYPENAME
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching work order types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work order types',
      error: error.message
    });
  }
};

// Get work order statuses
exports.getWorkOrderStatuses = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        WOSTATUSNO as id,
        WOSTATUSCODE as code,
        WOSTATUSNAME as name,
        STATUSTYPE as type,
        Status_After as nextStatus
      FROM WOStatus
      WHERE FLAGDEL = 'F'
      ORDER BY WOSTATUSCODE
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching work order statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work order statuses',
      error: error.message
    });
  }
};

// Get work order priorities
exports.getWorkOrderPriorities = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        PRIORITYNO as id,
        PRIORITYCODE as code,
        PRIORITYNAME as name
      FROM WOPriority
      WHERE FLAGDEL = 'F'
      ORDER BY PRIORITYCODE
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching work order priorities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work order priorities',
      error: error.message
    });
  }
};

// Get work order resources
exports.getWorkOrderResources = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        WO_RESCNO as id,
        WONO as workOrderId,
        RESCTYPE as resourceType,
        RESCSUBTYPE as resourceSubType,
        NAME as name,
        UNIT as unit,
        UNITCOST as unitCost,
        QTY as quantity,
        HOURS as hours,
        QTYHOURS as quantityHours,
        AMOUNT as amount,
        REMARK as remark,
        FLAGACT as isActual,
        TRDATE as transactionDate,
        TRTime as transactionTime,
        CRAFTNO as craftId,
        TOOLNO as toolId,
        PARTNO as partId,
        PersonNo as personId,
        MHTypeNo as manHourTypeId,
        VendorNo as vendorId,
        CREATEDATE as createdDate,
        CREATEUSER as createdBy
      FROM WO_Resource
      WHERE WONO = @workOrderId
      ORDER BY TRDATE DESC, TRTime DESC
    `;

    const result = await pool.request()
      .input('workOrderId', sql.Int, id)
      .query(query);

    const resources = result.recordset.map(resource => ({
      id: resource.id,
      workOrderId: resource.workOrderId,
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
      transactionTime: resource.transactionTime,
      relatedIds: {
        craft: resource.craftId,
        tool: resource.toolId,
        part: resource.partId,
        person: resource.personId,
        manHourType: resource.manHourTypeId,
        vendor: resource.vendorId
      },
      createdDate: resource.createdDate,
      createdBy: resource.createdBy
    }));

    res.json({
      success: true,
      data: resources
    });

  } catch (error) {
    console.error('Error fetching work order resources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work order resources',
      error: error.message
    });
  }
};

// Get work order tasks
exports.getWorkOrderTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        TaskNo as id,
        WONo as workOrderId,
        TaskCode as code,
        TaskName as name,
        Component as component,
        Standard as standard,
        TaskProcedure as procedure,
        TaskDate as date,
        TaskTime as time,
        TaskDuration as duration,
        ActDuration as actualDuration,
        Done as isDone,
        Abnormal as isAbnormal,
        AbnormalNote as abnormalNote,
        Remark as remark,
        FinishDate as finishDate,
        FinishTime as finishTime,
        NotComplete as isNotComplete,
        InstallRemove as installRemove,
        SerialNo as serialNumber,
        IMG as imagePath,
        ImageName as imageName,
        CREATEDATE as createdDate,
        CREATEUSER as createdBy,
        UpdateDate as updatedDate,
        UpdateUser as updatedBy
      FROM WO_Task
      WHERE WONo = @workOrderId AND (FLAGDEL IS NULL OR FLAGDEL = 'F')
      ORDER BY TaskCode
    `;

    const result = await pool.request()
      .input('workOrderId', sql.Int, id)
      .query(query);

    const tasks = result.recordset.map(task => ({
      id: task.id,
      workOrderId: task.workOrderId,
      code: task.code,
      name: task.name,
      component: task.component,
      standard: task.standard,
      procedure: task.procedure,
      date: task.date,
      time: task.time,
      duration: task.duration,
      actualDuration: task.actualDuration,
      isDone: task.isDone === 'T',
      isAbnormal: task.isAbnormal === 'T',
      abnormalNote: task.abnormalNote,
      remark: task.remark,
      finishDate: task.finishDate,
      finishTime: task.finishTime,
      isNotComplete: task.isNotComplete === 'T',
      installRemove: task.installRemove,
      serialNumber: task.serialNumber,
      images: {
        path: task.imagePath,
        name: task.imageName
      },
      createdDate: task.createdDate,
      createdBy: task.createdBy,
      updatedDate: task.updatedDate,
      updatedBy: task.updatedBy
    }));

    res.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    console.error('Error fetching work order tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work order tasks',
      error: error.message
    });
  }
};
