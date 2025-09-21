const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Get all workflow types using sp_WF_WFTypes_Retrive stored procedure
exports.getWorkflowTypes = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Call the stored procedure
    const result = await pool.request()
      .execute('sp_WF_WFTypes_Retrive');
    
    // Check if we have results
    if (result.recordset && result.recordset.length > 0) {
      res.json({
        success: true,
        message: 'Workflow types retrieved successfully',
        data: result.recordset,
        count: result.recordset.length
      });
    } else {
      res.json({
        success: true,
        message: 'No workflow types found',
        data: [],
        count: 0
      });
    }
    
  } catch (error) {
    console.error('Error retrieving workflow types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow types',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get workflow type by ID
exports.getWorkflowTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    // Call the stored procedure with ID parameter
    const result = await pool.request()
      .input('WFTYPENO', sql.Int, id)
      .execute('sp_WF_WFTypes_Retrive');
    
    if (result.recordset && result.recordset.length > 0) {
      res.json({
        success: true,
        message: 'Workflow type retrieved successfully',
        data: result.recordset[0]
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Workflow type not found'
      });
    }
    
  } catch (error) {
    console.error('Error retrieving workflow type by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow type',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all workflow tracking records with joins
exports.getWorkflowTracking = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      docNo,
      docCode,
      wfDocFlowCode,
      fromPersonNo,
      receivePersonNo,
      approvedFlag,
      readedFlag,
      actionFlag,
      wfStatusCode,
      startDate,
      endDate,
      search,
      sortBy = 'CreatedAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereClause = "WHERE 1=1";
    
    if (docNo) {
      whereClause += ` AND wt.DocNo = ${docNo}`;
    }
    
    if (docCode) {
      whereClause += ` AND wt.DocCode LIKE '%${docCode}%'`;
    }
    
    if (wfDocFlowCode) {
      whereClause += ` AND wt.WFDocFlowCode = '${wfDocFlowCode}'`;
    }
    
    if (fromPersonNo) {
      whereClause += ` AND wt.From_PersonNo = ${fromPersonNo}`;
    }
    
    if (receivePersonNo) {
      whereClause += ` AND wt.Receive_PersonNo = ${receivePersonNo}`;
    }
    
    if (approvedFlag) {
      whereClause += ` AND wt.Approved_Flag = '${approvedFlag}'`;
    }
    
    if (readedFlag) {
      whereClause += ` AND wt.Readed_Flag = '${readedFlag}'`;
    }
    
    if (actionFlag) {
      whereClause += ` AND wt.Action_Flag = '${actionFlag}'`;
    }
    
    if (wfStatusCode) {
      whereClause += ` AND wt.WFStatusCode = '${wfStatusCode}'`;
    }
    
    if (startDate) {
      whereClause += ` AND wt.Event_Date >= '${startDate.replace(/-/g, '')}'`;
    }
    
    if (endDate) {
      whereClause += ` AND wt.Event_Date <= '${endDate.replace(/-/g, '')}'`;
    }
    
    if (search) {
      whereClause += ` AND (wt.Subject LIKE '%${search}%' OR wt.Event_Desc LIKE '%${search}%' OR wt.DocCode LIKE '%${search}%')`;
    }

    // Main query with joins
    const query = `
      SELECT 
        wt.DocNo,
        wt.DocCode,
        wt.WFDocFlowCode,
        wt.Event_Order,
        wt.WFStepNo,
        wt.Event_Date,
        wt.Event_Time,
        wt.Subject,
        wt.Event_Desc,
        wt.From_PersonNo,
        wt.From_Date,
        wt.From_Time,
        wt.Send_For,
        wt.Receive_PersonNo,
        wt.Receive_UserGroupNo,
        wt.Approved_Flag,
        wt.NotApproved_Flag,
        wt.Approved_PersonNo,
        wt.Approved_Date,
        wt.Approved_Time,
        wt.Readed_Flag,
        wt.Action_Flag,
        wt.MenuID,
        wt.FormID,
        wt.CreateUser,
        wt.CreateDate,
        wt.UpdateUser,
        wt.UpdateDate,
        wt.SiteNo,
        wt.WFStatusCode,
        wt.WFActionForNo,
        wt.ApproveMassage,
        wt.DocStatusNo,
        wt.InboxNo,
        wt.ActionNo,
        wt.CreatedAt,
        
        -- From Person information
        fp.PERSON_NAME as FromPersonName,
        fp.EMAIL as FromPersonEmail,
        fp.PHONE as FromPersonPhone,
        fp.TITLE as FromPersonTitle,
        
        -- Receive Person information
        rp.PERSON_NAME as ReceivePersonName,
        rp.EMAIL as ReceivePersonEmail,
        rp.PHONE as ReceivePersonPhone,
        rp.TITLE as ReceivePersonTitle,
        
        -- Approved Person information
        ap.PERSON_NAME as ApprovedPersonName,
        ap.EMAIL as ApprovedPersonEmail,
        ap.PHONE as ApprovedPersonPhone,
        ap.TITLE as ApprovedPersonTitle,
        
        -- User Group information
        ug.USERGROUPNAME as ReceiveUserGroupName,
        ug.USERGROUPCODE as ReceiveUserGroupCode,
        
        -- Workflow Node information
        wn.NODENAME as WFStepName,
        wn.NODETYPE as WFStepType,
        wn.ORDERNO as WFStepOrder
        
      FROM WFTrackeds wt
      LEFT JOIN Person fp ON wt.From_PersonNo = fp.PERSONNO
      LEFT JOIN Person rp ON wt.Receive_PersonNo = rp.PERSONNO
      LEFT JOIN Person ap ON wt.Approved_PersonNo = ap.PERSONNO
      LEFT JOIN USERGROUP ug ON wt.Receive_UserGroupNo = ug.USERGROUPNO
      LEFT JOIN WF_NODE wn ON wt.WFStepNo = wn.NODENO
      ${whereClause}
      ORDER BY wt.${sortBy} ${sortOrder}
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM WFTrackeds wt
      LEFT JOIN Person fp ON wt.From_PersonNo = fp.PERSONNO
      LEFT JOIN Person rp ON wt.Receive_PersonNo = rp.PERSONNO
      LEFT JOIN Person ap ON wt.Approved_PersonNo = ap.PERSONNO
      LEFT JOIN USERGROUP ug ON wt.Receive_UserGroupNo = ug.USERGROUPNO
      LEFT JOIN WF_NODE wn ON wt.WFStepNo = wn.NODENO
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request().query(query),
      pool.request().query(countQuery)
    ]);

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Workflow tracking records retrieved successfully',
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
    
  } catch (error) {
    console.error('Error retrieving workflow tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow tracking records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get workflow tracking by document number
exports.getWorkflowTrackingByDocNo = async (req, res) => {
  try {
    const { docNo } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        wt.DocNo,
        wt.DocCode,
        wt.WFDocFlowCode,
        wt.Event_Order,
        wt.WFStepNo,
        wt.Event_Date,
        wt.Event_Time,
        wt.Subject,
        wt.Event_Desc,
        wt.From_PersonNo,
        wt.From_Date,
        wt.From_Time,
        wt.Send_For,
        wt.Receive_PersonNo,
        wt.Receive_UserGroupNo,
        wt.Approved_Flag,
        wt.NotApproved_Flag,
        wt.Approved_PersonNo,
        wt.Approved_Date,
        wt.Approved_Time,
        wt.Readed_Flag,
        wt.Action_Flag,
        wt.MenuID,
        wt.FormID,
        wt.CreateUser,
        wt.CreateDate,
        wt.UpdateUser,
        wt.UpdateDate,
        wt.SiteNo,
        wt.WFStatusCode,
        wt.WFActionForNo,
        wt.ApproveMassage,
        wt.DocStatusNo,
        wt.InboxNo,
        wt.ActionNo,
        wt.CreatedAt,
        
        -- From Person information
        fp.PERSON_NAME as FromPersonName,
        fp.EMAIL as FromPersonEmail,
        fp.PHONE as FromPersonPhone,
        fp.TITLE as FromPersonTitle,
        
        -- Receive Person information
        rp.PERSON_NAME as ReceivePersonName,
        rp.EMAIL as ReceivePersonEmail,
        rp.PHONE as ReceivePersonPhone,
        rp.TITLE as ReceivePersonTitle,
        
        -- Approved Person information
        ap.PERSON_NAME as ApprovedPersonName,
        ap.EMAIL as ApprovedPersonEmail,
        ap.PHONE as ApprovedPersonPhone,
        ap.TITLE as ApprovedPersonTitle,
        
        -- User Group information
        ug.USERGROUPNAME as ReceiveUserGroupName,
        ug.USERGROUPCODE as ReceiveUserGroupCode,
        
        -- Workflow Node information
        wn.NODENAME as WFStepName,
        wn.NODETYPE as WFStepType,
        wn.ORDERNO as WFStepOrder
        
      FROM WFTrackeds wt
      LEFT JOIN Person fp ON wt.From_PersonNo = fp.PERSONNO
      LEFT JOIN Person rp ON wt.Receive_PersonNo = rp.PERSONNO
      LEFT JOIN Person ap ON wt.Approved_PersonNo = ap.PERSONNO
      LEFT JOIN USERGROUP ug ON wt.Receive_UserGroupNo = ug.USERGROUPNO
      LEFT JOIN WF_NODE wn ON wt.WFStepNo = wn.NODENO
      WHERE wt.DocNo = @docNo
      ORDER BY wt.Event_Order ASC
    `;

    const result = await pool.request()
      .input('docNo', sql.Int, docNo)
      .query(query);

    if (result.recordset && result.recordset.length > 0) {
      res.json({
        success: true,
        message: 'Workflow tracking records retrieved successfully',
        data: result.recordset,
        count: result.recordset.length
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No workflow tracking records found for this document'
      });
    }
    
  } catch (error) {
    console.error('Error retrieving workflow tracking by DocNo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow tracking records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
