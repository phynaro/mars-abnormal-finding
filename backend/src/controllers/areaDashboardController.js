const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

/**
 * Get area dashboard metrics
 * Accepts explicit area configuration with PU IDs
 */
const getAreaMetrics = async (req, res) => {
  try {
    const { startDate, endDate, week, date, areaConfig } = req.body;

    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    if (!areaConfig || !Array.isArray(areaConfig) || areaConfig.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'areaConfig array is required and must not be empty'
      });
    }

    const pool = await sql.connect(dbConfig);
    const results = [];

    // Process each area in the config
    for (const area of areaConfig) {
      const { areaCode, areaName, plant, machines } = area;

      if (!areaCode || !machines || !Array.isArray(machines) || machines.length === 0) {
        continue; // Skip invalid area config
      }

      // Build date filter for LEFT JOIN condition
      // This ensures machines with no tickets are still shown
      // Only match tickets within the date range - machines with no tickets will still appear
      let dateFilter = `CAST(t.created_at AS DATE) >= @startDate AND CAST(t.created_at AS DATE) <= @endDate`;
      
      // Apply week filter if provided
      if (week && week >= 1 && week <= 4) {
        // Week filtering is handled by date range in frontend, but we can add additional validation here if needed
      }

      // Apply specific date filter if provided
      if (date) {
        dateFilter = `CAST(t.created_at AS DATE) = @date`;
      }

      // Collect all PU IDs from all machines in this area for the query
      const allPuIds = [];
      machines.forEach(machine => {
        if (machine.puIds && Array.isArray(machine.puIds)) {
          allPuIds.push(...machine.puIds);
        }
      });

      if (allPuIds.length === 0) {
        continue; // Skip if no PU IDs
      }

      // Build PU filter for all PUs in the area
      const puPlaceholders = allPuIds.map((_, index) => `@puId${index}`).join(',');
      
      // Get team department mappings (operator vs reliability)
      // Query Dept table to identify team types
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
      const operatorDeptNos = deptResult.recordset
        .filter(d => d.team_type === 'operator')
        .map(d => d.DEPTNO);
      const reliabilityDeptNos = deptResult.recordset
        .filter(d => d.team_type === 'reliability')
        .map(d => d.DEPTNO);

      // Build request with parameters
      const request = pool.request();
      request.input('startDate', sql.Date, startDate);
      request.input('endDate', sql.Date, endDate);
      if (date) {
        request.input('date', sql.Date, date);
      }

      // Add PU ID parameters for all PUs in the area
      allPuIds.forEach((puId, index) => {
        request.input(`puId${index}`, sql.Int, puId);
      });

      // Build department filter conditions
      // For empty arrays, use a condition that will never match (1=0)
      const operatorDeptFilter = operatorDeptNos.length > 0 
        ? `(${operatorDeptNos.map((_, i) => `@opDept${i}`).join(',')})`
        : '(SELECT NULL WHERE 1=0)'; // Empty result set - never matches
      const reliabilityDeptFilter = reliabilityDeptNos.length > 0
        ? `(${reliabilityDeptNos.map((_, i) => `@relDept${i}`).join(',')})`
        : '(SELECT NULL WHERE 1=0)'; // Empty result set - never matches

      // Main query: Get ticket metrics grouped by machine (PU)
      // Start from PU list to ensure all machines are shown even with 0 tickets
      const metricsQuery = `
        SELECT 
          pe.puno,
          pe.machine as machineCode,
          pe.line as lineCode,
          pe.pudescription as machineName,
          -- Open tickets
          COUNT(CASE WHEN t.status NOT IN ('closed', 'finished', 'canceled', 'rejected_final') THEN 1 END) as openTickets,
          -- Closed tickets
          COUNT(CASE WHEN t.status IN ('closed', 'finished') THEN 1 END) as closedTickets,
          -- Closed by operator team
          COUNT(CASE 
            WHEN t.status IN ('closed', 'finished') 
            AND (
              (t.finished_by IS NOT NULL AND p_finished.DEPTNO IN ${operatorDeptFilter})
              OR (t.reviewed_by IS NOT NULL AND p_reviewed.DEPTNO IN ${operatorDeptFilter})
            )
            THEN 1 
          END) as closedByOperator,
          -- Closed by reliability team
          COUNT(CASE 
            WHEN t.status IN ('closed', 'finished') 
            AND (
              (t.finished_by IS NOT NULL AND p_finished.DEPTNO IN ${reliabilityDeptFilter})
              OR (t.reviewed_by IS NOT NULL AND p_reviewed.DEPTNO IN ${reliabilityDeptFilter})
            )
            THEN 1 
          END) as closedByReliability,
          -- Pending by operator team
          COUNT(CASE 
            WHEN t.status IN ('in_progress', 'escalated', 'planed', 'accepted')
            AND t.assigned_to IS NOT NULL
            AND p_assigned.DEPTNO IN ${operatorDeptFilter}
            THEN 1 
          END) as pendingByOperator,
          -- Pending by reliability team
          COUNT(CASE 
            WHEN t.status IN ('in_progress', 'escalated', 'planed', 'accepted')
            AND t.assigned_to IS NOT NULL
            AND p_assigned.DEPTNO IN ${reliabilityDeptFilter}
            THEN 1 
          END) as pendingByReliability,
          -- Delay tickets
          COUNT(CASE 
            WHEN t.schedule_finish < GETDATE()
            AND t.status NOT IN ('closed', 'finished', 'canceled', 'rejected_final')
            THEN 1 
          END) as delayTickets
        FROM IgxPUExtension pe
        LEFT JOIN IgxTickets t ON pe.puno = t.puno 
          AND ${dateFilter}
        LEFT JOIN Person p_finished ON t.finished_by = p_finished.PERSONNO
        LEFT JOIN Person p_reviewed ON t.reviewed_by = p_reviewed.PERSONNO
        LEFT JOIN Person p_assigned ON t.assigned_to = p_assigned.PERSONNO
        WHERE pe.puno IN (${puPlaceholders})
        GROUP BY pe.puno, pe.machine, pe.line, pe.pudescription
        ORDER BY pe.machine, pe.line, pe.puno
      `;

      // Add department parameters only if there are departments
      if (operatorDeptNos.length > 0) {
        operatorDeptNos.forEach((deptNo, index) => {
          request.input(`opDept${index}`, sql.Int, deptNo);
        });
      }
      if (reliabilityDeptNos.length > 0) {
        reliabilityDeptNos.forEach((deptNo, index) => {
          request.input(`relDept${index}`, sql.Int, deptNo);
        });
      }

      const metricsResult = await request.query(metricsQuery);

      // Group metrics by PU ID for lookup
      const metricsByPuId = {};
      metricsResult.recordset.forEach(row => {
        metricsByPuId[row.puno] = {
          openTickets: row.openTickets || 0,
          closedTickets: row.closedTickets || 0,
          closedByOperator: row.closedByOperator || 0,
          closedByReliability: row.closedByReliability || 0,
          pendingByOperator: row.pendingByOperator || 0,
          pendingByReliability: row.pendingByReliability || 0,
          delayTickets: row.delayTickets || 0
        };
      });

      // Process each machine from config and sum metrics from its PU IDs
      const processedMachines = machines.map(machineConfig => {
        const { machineName, puIds } = machineConfig;
        
        // Sum metrics from all PU IDs for this machine
        let totalOpenTickets = 0;
        let totalClosedTickets = 0;
        let totalClosedByOperator = 0;
        let totalClosedByReliability = 0;
        let totalPendingByOperator = 0;
        let totalPendingByReliability = 0;
        let totalDelayTickets = 0;

        puIds.forEach(puId => {
          const puMetrics = metricsByPuId[puId] || {
            openTickets: 0,
            closedTickets: 0,
            closedByOperator: 0,
            closedByReliability: 0,
            pendingByOperator: 0,
            pendingByReliability: 0,
            delayTickets: 0
          };
          
          totalOpenTickets += puMetrics.openTickets;
          totalClosedTickets += puMetrics.closedTickets;
          totalClosedByOperator += puMetrics.closedByOperator;
          totalClosedByReliability += puMetrics.closedByReliability;
          totalPendingByOperator += puMetrics.pendingByOperator;
          totalPendingByReliability += puMetrics.pendingByReliability;
          totalDelayTickets += puMetrics.delayTickets;
        });

        // Calculate percentages
        const totalTickets = totalOpenTickets + totalClosedTickets;
        const percentClosed = totalTickets > 0 ? Math.round((totalClosedTickets / totalTickets) * 100) : 0;
        
        const totalClosed = totalClosedByOperator + totalClosedByReliability;
        const percentClosedByOperator = totalClosed > 0 ? Math.round((totalClosedByOperator / totalClosed) * 100) : 0;
        const percentClosedByReliability = totalClosed > 0 ? Math.round((totalClosedByReliability / totalClosed) * 100) : 0;

        return {
          machineName: machineName || 'Unknown Machine',
          puIds: puIds,
          metrics: {
            openTickets: totalOpenTickets,
            closedTickets: totalClosedTickets,
            percentClosed,
            percentClosedByOperator,
            percentClosedByReliability,
            pendingByOperator: totalPendingByOperator,
            pendingByReliability: totalPendingByReliability,
            delayTickets: totalDelayTickets
          }
        };
      });

      // Calculate area-level metrics (aggregate all machines)
      const areaOpenTickets = processedMachines.reduce((sum, m) => sum + m.metrics.openTickets, 0);
      const areaClosedTickets = processedMachines.reduce((sum, m) => sum + m.metrics.closedTickets, 0);
      const areaTotalTickets = areaOpenTickets + areaClosedTickets;
      const areaPercentClosed = areaTotalTickets > 0 ? Math.round((areaClosedTickets / areaTotalTickets) * 100) : 0;

      results.push({
        areaCode,
        areaName: areaName || areaCode,
        plant: plant || null,
        machines: processedMachines,
        areaMetrics: {
          openTickets: areaOpenTickets,
          closedTickets: areaClosedTickets,
          percentClosed: areaPercentClosed
        }
      });
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error getting area metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get area metrics',
      error: error.message
    });
  }
};

module.exports = {
  getAreaMetrics
};
