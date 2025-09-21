const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

/**
 * Get Backlog by Department (Assign)
 * Returns work order backlog grouped by department and status
 */
exports.getBacklogAssign = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const { siteNo = 3 } = req.query; // Default to site 3

    // Execute stored procedure
    const result = await pool.request()
      .input('SiteNo', sql.Int, parseInt(siteNo))
      .execute('sp_Dashboard_Backlog_Assign');

    // Transform the data for frontend consumption
    const backlogData = result.recordset.map(row => ({
      woStatusName: row.WOStatusName,
      woStatusNo: row.WOStatusNo,
      deptCode: row.DEPTCODE,
      count: row.Cnt,
      total: row.Total
    }));

    res.json({
      success: true,
      data: {
        backlog: backlogData,
        summary: {
          totalWorkOrders: backlogData.reduce((sum, item) => sum + item.total, 0) / backlogData.length || 0,
          totalDepartments: [...new Set(backlogData.map(item => item.deptCode))].length,
          siteNo: parseInt(siteNo)
        }
      }
    });

  } catch (error) {
    console.error('Error in getBacklogAssign:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Backlog by Department - Level 1 Detail (Drill down from getBacklogAssign)
 * Returns detailed work order information for a specific department
 */
exports.getBacklogAssignLv1 = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const { siteNo = 3, deptCode } = req.query;

    // Validate required parameters
    if (!deptCode) {
      return res.status(400).json({
        success: false,
        message: 'deptCode parameter is required'
      });
    }

    // Execute stored procedure
    const result = await pool.request()
      .input('SiteNo', sql.Int, parseInt(siteNo))
      .input('DeptCode', sql.VarChar(50), deptCode)
      .execute('sp_Dashboard_Backlog_Assign_LV1');

    // Transform the data for frontend consumption
    const detailData = result.recordset.map(row => ({
      wono: row.WONO,
      woCode: row.WoCode,
      deptNo: row.DEPTNO,
      wrDate: row.WRDATE,
      dfr: row.DFR,
      woStatusNo: row.WOSTATUSNO,
      woStatusCode: row.WOSTATUSCODE,
      woStatusName: row.WOSTATUSNAME,
      woDate: row.WODATE,
      deptCode: row.DEPTCODE,
      deptName: row.DEPTNAME,
      woTypeCode: row.WOTYPECODE,
      woTypeName: row.WOTYPENAME,
      priorityNo: row.PRIORITYNO,
      priorityCode: row.PRIORITYCODE,
      priorityName: row.PRIORITYNAME,
      wrNo: row.WRNO,
      refWrCode: row.REFWRCode,
      pmNo: row.PMNO,
      refPmCode: row.REFPMCode,
      puNo: row.PUNO,
      puCode: row.PUCode,
      puName: row.PUName,
      eqNo: row.EQNO,
      eqCode: row.EQCode,
      eqName: row.EQName,
      symptom: row.Symptom,
      flagPuDown: row.FlagPUDown,
      aiFlagPuDown: row.aiFlagPUDown,
      puNoEffected: row.PUNO_Effected,
      puEffectedCode: row.PUEffectedCode,
      puEffectedName: row.PUEffectedName,
      adSymptomDtsDate: row.adSymptomDTSDate,
      asSymptomDtsDate: row.asSymptomDTSDate,
      asSymptomDtsTime: row.asSymptomDTSTime,
      adSymptomDtfDate: row.adSymptomDTFDate,
      asSymptomDtfDate: row.asSymptomDTFDate,
      asSymptomDtfTime: row.asSymptomDTFTime,
      dtDuration: row.DT_Duration,
      adSchSDate: row.adSchSDate,
      schSDate: row.SchSDate,
      adSchFDate: row.adSchFDate,
      schFDate: row.SchFDate,
      waitForShutDown: row.WaitForShutDown,
      waitForMaterial: row.WaitForMaterial,
      waitForOther: row.WaitForOther,
      assign: row.Assign,
      planCode: row.PlanCode,
      planFirstName: row.PlanFirstName,
      schDuration: row.SCH_DURATION,
      siteNo: row.SiteNo,
      manHour: row.ManHour,
      wrUrgentCode: row.WRURGENTCODE,
      wrUrgentName: row.WRURGENTNAME,
      wfStatusCode: row.WFStatusCode,
      puLocTypeName: row.PULOCTYPENAME
    }));

    res.json({
      success: true,
      data: {
        details: detailData,
        summary: {
          totalWorkOrders: detailData.length,
          department: deptCode,
          siteNo: parseInt(siteNo),
          statusBreakdown: detailData.reduce((acc, item) => {
            acc[item.woStatusName] = (acc[item.woStatusName] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error('Error in getBacklogAssignLv1:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Backlog by User (AssignTo)
 * Returns work order backlog grouped by assigned user and status
 */
exports.getBacklogAssignTo = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const { siteNo = 3 } = req.query; // Default to site 3

    // Execute stored procedure
    const result = await pool.request()
      .input('SiteNo', sql.Int, parseInt(siteNo))
      .execute('sp_Dashboard_Backlog_AssignTo');

    // Transform the data for frontend consumption
    const backlogData = result.recordset.map(row => ({
      woStatusName: row.WOStatusName,
      woStatusNo: row.WOStatusNo,
      personName: row.PERSON_NAME,
      count: row.Cnt,
      total: row.Total
    }));

    res.json({
      success: true,
      data: {
        backlog: backlogData,
        summary: {
          totalWorkOrders: backlogData.reduce((sum, item) => sum + item.total, 0) / backlogData.length || 0,
          totalUsers: [...new Set(backlogData.map(item => item.personName))].length,
          siteNo: parseInt(siteNo)
        }
      }
    });

  } catch (error) {
    console.error('Error in getBacklogAssignTo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Backlog by User - Level 1 Detail (Drill down from getBacklogAssignTo)
 * Returns detailed work order information for a specific user
 */
exports.getBacklogAssignToLv1 = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const { siteNo = 3, personName } = req.query;

    // Validate required parameters
    if (!personName) {
      return res.status(400).json({
        success: false,
        message: 'personName parameter is required'
      });
    }

    // Execute stored procedure
    const result = await pool.request()
      .input('SiteNo', sql.Int, parseInt(siteNo))
      .input('PersonName', sql.VarChar(100), personName)
      .execute('sp_Dashboard_Backlog_AssignTo_LV1');

    // Transform the data for frontend consumption
    const detailData = result.recordset.map(row => ({
      wono: row.WONO,
      woCode: row.WoCode,
      deptNo: row.DEPTNO,
      wrDate: row.WRDATE,
      dfr: row.DFR,
      woStatusNo: row.WOSTATUSNO,
      woStatusCode: row.WOSTATUSCODE,
      woStatusName: row.WOSTATUSNAME,
      woDate: row.WODATE,
      deptCode: row.DEPTCODE,
      deptName: row.DEPTNAME,
      woTypeCode: row.WOTYPECODE,
      woTypeName: row.WOTYPENAME,
      priorityNo: row.PRIORITYNO,
      priorityCode: row.PRIORITYCODE,
      priorityName: row.PRIORITYNAME,
      wrNo: row.WRNO,
      refWrCode: row.REFWRCode,
      pmNo: row.PMNO,
      refPmCode: row.REFPMCode,
      puNo: row.PUNO,
      puCode: row.PUCode,
      puName: row.PUName,
      eqNo: row.EQNO,
      eqCode: row.EQCode,
      eqName: row.EQName,
      symptom: row.Symptom,
      flagPuDown: row.FlagPUDown,
      aiFlagPuDown: row.aiFlagPUDown,
      puNoEffected: row.PUNO_Effected,
      puEffectedCode: row.PUEffectedCode,
      puEffectedName: row.PUEffectedName,
      adSymptomDtsDate: row.adSymptomDTSDate,
      asSymptomDtsDate: row.asSymptomDTSDate,
      asSymptomDtsTime: row.asSymptomDTSTime,
      adSymptomDtfDate: row.adSymptomDTFDate,
      asSymptomDtfDate: row.asSymptomDTFDate,
      asSymptomDtfTime: row.asSymptomDTFTime,
      dtDuration: row.DT_Duration,
      adSchSDate: row.adSchSDate,
      schSDate: row.SchSDate,
      adSchFDate: row.adSchFDate,
      schFDate: row.SchFDate,
      waitForShutDown: row.WaitForShutDown,
      waitForMaterial: row.WaitForMaterial,
      waitForOther: row.WaitForOther,
      assign: row.Assign,
      planCode: row.PlanCode,
      planFirstName: row.PlanFirstName,
      schDuration: row.SCH_DURATION,
      siteNo: row.SiteNo,
      manHour: row.ManHour,
      wrUrgentCode: row.WRURGENTCODE,
      wrUrgentName: row.WRURGENTNAME,
      wfStatusCode: row.WFStatusCode,
      puLocTypeName: row.PULOCTYPENAME
    }));

    res.json({
      success: true,
      data: {
        details: detailData,
        summary: {
          totalWorkOrders: detailData.length,
          personName: personName,
          siteNo: parseInt(siteNo),
          statusBreakdown: detailData.reduce((acc, item) => {
            acc[item.woStatusName] = (acc[item.woStatusName] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error('Error in getBacklogAssignToLv1:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Backlog by WOType and Department
 * Returns work order backlog grouped by work order type and department
 */
exports.getBacklogByWOTypeAndDept = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const { siteNo = 3 } = req.query; // Default to site 3

    // Execute stored procedure
    const result = await pool.request()
      .input('SiteNo', sql.Int, parseInt(siteNo))
      .execute('sp_Dashboard_WorkBacklog_LV1');

    // Transform the data for frontend consumption
    const backlogData = result.recordset.map(row => ({
      deptNo: row.DEPTNO,
      deptCode: row.DEPTCODE,
      woTypeNo: row.WOTYPENO,
      woTypeCode: row.WOTYPECODE,
      woStatusNo: row.WOSTATUSNO,
      woStatusCode: row.WOSTATUSCODE,
      total: row.Total
    }));

    // Calculate summary statistics
    const totalWorkOrders = backlogData.reduce((sum, item) => sum + item.total, 0);
    const uniqueDepartments = [...new Set(backlogData.map(item => item.deptCode))].length;
    const uniqueWOTypes = [...new Set(backlogData.map(item => item.woTypeCode))].length;
    const uniqueStatuses = [...new Set(backlogData.map(item => item.woStatusCode))].length;

    res.json({
      success: true,
      data: {
        backlog: backlogData,
        summary: {
          totalWorkOrders: totalWorkOrders,
          totalDepartments: uniqueDepartments,
          totalWOTypes: uniqueWOTypes,
          totalStatuses: uniqueStatuses,
          siteNo: parseInt(siteNo)
        }
      }
    });

  } catch (error) {
    console.error('Error in getBacklogByWOTypeAndDept:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
