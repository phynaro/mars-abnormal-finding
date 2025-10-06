const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

/**
 * Convert period range to date range
 * Periods are 28 days starting from the first Sunday of the year
 */
function getDateRangeFromPeriods(year, fromPeriod, toPeriod) {
  // Use local timezone to avoid UTC issues
  const firstDayOfYear = new Date(year, 0, 1, 0, 0, 0, 0); // Local time
  const firstSunday = new Date(firstDayOfYear);
  
  // Adjust to first Sunday
  const dayOfWeek = firstDayOfYear.getDay();
  
  const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  firstSunday.setDate(firstDayOfYear.getDate() + daysToAdd);
  
  //console.log('firstSunday (local):', firstSunday.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  
  // Calculate start date (first day of fromPeriod)
  const startDate = new Date(firstSunday);
  startDate.setDate(firstSunday.getDate() + (fromPeriod - 1) * 28);
  
  // Calculate end date (last day of toPeriod - Saturday)
  const endDate = new Date(firstSunday);
  endDate.setDate(firstSunday.getDate() + (toPeriod * 28) - 1);
  
  // console.log(`Period ${fromPeriod}-${toPeriod} range:`, {
  //   start: startDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
  //   end: endDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  // });
  
  return {
    startDate: startDate.toLocaleDateString('en-CA').replace(/-/g, ''), // YYYYMMDD format in local timezone
    endDate: endDate.toLocaleDateString('en-CA').replace(/-/g, ''),     // YYYYMMDD format in local timezone
  };
}

/**
 * Group daily data by periods
 */
function groupDailyDataByPeriods(dailyData, year) {
  const periodGroups = {};
  
  dailyData.forEach(item => {
    const date = new Date(item.date);
    const periodInfo = calculatePeriodForDate(date, year);
    const periodKey = `${year}-P${String(periodInfo.period).padStart(2, '0')}`;
    
    if (!periodGroups[periodKey]) {
      periodGroups[periodKey] = {
        date: periodKey,
        count: 0,
        year: parseInt(year),
        period: periodInfo.period,
        periodStart: null,
        periodEnd: null
      };
    }
    
    periodGroups[periodKey].count += item.count;
    
    // Track period start and end dates
    if (!periodGroups[periodKey].periodStart || item.date < periodGroups[periodKey].periodStart) {
      periodGroups[periodKey].periodStart = item.date;
    }
    if (!periodGroups[periodKey].periodEnd || item.date > periodGroups[periodKey].periodEnd) {
      periodGroups[periodKey].periodEnd = item.date;
    }
  });
  
  return Object.values(periodGroups).sort((a, b) => a.period - b.period);
}

/**
 * Calculate period for a specific date
 */
function calculatePeriodForDate(date, year) {
  const firstDayOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
  const firstSunday = new Date(firstDayOfYear);
  
  // Adjust to first Sunday
  const dayOfWeek = firstDayOfYear.getDay();
  const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  firstSunday.setDate(firstDayOfYear.getDate() + daysToAdd);
  
  // Calculate period number (1-based)
  const daysSinceFirstSunday = Math.floor((date - firstSunday) / (1000 * 60 * 60 * 24));
  const periodNumber = Math.floor(daysSinceFirstSunday / 28) + 1;
  
  return {
    period: periodNumber,
    firstSunday
  };
}

/**
 * Fill missing periods with zero counts
 */
function fillMissingPeriods(trendData, groupBy, year, fromPeriod, toPeriod, fromYear, toYear) {
  if (groupBy === 'daily') {
    // For daily, fill missing dates
    const existingDates = new Set(trendData.map(item => item.date));
    const dateRange = getDateRangeFromPeriods(year, fromPeriod, toPeriod);
    
    // Parse start and end dates
    const startDate = new Date(dateRange.startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const endDate = new Date(dateRange.endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    
    const filledData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toLocaleDateString('en-CA');
      const existingItem = trendData.find(item => item.date === dateStr);
      
      if (existingItem) {
        filledData.push(existingItem);
      } else {
        filledData.push({
          date: dateStr,
          count: 0,
          periodStart: dateStr,
          periodEnd: dateStr
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return filledData;
    
  } else if (groupBy === 'weekly') {
    // For weekly, fill missing weeks
    const existingWeeks = new Set(trendData.map(item => item.date));
    const filledData = [];
    
    // Calculate total weeks in the period range
    const totalWeeks = (parseInt(toPeriod) - parseInt(fromPeriod) + 1) * 4;
    const startWeek = (parseInt(fromPeriod) - 1) * 4 + 1;
    
    for (let w = startWeek; w < startWeek + totalWeeks; w++) {
      const weekLabel = `${year}-W${String(w).padStart(2, '0')}`;
      const existingItem = trendData.find(item => item.date === weekLabel);
      
      if (existingItem) {
        filledData.push(existingItem);
      } else {
        filledData.push({
          date: weekLabel,
          count: 0,
          year: parseInt(year),
          week: w,
          period: Math.ceil(w / 4)
        });
      }
    }
    
    return filledData;
    
  } else if (groupBy === 'period') {
    // For period, fill missing periods
    const existingPeriods = new Set(trendData.map(item => item.date));
    const filledData = [];
    
    if (fromYear && toYear) {
      // Fill periods for year range
      for (let currentYear = parseInt(fromYear); currentYear <= parseInt(toYear); currentYear++) {
        // Calculate total periods in the year (approximately 13 periods)
        const totalPeriods = Math.ceil(365 / 28);
        
        for (let p = 1; p <= totalPeriods; p++) {
          const periodLabel = `${currentYear}-P${String(p).padStart(2, '0')}`;
          const existingItem = trendData.find(item => item.date === periodLabel);
          
          if (existingItem) {
            filledData.push(existingItem);
          } else {
            filledData.push({
              date: periodLabel,
              count: 0,
              year: currentYear,
              period: p
            });
          }
        }
      }
    } else if (year && fromPeriod && toPeriod) {
      // Fill periods for single year with period range
      for (let p = parseInt(fromPeriod); p <= parseInt(toPeriod); p++) {
        const periodLabel = `${year}-P${String(p).padStart(2, '0')}`;
        const existingItem = trendData.find(item => item.date === periodLabel);
        
        if (existingItem) {
          filledData.push(existingItem);
        } else {
          filledData.push({
            date: periodLabel,
            count: 0,
            year: parseInt(year),
            period: p
          });
        }
      }
    }
    
    return filledData;
  }
  
  return trendData;
}

/**
 * Get Work Order Volume Trend
 * Returns aggregated work order counts over time with filtering options
 */
exports.getWorkOrderVolumeTrend = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      groupBy = 'daily', // daily, weekly, period
      woType,
      department,
      site,
      assign,
      year,
      fromPeriod,
      toPeriod,
      fromYear,
      toYear
    } = req.query;

    // Validate groupBy parameter
    const validGroupBy = ['daily', 'weekly', 'period'];
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid groupBy parameter. Must be one of: daily, weekly, period'
      });
    }

    // Build WHERE clause based on filters
    let whereClause = "WHERE wo.FLAGDEL = 'F'";
    
    // Handle date range based on grouping
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    
    if (groupBy !== 'daily' && year && fromPeriod && toPeriod) {
      // Convert period range to date range
      const dateRange = getDateRangeFromPeriods(parseInt(year), parseInt(fromPeriod), parseInt(toPeriod));
      finalStartDate = dateRange.startDate;
      finalEndDate = dateRange.endDate;
      //console.log(`Period range ${year} P${fromPeriod}-P${toPeriod} converted to dates: ${finalStartDate} to ${finalEndDate}`);
    }
    
    if (finalStartDate) {
      whereClause += ` AND wo.WODATE >= '${finalStartDate.replace(/-/g, '')}'`;
    }
    
    if (finalEndDate) {
      whereClause += ` AND wo.WODATE <= '${finalEndDate.replace(/-/g, '')}'`;
    }
    
    if (woType) {
      whereClause += ` AND wo.WOTYPENO = ${woType}`;
    }
    
    if (department) {
      whereClause += ` AND wo.DEPTNO = ${department}`;
    }
    
    if (site) {
      whereClause += ` AND wo.SiteNo = ${site}`;
    }
    
    if (assign) {
      whereClause += ` AND wo.ASSIGN = ${assign}`;
    }

    // Build GROUP BY clause based on groupBy parameter
    let groupByClause;
    let dateFormat;
    
    switch (groupBy) {
      case 'daily':
        groupByClause = "CONVERT(DATE, wo.WODATE)";
        dateFormat = "yyyy-MM-dd";
        break;
      case 'weekly':
        groupByClause = "DATEPART(YEAR, wo.WODATE), DATEPART(WEEK, wo.WODATE)";
        dateFormat = "yyyy-'W'ww";
        break;
      case 'period':
        groupByClause = "YEAR(wo.WODATE), MONTH(wo.WODATE)";
        dateFormat = "yyyy-MM";
        break;
    }

    // Build the main query
    let query;
    
    if (groupBy === 'weekly') {
      query = `
        SELECT 
          CONCAT(DATEPART(YEAR, wo.WODATE), '-W', RIGHT('0' + CAST(DATEPART(WEEK, wo.WODATE) AS VARCHAR(2)), 2)) as date_group,
          DATEPART(YEAR, wo.WODATE) as year,
          DATEPART(WEEK, wo.WODATE) as week,
          COUNT(*) as work_order_count,
          MIN(wo.WODATE) as period_start,
          MAX(wo.WODATE) as period_end
        FROM WO wo
        LEFT JOIN WOType wt ON wo.WOTYPENO = wt.WOTYPENO
        LEFT JOIN Dept dept ON wo.DEPTNO = dept.DEPTNO
        LEFT JOIN Site site ON wo.SiteNo = site.SiteNo
        ${whereClause}
        GROUP BY DATEPART(YEAR, wo.WODATE), DATEPART(WEEK, wo.WODATE)
        ORDER BY year, week
      `;
    } else if (groupBy === 'period') {
      // For period grouping, we'll get daily data and group by periods in JavaScript
      query = `
        SELECT 
          CONVERT(DATE, wo.WODATE) as date_group,
          CONVERT(DATE, wo.WODATE) as period_start,
          CONVERT(DATE, wo.WODATE) as period_end,
          COUNT(*) as work_order_count
        FROM WO wo
        LEFT JOIN WOType wt ON wo.WOTYPENO = wt.WOTYPENO
        LEFT JOIN Dept dept ON wo.DEPTNO = dept.DEPTNO
        LEFT JOIN Site site ON wo.SiteNo = site.SiteNo
        ${whereClause}
        GROUP BY CONVERT(DATE, wo.WODATE)
        ORDER BY date_group
      `;
    } else {
      // Daily grouping
      query = `
        SELECT 
          CONVERT(DATE, wo.WODATE) as date_group,
          CONVERT(DATE, wo.WODATE) as period_start,
          CONVERT(DATE, wo.WODATE) as period_end,
          COUNT(*) as work_order_count
        FROM WO wo
        LEFT JOIN WOType wt ON wo.WOTYPENO = wt.WOTYPENO
        LEFT JOIN Dept dept ON wo.DEPTNO = dept.DEPTNO
        LEFT JOIN Site site ON wo.SiteNo = site.SiteNo
        ${whereClause}
        GROUP BY CONVERT(DATE, wo.WODATE)
        ORDER BY date_group
      `;
    }

    //console.log(query);

    const result = await pool.request().query(query);

    // Transform the data for frontend consumption
    const trendData = result.recordset.map(row => ({
      date: row.date_group,
      count: row.work_order_count,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      ...(row.year && { year: row.year }),
      ...(row.week && { week: row.week }),
      ...(row.period && { period: row.period })
    }));
    
    // For period grouping, group daily data by periods
    let processedTrendData = trendData;
    if (groupBy === 'period') {
      // For period grouping with year range, we need to handle multiple years
      if (fromYear && toYear) {
        // Group data by periods for each year in the range
        const allPeriodData = [];
        for (let currentYear = parseInt(fromYear); currentYear <= parseInt(toYear); currentYear++) {
          const yearData = groupDailyDataByPeriods(trendData, currentYear);
          allPeriodData.push(...yearData);
        }
        processedTrendData = allPeriodData;
      } else if (year) {
        // Fallback for single year (for weekly grouping compatibility)
        processedTrendData = groupDailyDataByPeriods(trendData, year);
      }
    }
    // Fill missing periods with zero counts
    const filledTrendData = fillMissingPeriods(processedTrendData, groupBy, year, fromPeriod, toPeriod, fromYear, toYear);

    // Get filter options for frontend
    const filterOptions = await getFilterOptions(pool);

    // Get period information for range selection
    const periodInfo = await getPeriodInfo(pool);

    res.json({
      success: true,
      data: {
        trend: filledTrendData,
        filters: filterOptions,
        periodInfo: periodInfo,
        summary: {
          totalWorkOrders: trendData.reduce((sum, item) => sum + item.count, 0),
          dateRange: {
            start: trendData.length > 0 ? trendData[0].periodStart : null,
            end: trendData.length > 0 ? trendData[trendData.length - 1].periodEnd : null
          },
          groupBy: groupBy,
          appliedFilters: {
            woType,
            department,
            site,
            assign
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getWorkOrderVolumeTrend:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get filter options for the dashboard
 */
async function getFilterOptions(pool) {
  try {
    const [woTypes, departments, sites] = await Promise.all([
      pool.request().query(`
        SELECT WOTYPENO as id, WOTYPECODE as code, WOTYPENAME as name
        FROM WOType 
        WHERE FLAGDEL = 'F'
        ORDER BY WOTYPENAME
      `),
      pool.request().query(`
        SELECT DEPTNO as id, DEPTCODE as code, DEPTNAME as name
        FROM Dept 
        WHERE FLAGDEL = 'F'
        ORDER BY DEPTNAME
      `),
      pool.request().query(`
        SELECT SiteNo as id, SITECODE as code, SITENAME as name
        FROM Site 
        WHERE FLAGDEL = 'F'
        ORDER BY SITENAME
      `)
    ]);

    return {
      woTypes: woTypes.recordset,
      departments: departments.recordset,
      sites: sites.recordset
    };
  } catch (error) {
    console.error('Error getting filter options:', error);
    return {
      woTypes: [],
      departments: [],
      sites: []
    };
  }
}

/**
 * Get Current Company Year
 * Returns the current company year based on today's date using the database function
 */
exports.getCurrentCompanyYear = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Use the database function to get current company year
    const query = `
      SELECT dbo.fn_CompanyYearOfDate(GETDATE()) as currentCompanyYear
    `;

    const result = await pool.request().query(query);
    
    const currentCompanyYear = result.recordset[0]?.currentCompanyYear;

    res.json({
      success: true,
      data: {
        currentCompanyYear: currentCompanyYear,
        today: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getCurrentCompanyYear:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Work Order Volume Filter Options
 * Returns available filter options based on applied filters (separate from main data)
 */
exports.getWorkOrderVolumeFilterOptions = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters for filter context
    const {
      companyYear,
      assignee,
      woTypeNo,
      deptno,
      puno
    } = req.query;

    // Get filter options based on applied filters
    const filterOptions = await getWorkOrderVolumeFilterOptions(pool, {
      companyYear,
      assignee,
      woTypeNo,
      deptno,
      puno
    });

    res.json({
      success: true,
      data: {
        filters: filterOptions,
        appliedFilters: {
          companyYear,
          assignee,
          woTypeNo,
          deptno,
          puno
        }
      }
    });

  } catch (error) {
    console.error('Error in getWorkOrderVolumeFilterOptions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Work Order Statistics by Period
 * Returns work order statistics grouped by company year and period with filtering options
 */
exports.getWorkOrderVolume = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      companyYear,
      assignee,
      woTypeNo,
      deptno,
      puno
    } = req.query;

    // Company year is required
    if (!companyYear) {
      return res.status(400).json({
        success: false,
        message: 'Company year is required'
      });
    }

    // Build the SQL query based on the provided query
    const query = `
      DECLARE @CompanyYear int = ${companyYear ? parseInt(companyYear) : 'NULL'};
      DECLARE @Assignee    int = ${assignee ? parseInt(assignee) : 'NULL'};
      DECLARE @WOTypeNo    int = ${woTypeNo ? parseInt(woTypeNo) : 'NULL'};
      DECLARE @DEPTNO      int = ${deptno ? parseInt(deptno) : 'NULL'};
      DECLARE @PUNO        int = ${puno ? parseInt(puno) : 'NULL'};

      WITH F AS (
        SELECT
          f.*,
          -- 'YYYYMMDD' -> date
          LocalDate      = TRY_CONVERT(date, STUFF(STUFF(f.WODATE,        5,0,'-'), 8,0,'-')),
          ActFinishDate  = TRY_CONVERT(date, STUFF(STUFF(f.ACT_FINISH_D,  5,0,'-'), 8,0,'-')),
          TargetDate     = TRY_CONVERT(date, STUFF(STUFF(f.TARGET,        5,0,'-'), 8,0,'-'))
        FROM dbo.WO AS f
        WHERE (@Assignee IS NULL OR f.ASSIGN   = @Assignee)
          AND (@WOTypeNo IS NULL OR f.WOTypeNo = @WOTypeNo)
          AND (@DEPTNO   IS NULL OR f.DEPTNO   = @DEPTNO)
          AND (@PUNO IS NULL OR f.PUNO = @PUNO)
      )
      SELECT
        dd.CompanyYear,
        dd.PeriodNo,
        COUNT(*) AS WO_Count,
        SUM(CASE WHEN F.WRNO <> 0 THEN 1 ELSE 0 END)                          AS Has_WR,
        SUM(CASE WHEN F.WOSTATUSNO = 9 THEN 1 ELSE 0 END)                     AS History,
        SUM(CASE WHEN F.WOSTATUSNO = 8 THEN 1 ELSE 0 END)                     AS Canceled,
        SUM(CASE WHEN F.WOSTATUSNO = 6 THEN 1 ELSE 0 END)                     AS CloseToHistory,
        SUM(CASE WHEN F.WOSTATUSNO = 5 THEN 1 ELSE 0 END)                     AS Finish,
        SUM(CASE WHEN F.WOSTATUSNO = 4 THEN 1 ELSE 0 END)                     AS InProgress,
        SUM(CASE WHEN F.WOSTATUSNO = 3 THEN 1 ELSE 0 END)                     AS Scheduled,
        SUM(CASE WHEN F.WOSTATUSNO = 2 THEN 1 ELSE 0 END)                     AS PlanResource,
        SUM(CASE WHEN F.WOSTATUSNO = 1 THEN 1 ELSE 0 END)                     AS WorkInitiated,
        SUM(CASE
              WHEN F.WOSTATUSNO = 9 AND F.WRNO <> 0
               AND F.ActFinishDate IS NOT NULL AND F.TargetDate IS NOT NULL
               AND F.ActFinishDate <= F.TargetDate THEN 1 ELSE 0
            END)                                                               AS HasWR_OnTime,
        SUM(CASE
              WHEN F.WOSTATUSNO = 9 AND F.WRNO <> 0
               AND F.ActFinishDate IS NOT NULL AND F.TargetDate IS NOT NULL
               AND F.ActFinishDate  > F.TargetDate THEN 1 ELSE 0
            END)                                                               AS HasWR_Late,
        -- New KPI: On-time Rate (%)
        CAST(100.0 * SUM(CASE
              WHEN F.WOSTATUSNO = 9 AND F.WRNO <> 0
               AND F.ActFinishDate IS NOT NULL AND F.TargetDate IS NOT NULL
               AND F.ActFinishDate <= F.TargetDate THEN 1 ELSE 0
            END) / NULLIF(SUM(CASE WHEN F.WRNO <> 0 THEN 1 ELSE 0 END),0) AS DECIMAL(5,2)) AS OnTimeRatePct,
        ROUND(SUM(F.DT_Duration),2) AS Downtime
          
      FROM F
      JOIN dbo.DateDim AS dd
        ON dd.DateKey = F.LocalDate
      WHERE (@CompanyYear IS NULL OR dd.CompanyYear = @CompanyYear)
      GROUP BY dd.CompanyYear, dd.PeriodNo
      ORDER BY dd.CompanyYear, dd.PeriodNo
    `;

   // console.log('Work Order Volume Query:', query);

  const result = await pool.request().query(query);

  // Transform the data for frontend consumption
  let statisticsData = result.recordset.map(row => ({
    companyYear: row.CompanyYear,
    periodNo: row.PeriodNo,
    woCount: row.WO_Count,
    hasWR: row.Has_WR,
    history: row.History,
    canceled: row.Canceled,
    closeToHistory: row.CloseToHistory,
    finish: row.Finish,
    inProgress: row.InProgress,
    scheduled: row.Scheduled,
    planResource: row.PlanResource,
    workInitiated: row.WorkInitiated,
    hasWR_OnTime: row.HasWR_OnTime,
    hasWR_Late: row.HasWR_Late,
    onTimeRatePct: row.OnTimeRatePct,
    downtime: row.Downtime
  }));

  // Ensure periods 1..13 are present per companyYear; fill missing with zero data
  try {
    const yearsSet = new Set(statisticsData.map(item => item.companyYear));
    // If no data returned but a specific companyYear was requested, seed with it
    if (yearsSet.size === 0 && req.query.companyYear) {
      const y = parseInt(req.query.companyYear);
      if (!Number.isNaN(y)) yearsSet.add(y);
    }

    const zeroTemplate = (year, period) => ({
      companyYear: year,
      periodNo: period,
      woCount: 0,
      hasWR: 0,
      history: 0,
      canceled: 0,
      closeToHistory: 0,
      finish: 0,
      inProgress: 0,
      scheduled: 0,
      planResource: 0,
      workInitiated: 0,
      hasWR_OnTime: 0,
      hasWR_Late: 0,
      onTimeRatePct: 0,
      downtime: 0,
    });

    // Build a quick lookup to check presence
    const key = (y, p) => `${y}-${p}`;
    const present = new Set(statisticsData.map(it => key(it.companyYear, it.periodNo)));

    for (const y of yearsSet) {
      for (let p = 1; p <= 13; p++) {
        const k = key(y, p);
        if (!present.has(k)) {
          statisticsData.push(zeroTemplate(y, p));
        }
      }
    }

    // Sort by year then period
    statisticsData.sort((a, b) => a.companyYear - b.companyYear || a.periodNo - b.periodNo);
  } catch (fillErr) {
    console.warn('Failed to fill missing periods, proceeding with raw data:', fillErr);
  }

    res.json({
      success: true,
      data: {
        statistics: statisticsData,
        summary: {
          totalRecords: statisticsData.length,
          totalWorkOrders: statisticsData.reduce((sum, item) => sum + item.woCount, 0) - statisticsData.reduce((sum, item) => sum + item.canceled, 0),
          totalWithWR: statisticsData.reduce((sum, item) => sum + item.hasWR, 0),
          totalOnTime: statisticsData.reduce((sum, item) => sum + item.hasWR_OnTime, 0),
          totalLate: statisticsData.reduce((sum, item) => sum + item.hasWR_Late, 0),
          totalDowntime: statisticsData.reduce((sum, item) => sum + (item.downtime || 0), 0),
          completionRate: statisticsData.reduce((sum, item) => sum + item.history, 0) / Math.max(statisticsData.reduce((sum, item) => sum + item.woCount, 0) - statisticsData.reduce((sum, item) => sum + item.canceled, 0), 1) * 100,
          onTimeRate: statisticsData.reduce((sum, item) => sum + item.hasWR_OnTime, 0) / Math.max(statisticsData.reduce((sum, item) => sum + item.woCount, 0) - statisticsData.reduce((sum, item) => sum + item.canceled, 0), 1) * 100,
          appliedFilters: {
            companyYear,
            assignee,
            woTypeNo,
            deptno,
            puno
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getWorkOrderVolume:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Personal Work Order Statistics by Assignee
 * Returns work order statistics grouped by assignee within selected department
 */
exports.getPersonalWorkOrderVolume = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      companyYear,
      assignee,
      woTypeNo,
      deptno,
      puno
    } = req.query;

    // Company year and department are required for personal statistics
    if (!companyYear) {
      return res.status(400).json({
        success: false,
        message: 'Company year is required'
      });
    }

    if (!deptno) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for personal statistics'
      });
    }

    // Build the SQL query for personal statistics grouped by assignee
    const query = `
      DECLARE @CompanyYear int = ${companyYear ? parseInt(companyYear) : 'NULL'};
      DECLARE @Assignee    int = ${assignee ? parseInt(assignee) : 'NULL'};
      DECLARE @WOTypeNo    int = ${woTypeNo ? parseInt(woTypeNo) : 'NULL'};
      DECLARE @DEPTNO      int = ${deptno ? parseInt(deptno) : 'NULL'};
      DECLARE @PUNO        int = ${puno ? parseInt(puno) : 'NULL'};

      WITH F AS (
        SELECT
          f.*,
          LocalDate      = TRY_CONVERT(date, STUFF(STUFF(f.WODATE,        5,0,'-'), 8,0,'-')),
          ActFinishDate  = TRY_CONVERT(date, STUFF(STUFF(f.ACT_FINISH_D,  5,0,'-'), 8,0,'-')),
          TargetDate     = TRY_CONVERT(date, STUFF(STUFF(f.TARGET,        5,0,'-'), 8,0,'-'))
        FROM dbo.WO AS f
        WHERE (@Assignee IS NULL OR f.ASSIGN   = @Assignee)
          AND (@WOTypeNo IS NULL OR f.WOTypeNo = @WOTypeNo)
          AND (@DEPTNO   IS NULL OR f.DEPTNO   = @DEPTNO)
          AND (@PUNO IS NULL OR f.PUNO = @PUNO)
      )
      SELECT
        f.ASSIGN as assigneeId,
        CASE
          WHEN p.PERSON_NAME IS NOT NULL THEN p.PERSON_NAME
          ELSE 'User ' + CAST(f.ASSIGN AS VARCHAR(10))
        END as assignee,
        COUNT(*) AS WO_Count,
        SUM(CASE WHEN f.WRNO <> 0 THEN 1 ELSE 0 END) AS hasWR,
        SUM(CASE WHEN f.WOSTATUSNO = 9 THEN 1 ELSE 0 END) AS history,
        SUM(CASE WHEN f.WOSTATUSNO = 8 THEN 1 ELSE 0 END) AS closeToHistory,
        SUM(CASE WHEN f.WOSTATUSNO = 7 THEN 1 ELSE 0 END) AS finish,
        SUM(CASE WHEN f.WOSTATUSNO = 6 THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN f.WOSTATUSNO = 5 THEN 1 ELSE 0 END) AS scheduled,
        SUM(CASE WHEN f.WOSTATUSNO = 4 THEN 1 ELSE 0 END) AS planResource,
        SUM(CASE WHEN f.WOSTATUSNO = 3 THEN 1 ELSE 0 END) AS workInitiated,
        SUM(CASE WHEN f.WOSTATUSNO = 2 THEN 1 ELSE 0 END) AS canceled,
        SUM(CASE WHEN f.WOSTATUSNO = 1 THEN 1 ELSE 0 END) AS created,
        SUM(CASE WHEN f.WRNO <> 0 AND f.ActFinishDate IS NOT NULL AND f.TargetDate IS NOT NULL AND f.ActFinishDate <= f.TargetDate THEN 1 ELSE 0 END) AS hasWR_OnTime,
        SUM(CASE WHEN f.WRNO <> 0 AND f.ActFinishDate IS NOT NULL AND f.TargetDate IS NOT NULL AND f.ActFinishDate > f.TargetDate THEN 1 ELSE 0 END) AS hasWR_Late,
        CAST(100.0 * SUM(CASE WHEN f.WOSTATUSNO = 9 AND f.WRNO <> 0 AND f.ActFinishDate IS NOT NULL AND f.TargetDate IS NOT NULL AND f.ActFinishDate <= f.TargetDate THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN f.WRNO <> 0 THEN 1 ELSE 0 END),0) AS DECIMAL(5,2)) AS onTimeRatePct,
        ROUND(SUM(f.DT_Duration),2) AS downtime
      FROM F
      JOIN dbo.DateDim AS dd
        ON dd.DateKey = F.LocalDate
      LEFT JOIN Person p ON f.ASSIGN = p.PERSONNO
      WHERE (@CompanyYear IS NULL OR dd.CompanyYear = @CompanyYear)
        AND f.ASSIGN IS NOT NULL 
        AND f.ASSIGN <> 0
      GROUP BY f.ASSIGN, p.PERSON_NAME
      ORDER BY COUNT(*) DESC
    `;

    const result = await pool.request().query(query);
    const statisticsData = result.recordset;

    res.json({
      success: true,
      data: {
        statistics: statisticsData,
        summary: {
          totalRecords: statisticsData.length,
          totalWorkOrders: statisticsData.reduce((sum, item) => sum + item.woCount, 0),
          totalWithWR: statisticsData.reduce((sum, item) => sum + item.hasWR, 0),
          totalOnTime: statisticsData.reduce((sum, item) => sum + item.hasWR_OnTime, 0),
          totalLate: statisticsData.reduce((sum, item) => sum + item.hasWR_Late, 0),
          totalDowntime: statisticsData.reduce((sum, item) => sum + (item.downtime || 0), 0),
          appliedFilters: {
            companyYear,
            assignee,
            woTypeNo,
            deptno,
            puno
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getPersonalWorkOrderVolume:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Personal Work Order Statistics by Period
 * Returns work order statistics grouped by assignee and period within selected department
 */
exports.getPersonalWorkOrderVolumeByPeriod = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      companyYear,
      assignee,
      woTypeNo,
      deptno,
      puno
    } = req.query;

    // Company year and department are required for personal statistics
    if (!companyYear) {
      return res.status(400).json({
        success: false,
        message: 'Company year is required'
      });
    }

    if (!deptno) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for personal statistics'
      });
    }

    // Build the SQL query for personal statistics grouped by assignee and period
    const query = `
      DECLARE @CompanyYear int = ${companyYear ? parseInt(companyYear) : 'NULL'};
      DECLARE @Assignee    int = ${assignee ? parseInt(assignee) : 'NULL'};
      DECLARE @WOTypeNo    int = ${woTypeNo ? parseInt(woTypeNo) : 'NULL'};
      DECLARE @DEPTNO      int = ${deptno ? parseInt(deptno) : 'NULL'};
      DECLARE @PUNO        int = ${puno ? parseInt(puno) : 'NULL'};

      WITH F AS (
        SELECT
          f.*,
          LocalDate      = TRY_CONVERT(date, STUFF(STUFF(f.WODATE,        5,0,'-'), 8,0,'-')),
          ActFinishDate  = TRY_CONVERT(date, STUFF(STUFF(f.ACT_FINISH_D,  5,0,'-'), 8,0,'-')),
          TargetDate     = TRY_CONVERT(date, STUFF(STUFF(f.TARGET,        5,0,'-'), 8,0,'-'))
        FROM dbo.WO AS f
        WHERE (@Assignee IS NULL OR f.ASSIGN   = @Assignee)
          AND (@WOTypeNo IS NULL OR f.WOTypeNo = @WOTypeNo)
          AND (@DEPTNO   IS NULL OR f.DEPTNO   = @DEPTNO)
          AND (@PUNO IS NULL OR f.PUNO = @PUNO)
      )
      SELECT
        f.ASSIGN as assigneeId,
        CASE
          WHEN p.PERSON_NAME IS NOT NULL THEN p.PERSON_NAME
          ELSE 'User ' + CAST(f.ASSIGN AS VARCHAR(10))
        END as assignee,
        dd.CompanyYear as companyYear,
        dd.PeriodNo as periodNo,
        COUNT(*) AS woCount,
        SUM(CASE WHEN f.WRNO <> 0 THEN 1 ELSE 0 END) AS hasWR,
        SUM(CASE WHEN f.WOSTATUSNO = 9 THEN 1 ELSE 0 END) AS history,
        SUM(CASE WHEN f.WOSTATUSNO = 8 THEN 1 ELSE 0 END) AS closeToHistory,
        SUM(CASE WHEN f.WOSTATUSNO = 7 THEN 1 ELSE 0 END) AS finish,
        SUM(CASE WHEN f.WOSTATUSNO = 6 THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN f.WOSTATUSNO = 5 THEN 1 ELSE 0 END) AS scheduled,
        SUM(CASE WHEN f.WOSTATUSNO = 4 THEN 1 ELSE 0 END) AS planResource,
        SUM(CASE WHEN f.WOSTATUSNO = 3 THEN 1 ELSE 0 END) AS workInitiated,
        SUM(CASE WHEN f.WOSTATUSNO = 2 THEN 1 ELSE 0 END) AS canceled,
        SUM(CASE WHEN f.WOSTATUSNO = 1 THEN 1 ELSE 0 END) AS created,
        SUM(CASE WHEN f.WRNO <> 0 AND f.ActFinishDate IS NOT NULL AND f.TargetDate IS NOT NULL AND f.ActFinishDate <= f.TargetDate THEN 1 ELSE 0 END) AS hasWR_OnTime,
        SUM(CASE WHEN f.WRNO <> 0 AND f.ActFinishDate IS NOT NULL AND f.TargetDate IS NOT NULL AND f.ActFinishDate > f.TargetDate THEN 1 ELSE 0 END) AS hasWR_Late,
        CAST(100.0 * SUM(CASE WHEN f.WOSTATUSNO = 9 AND f.WRNO <> 0 AND f.ActFinishDate IS NOT NULL AND f.TargetDate IS NOT NULL AND f.ActFinishDate <= f.TargetDate THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN f.WRNO <> 0 THEN 1 ELSE 0 END),0) AS DECIMAL(5,2)) AS onTimeRatePct,
        ROUND(SUM(f.DT_Duration),2) AS downtime
      FROM F
      JOIN dbo.DateDim AS dd
        ON dd.DateKey = F.LocalDate
      LEFT JOIN Person p ON f.ASSIGN = p.PERSONNO
      WHERE (@CompanyYear IS NULL OR dd.CompanyYear = @CompanyYear)
        AND f.ASSIGN IS NOT NULL 
        AND f.ASSIGN <> 0
      GROUP BY f.ASSIGN, p.PERSON_NAME, dd.CompanyYear, dd.PeriodNo
      ORDER BY f.ASSIGN, dd.CompanyYear, dd.PeriodNo
    `;

    const result = await pool.request().query(query);
    const statisticsData = result.recordset;

    res.json({
      success: true,
      data: {
        statistics: statisticsData,
        summary: {
          totalRecords: statisticsData.length,
          totalWorkOrders: statisticsData.reduce((sum, item) => sum + item.woCount, 0),
          totalWithWR: statisticsData.reduce((sum, item) => sum + item.hasWR, 0),
          totalOnTime: statisticsData.reduce((sum, item) => sum + item.hasWR_OnTime, 0),
          totalLate: statisticsData.reduce((sum, item) => sum + item.hasWR_Late, 0),
          totalDowntime: statisticsData.reduce((sum, item) => sum + (item.downtime || 0), 0),
          appliedFilters: {
            companyYear,
            assignee,
            woTypeNo,
            deptno,
            puno
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getPersonalWorkOrderVolumeByPeriod:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get filter options for work order volume statistics with cascading filters
 */
async function getWorkOrderVolumeFilterOptions(pool, appliedFilters = {}) {
  try {
    const { companyYear, assignee, woTypeNo, deptno, puno } = appliedFilters;
    
    // Build WHERE clause for cascading filters
    let whereClause = "WHERE wo.FLAGDEL = 'F'";
    
    if (companyYear) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM DateDim dd 
        WHERE dd.DateKey = TRY_CONVERT(date, STUFF(STUFF(wo.WODATE, 5,0,'-'), 8,0,'-'))
        AND dd.CompanyYear = ${parseInt(companyYear)}
      )`;
    }
    
    if (assignee) {
      whereClause += ` AND wo.ASSIGN = ${parseInt(assignee)}`;
    }
    
    if (woTypeNo) {
      whereClause += ` AND wo.WOTypeNo = ${parseInt(woTypeNo)}`;
    }
    
    if (deptno) {
      whereClause += ` AND wo.DEPTNO = ${parseInt(deptno)}`;
    }
    
    if (puno) {
      whereClause += ` AND wo.PUNO = ${parseInt(puno)}`;
    }

    // Get company years - only show years that have actual work orders
    const yearsResult = await pool.request().query(`
      SELECT DISTINCT dd.CompanyYear
      FROM WO wo
      JOIN DateDim dd ON dd.DateKey = TRY_CONVERT(date, STUFF(STUFF(wo.WODATE, 5,0,'-'), 8,0,'-'))
      WHERE wo.FLAGDEL = 'F'
      ORDER BY dd.CompanyYear DESC
    `);

    // Get assignees - only those who have work orders matching current filters
    const assignees = await pool.request().query(`
      SELECT DISTINCT wo.ASSIGN as id, 
             CASE 
               WHEN p.PERSON_NAME IS NOT NULL THEN p.PERSON_NAME
               ELSE 'User ' + CAST(wo.ASSIGN AS VARCHAR(10))
             END as name
      FROM WO wo
      LEFT JOIN Person p ON wo.ASSIGN = p.PERSONNO
      ${whereClause}
      AND wo.ASSIGN IS NOT NULL AND wo.ASSIGN <> 0
      ORDER BY name
    `);

    // Get WO types - only those that have work orders matching current filters
    const woTypes = await pool.request().query(`
      SELECT DISTINCT wo.WOTypeNo as id, wt.WOTYPECODE as code, wt.WOTYPENAME as name
      FROM WO wo
      JOIN WOType wt ON wo.WOTypeNo = wt.WOTYPENO
      ${whereClause}
      AND wt.FLAGDEL = 'F'
      ORDER BY wt.WOTYPENAME
    `);

    // Get departments - only those that have work orders matching current filters
    const departments = await pool.request().query(`
      SELECT DISTINCT wo.DEPTNO as id, d.DEPTCODE as code, d.DEPTNAME as name
      FROM WO wo
      JOIN Dept d ON wo.DEPTNO = d.DEPTNO
      ${whereClause}
      AND d.FLAGDEL = 'F'
      ORDER BY d.DEPTNAME
    `);

    // Get production units - only those that have work orders matching current filters
    const productionUnits = await pool.request().query(`
      SELECT DISTINCT wo.PUNO as id, 
             CASE 
               WHEN pu.PUNAME IS NOT NULL THEN pu.PUNAME
               ELSE 'Unit ' + CAST(wo.PUNO AS VARCHAR(10))
             END as name
      FROM WO wo
      LEFT JOIN PU pu ON wo.PUNO = pu.PUNO
      ${whereClause}
      AND wo.PUNO IS NOT NULL AND wo.PUNO <> 0
      ORDER BY name
    `);

    return {
      assignees: assignees.recordset,
      woTypes: woTypes.recordset,
      departments: departments.recordset,
      productionUnits: productionUnits.recordset,
      companyYears: yearsResult.recordset.map(row => row.CompanyYear)
    };
  } catch (error) {
    console.error('Error getting work order volume filter options:', error);
    return {
      assignees: [],
      woTypes: [],
      departments: [],
      productionUnits: [],
      companyYears: []
    };
  }
}

/**
 * Get period information for range selection
 */
async function getPeriodInfo(pool) {
  try {
    // Get available years from work orders
    const yearsResult = await pool.request().query(`
      SELECT DISTINCT DATEPART(YEAR, WODATE) as year
      FROM WO 
      WHERE FLAGDEL = 'F'
      ORDER BY year DESC
    `);

    const years = yearsResult.recordset.map(row => row.year);
    
    // Calculate periods for each year
    const periodInfo = {};
    
    for (const year of years) {
      const firstDayOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
      const firstSunday = new Date(firstDayOfYear);
      
      // Adjust to first Sunday
      const dayOfWeek = firstDayOfYear.getDay();
      const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      firstSunday.setDate(firstDayOfYear.getDate() + daysToAdd);
      
      // Calculate total periods in the year (approximately 13 periods)
      const totalPeriods = Math.ceil(365 / 28);
      
      const periods = [];
      for (let p = 1; p <= totalPeriods; p++) {
        const periodStart = new Date(firstSunday);
        periodStart.setDate(firstSunday.getDate() + (p - 1) * 28);
        
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 27); // 28 days - 1 (ends on Saturday)
        
        periods.push({
          period: p,
          startDate: periodStart.toISOString().split('T')[0],
          endDate: periodEnd.toISOString().split('T')[0],
          label: `P${p}`,
          startDay: periodStart.toDateString().split(' ')[0], // Day name
          endDay: periodEnd.toDateString().split(' ')[0]      // Day name
        });
      }
      
      periodInfo[year] = {
        firstSunday: firstSunday.toISOString().split('T')[0],
        periods: periods
      };
      
      //console.log(`Year ${year} periods:`, periods.map(p => `${p.label} (${p.startDate} ${p.startDay} to ${p.endDate} ${p.endDay})`));
    }
    
    return periodInfo;
  } catch (error) {
    console.error('Error getting period info:', error);
    return {};
  }
}

/**
 * Get Tickets Count Per Period
 * Returns ticket counts grouped by period with target data for participation charts
 */
exports.getTicketsCountPerPeriod = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      plant,
      area
    } = req.query;

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let ticketsWhereClause = `WHERE YEAR(t.created_at) = ${parseInt(year)}`;
    
    if (plant && plant !== 'all') {
      ticketsWhereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      ticketsWhereClause += ` AND pe.area = '${area}'`;
    }

    // Get tickets count per period with plant/area filtering
    const ticketsQuery = `
      SELECT 
        CASE 
          WHEN MONTH(t.created_at) = 1 THEN 'P1'
          WHEN MONTH(t.created_at) = 2 THEN 'P2'
          WHEN MONTH(t.created_at) = 3 THEN 'P3'
          WHEN MONTH(t.created_at) = 4 THEN 'P4'
          WHEN MONTH(t.created_at) = 5 THEN 'P5'
          WHEN MONTH(t.created_at) = 6 THEN 'P6'
          WHEN MONTH(t.created_at) = 7 THEN 'P7'
          WHEN MONTH(t.created_at) = 8 THEN 'P8'
          WHEN MONTH(t.created_at) = 9 THEN 'P9'
          WHEN MONTH(t.created_at) = 10 THEN 'P10'
          WHEN MONTH(t.created_at) = 11 THEN 'P11'
          WHEN MONTH(t.created_at) = 12 THEN 'P12'
          ELSE 'P13'
        END as period,
        COUNT(*) as tickets,
        COUNT(DISTINCT t.reported_by) as uniqueReporters
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      ${ticketsWhereClause}
      GROUP BY 
        CASE 
          WHEN MONTH(t.created_at) = 1 THEN 'P1'
          WHEN MONTH(t.created_at) = 2 THEN 'P2'
          WHEN MONTH(t.created_at) = 3 THEN 'P3'
          WHEN MONTH(t.created_at) = 4 THEN 'P4'
          WHEN MONTH(t.created_at) = 5 THEN 'P5'
          WHEN MONTH(t.created_at) = 6 THEN 'P6'
          WHEN MONTH(t.created_at) = 7 THEN 'P7'
          WHEN MONTH(t.created_at) = 8 THEN 'P8'
          WHEN MONTH(t.created_at) = 9 THEN 'P9'
          WHEN MONTH(t.created_at) = 10 THEN 'P10'
          WHEN MONTH(t.created_at) = 11 THEN 'P11'
          WHEN MONTH(t.created_at) = 12 THEN 'P12'
          ELSE 'P13'
        END
      ORDER BY period
    `;

    // Get targets for the same year, plant, and area
    let targetsWhereClause = `WHERE t.year = ${parseInt(year)} AND t.type = 'open case'`;

    if (plant) {
      targetsWhereClause += ` AND t.plant = '${plant}'`;
    } else  {
      // When plant = 'all', look for targets with plant = 'all' or NULL
      targetsWhereClause += ` AND (t.plant = 'all' OR t.plant IS NULL)`;
    }
    
    if (area) {
      targetsWhereClause += ` AND t.area = '${area}'`;
    } else {
      // When area = 'all', look for targets with area = 'all' or NULL
      targetsWhereClause += ` AND (t.area = 'all' OR t.area IS NULL)`;
    }

    const targetsQuery = `
      SELECT 
        t.period,
        t.target_value,
        t.unit
      FROM dbo.Target t
      ${targetsWhereClause}
      ORDER BY t.period
    `;
   
    // Execute queries
    const [ticketsResult, targetsResult] = await Promise.all([
      pool.request().query(ticketsQuery),
      pool.request().query(targetsQuery)
    ]);
   
    // Create a map of all periods (P1-P13)
    const allPeriods = Array.from({ length: 13 }, (_, i) => `P${i + 1}`);
    
    // Create maps for easy lookup
    const ticketsMap = {};
    ticketsResult.recordset.forEach(row => {
      ticketsMap[row.period] = {
        tickets: row.tickets,
        uniqueReporters: row.uniqueReporters
      };
    });

    const targetsMap = {};
    targetsResult.recordset.forEach(row => {
      targetsMap[row.period] = row.target_value;
    });

    // Build the response data
    const participationData = allPeriods.map(period => {
      const ticketsData = ticketsMap[period] || { tickets: 0, uniqueReporters: 0 };
      const targetValue = targetsMap[period] || 30; // Default fallback target
      
      // Calculate coverage rate (unique reporters / target * 100, capped at 100%)
      const coverageRate = targetValue > 0 ? Math.min(100, Math.round((ticketsData.uniqueReporters / targetValue) * 100)) : 0;

      return {
        period,
        tickets: ticketsData.tickets,
        target: Math.round(targetValue),
        uniqueReporters: ticketsData.uniqueReporters,
        coverageRate
      };
    });

    res.json({
      success: true,
      data: {
        participationData,
        summary: {
          totalTickets: participationData.reduce((sum, item) => sum + item.tickets, 0),
          totalUniqueReporters: Math.max(...participationData.map(item => item.uniqueReporters)),
          averageTarget: Math.round(participationData.reduce((sum, item) => sum + item.target, 0) / participationData.length),
          appliedFilters: {
            year: parseInt(year),
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getTicketsCountPerPeriod:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Total Tickets Closed Per Period Data
 * Returns count of tickets completed (closed/resolved) per period
 * Uses completed_at field to determine completion date
 * Supports plant/area filtering via PUExtension
 */
exports.getTicketsClosedPerPeriod = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      plant,
      area
    } = req.query;

    // Build WHERE clause for completed tickets with plant/area filtering via PUExtension
    let ticketsWhereClause = `WHERE YEAR(t.completed_at) = ${parseInt(year)} AND t.status IN ('closed', 'resolved') AND t.completed_at IS NOT NULL`;
    
    if (plant && plant !== 'all') {
      ticketsWhereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      ticketsWhereClause += ` AND pe.area = '${area}'`;
    }

    // Get tickets closed count per period with plant/area filtering
    const ticketsQuery = `
      SELECT 
        CASE 
          WHEN MONTH(t.completed_at) = 1 THEN 'P1'
          WHEN MONTH(t.completed_at) = 2 THEN 'P2'
          WHEN MONTH(t.completed_at) = 3 THEN 'P3'
          WHEN MONTH(t.completed_at) = 4 THEN 'P4'
          WHEN MONTH(t.completed_at) = 5 THEN 'P5'
          WHEN MONTH(t.completed_at) = 6 THEN 'P6'
          WHEN MONTH(t.completed_at) = 7 THEN 'P7'
          WHEN MONTH(t.completed_at) = 8 THEN 'P8'
          WHEN MONTH(t.completed_at) = 9 THEN 'P9'
          WHEN MONTH(t.completed_at) = 10 THEN 'P10'
          WHEN MONTH(t.completed_at) = 11 THEN 'P11'
          WHEN MONTH(t.completed_at) = 12 THEN 'P12'
          ELSE 'P13'
        END as period,
        COUNT(*) as ticketsClosed
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      ${ticketsWhereClause}
      GROUP BY 
        CASE 
          WHEN MONTH(t.completed_at) = 1 THEN 'P1'
          WHEN MONTH(t.completed_at) = 2 THEN 'P2'
          WHEN MONTH(t.completed_at) = 3 THEN 'P3'
          WHEN MONTH(t.completed_at) = 4 THEN 'P4'
          WHEN MONTH(t.completed_at) = 5 THEN 'P5'
          WHEN MONTH(t.completed_at) = 6 THEN 'P6'
          WHEN MONTH(t.completed_at) = 7 THEN 'P7'
          WHEN MONTH(t.completed_at) = 8 THEN 'P8'
          WHEN MONTH(t.completed_at) = 9 THEN 'P9'
          WHEN MONTH(t.completed_at) = 10 THEN 'P10'
          WHEN MONTH(t.completed_at) = 11 THEN 'P11'
          WHEN MONTH(t.completed_at) = 12 THEN 'P12'
          ELSE 'P13'
        END
      ORDER BY period
    `;

    // Get targets for the same year, plant, and area (type = 'close case')
    let targetsWhereClause = `WHERE t.year = ${parseInt(year)} AND t.type = 'close case'`;
    
    if (plant && plant !== 'all') {
      targetsWhereClause += ` AND t.plant = '${plant}'`;
    } else{
      // When plant = 'all', look for targets with plant = 'all' or NULL
      targetsWhereClause += ` AND (t.plant = 'all' OR t.plant IS NULL)`;
    }
    
    if (area && area !== 'all') {
      targetsWhereClause += ` AND t.area = '${area}'`;
    } else{
      // When area = 'all', look for targets with area = 'all' or NULL
      targetsWhereClause += ` AND (t.area = 'all' OR t.area IS NULL)`;
    }

    const targetsQuery = `
      SELECT 
        t.period,
        t.target_value,
        t.unit
      FROM dbo.Target t
      ${targetsWhereClause}
      ORDER BY t.period
    `;

    // Execute queries
    const [ticketsResult, targetsResult] = await Promise.all([
      pool.request().query(ticketsQuery),
      pool.request().query(targetsQuery)
    ]);
    
    // Create a map of all periods (P1-P13)
    const allPeriods = Array.from({ length: 13 }, (_, i) => `P${i + 1}`);
    
    // Create maps for easy lookup
    const ticketsClosedMap = {};
    ticketsResult.recordset.forEach(row => {
      ticketsClosedMap[row.period] = row.ticketsClosed;
    });

    const targetsMap = {};
    targetsResult.recordset.forEach(row => {
      targetsMap[row.period] = row.target_value;
    });

    // Build the response data with all periods, filling missing ones with 0
    const ticketsClosedData = allPeriods.map(period => {
      const ticketsClosed = ticketsClosedMap[period] || 0;
      const targetValue = targetsMap[period] || 0; // Default to 0 if no target
      
      return {
        period: period,
        ticketsClosed: ticketsClosed,
        target: Math.round(targetValue)
      };
    });

    res.json({
      success: true,
      data: {
        ticketsClosedData,
        summary: {
          totalPeriods: ticketsClosedData.length,
          totalTicketsClosed: ticketsClosedData.reduce((sum, item) => sum + item.ticketsClosed, 0),
          totalTarget: ticketsClosedData.reduce((sum, item) => sum + item.target, 0),
          averageTicketsClosedPerPeriod: Math.round(ticketsClosedData.reduce((sum, item) => sum + item.ticketsClosed, 0) / ticketsClosedData.length),
          averageTargetPerPeriod: Math.round(ticketsClosedData.reduce((sum, item) => sum + item.target, 0) / ticketsClosedData.length),
          appliedFilters: {
            year: parseInt(year),
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getTicketsClosedPerPeriod:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Area Activity Data
 * Returns ticket counts grouped by plant/area/machine based on filter conditions:
 * 1. Group by plant if all plant filter is selected
 * 2. Group by area if any plant selected but no area selected  
 * 3. Group by machine if any area filter is selected
 */
exports.getAreaActivityData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      plant,
      area
    } = req.query;

    let areaActivityQuery;
    let groupByField;
    let displayNameField;
    let summaryLabel;

    // Determine grouping based on filter conditions
    if (!plant || plant === 'all') {
      // Condition 1: Show group by plant if all plant filter is selected
      groupByField = 'pe.plant';
      displayNameField = 'pe.plant as display_name';
      summaryLabel = 'Plants';
      
      areaActivityQuery = `
        SELECT TOP 10
          pe.plant as display_name,
          pe.plant,
          COUNT(t.id) as ticket_count
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE YEAR(t.created_at) = ${parseInt(year)}
          AND pe.plant IS NOT NULL
        GROUP BY pe.plant
        HAVING COUNT(t.id) > 0
        ORDER BY ticket_count DESC, pe.plant ASC
      `;
    } else if (!area || area === 'all') {
      // Condition 2: Show group by area if any plant selected but no area selected
      groupByField = 'pe.area';
      displayNameField = 'pe.area as display_name';
      summaryLabel = 'Areas';
      
      areaActivityQuery = `
        SELECT TOP 10
          pe.area as display_name,
          pe.plant,
          pe.area,
          COUNT(t.id) as ticket_count
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE YEAR(t.created_at) = ${parseInt(year)}
          AND pe.plant = '${plant}'
          AND pe.area IS NOT NULL
        GROUP BY pe.plant, pe.area
        HAVING COUNT(t.id) > 0
        ORDER BY ticket_count DESC, pe.area ASC
      `;
    } else {
      // Condition 3: Show group by equipment (machine/line) if any area filter is selected
      groupByField = 'pe.machine';
      displayNameField = 'pe.machine as display_name';
      summaryLabel = 'Equipment';
      
      areaActivityQuery = `
        SELECT TOP 10
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END as display_name,
          pe.plant,
          pe.area,
          pe.machine,
          pe.line,
          COUNT(t.id) as ticket_count
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE YEAR(t.created_at) = ${parseInt(year)}
          AND pe.plant = '${plant}'
          AND pe.area = '${area}'
        GROUP BY pe.plant, pe.area, pe.machine, pe.line
        HAVING COUNT(t.id) > 0
        ORDER BY ticket_count DESC, 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END ASC
      `;
    }

    const result = await pool.request().query(areaActivityQuery);
    
    // Transform the data for frontend consumption
    const areaActivityData = result.recordset.map(row => ({
      display_name: row.display_name,
      plant: row.plant,
      area: row.area,
      machine: row.machine,
      tickets: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        areaActivityData,
        summary: {
          totalItems: areaActivityData.length,
          totalTickets: areaActivityData.reduce((sum, item) => sum + item.tickets, 0),
          averageTicketsPerItem: areaActivityData.length > 0 
            ? Math.round(areaActivityData.reduce((sum, item) => sum + item.tickets, 0) / areaActivityData.length)
            : 0,
          groupBy: summaryLabel,
          appliedFilters: {
            year: parseInt(year),
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getAreaActivityData:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get User Activity Data
 * Returns ticket counts grouped by user for the "Who Active (User)" chart
 * This chart is affected by time range and plant/area filters
 */
exports.getUserActivityData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Convert dates to proper format for SQL queries
    const formatDateForSQL = (dateStr) => {
      return dateStr.replace(/-/g, '');
    };

    const startDateFormatted = formatDateForSQL(startDate);
    const endDateFormatted = formatDateForSQL(endDate);

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let whereClause = `WHERE CAST(t.created_at AS DATE) >= '${startDate}' AND CAST(t.created_at AS DATE) <= '${endDate}'`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get ticket counts by user for the specified time range and plant/area
    const userActivityQuery = `
      SELECT TOP 10
        t.reported_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      INNER JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${whereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      HAVING COUNT(t.id) > 0
      ORDER BY ticket_count DESC, p.PERSON_NAME ASC
    `;

    const result = await pool.request().query(userActivityQuery);
    
    // Transform the data for frontend consumption
    const userActivityData = result.recordset.map((row, index) => {
      // Generate initials from user name
      const initials = row.user_name 
        ? row.user_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U' + row.user_id;
      
      // Generate background color based on index for consistency
      const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f97316',
        '#14b8a6', '#6366f1', '#ef4444', '#eab308', '#06b6d4'
      ];
      const bgColor = colors[index % colors.length];

      return {
        id: row.user_id.toString(),
        user: row.user_name || `User ${row.user_id}`,
        tickets: row.ticket_count,
        initials: initials,
        bgColor: bgColor,
        avatar: row.avatar_url
      };
    });

    res.json({
      success: true,
      data: {
        userActivityData,
        summary: {
          totalUsers: userActivityData.length,
          totalTickets: userActivityData.reduce((sum, item) => sum + item.tickets, 0),
          averageTicketsPerUser: userActivityData.length > 0 
            ? Math.round(userActivityData.reduce((sum, item) => sum + item.tickets, 0) / userActivityData.length)
            : 0,
          appliedFilters: {
            startDate,
            endDate,
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getUserActivityData:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Downtime Avoidance Trend Data
 * Returns downtime avoidance data by period and plant/area/machine based on filter conditions:
 * 1. Group by plant if all plant filter is selected
 * 2. Group by area if any plant selected but no area selected  
 * 3. Group by machine if any area filter is selected
 */
exports.getDowntimeAvoidanceTrend = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      plant,
      area
    } = req.query;

    let downtimeQuery;
    let groupByField;
    let displayNameField;
    let summaryLabel;

    // Determine grouping based on filter conditions
    if (!plant || plant === 'all') {
      // Condition 1: Show group by plant if all plant filter is selected
      groupByField = 'pe.plant';
      displayNameField = 'pe.plant as display_name';
      summaryLabel = 'Plants';
      
      downtimeQuery = `
        SELECT 
          CASE 
            WHEN MONTH(t.created_at) = 1 THEN 'P1'
            WHEN MONTH(t.created_at) = 2 THEN 'P2'
            WHEN MONTH(t.created_at) = 3 THEN 'P3'
            WHEN MONTH(t.created_at) = 4 THEN 'P4'
            WHEN MONTH(t.created_at) = 5 THEN 'P5'
            WHEN MONTH(t.created_at) = 6 THEN 'P6'
            WHEN MONTH(t.created_at) = 7 THEN 'P7'
            WHEN MONTH(t.created_at) = 8 THEN 'P8'
            WHEN MONTH(t.created_at) = 9 THEN 'P9'
            WHEN MONTH(t.created_at) = 10 THEN 'P10'
            WHEN MONTH(t.created_at) = 11 THEN 'P11'
            WHEN MONTH(t.created_at) = 12 THEN 'P12'
            ELSE 'P13'
          END as period,
          pe.plant as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE YEAR(t.created_at) = ${parseInt(year)}
          AND t.status IN ('closed', 'resolved')
          AND pe.plant IS NOT NULL
        GROUP BY 
          CASE 
            WHEN MONTH(t.created_at) = 1 THEN 'P1'
            WHEN MONTH(t.created_at) = 2 THEN 'P2'
            WHEN MONTH(t.created_at) = 3 THEN 'P3'
            WHEN MONTH(t.created_at) = 4 THEN 'P4'
            WHEN MONTH(t.created_at) = 5 THEN 'P5'
            WHEN MONTH(t.created_at) = 6 THEN 'P6'
            WHEN MONTH(t.created_at) = 7 THEN 'P7'
            WHEN MONTH(t.created_at) = 8 THEN 'P8'
            WHEN MONTH(t.created_at) = 9 THEN 'P9'
            WHEN MONTH(t.created_at) = 10 THEN 'P10'
            WHEN MONTH(t.created_at) = 11 THEN 'P11'
            WHEN MONTH(t.created_at) = 12 THEN 'P12'
            ELSE 'P13'
          END,
          pe.plant
        ORDER BY period, pe.plant
      `;
    } else if (!area || area === 'all') {
      // Condition 2: Show group by area if any plant selected but no area selected
      groupByField = 'pe.area';
      displayNameField = 'pe.area as display_name';
      summaryLabel = 'Areas';
      
      downtimeQuery = `
        SELECT 
          CASE 
            WHEN MONTH(t.created_at) = 1 THEN 'P1'
            WHEN MONTH(t.created_at) = 2 THEN 'P2'
            WHEN MONTH(t.created_at) = 3 THEN 'P3'
            WHEN MONTH(t.created_at) = 4 THEN 'P4'
            WHEN MONTH(t.created_at) = 5 THEN 'P5'
            WHEN MONTH(t.created_at) = 6 THEN 'P6'
            WHEN MONTH(t.created_at) = 7 THEN 'P7'
            WHEN MONTH(t.created_at) = 8 THEN 'P8'
            WHEN MONTH(t.created_at) = 9 THEN 'P9'
            WHEN MONTH(t.created_at) = 10 THEN 'P10'
            WHEN MONTH(t.created_at) = 11 THEN 'P11'
            WHEN MONTH(t.created_at) = 12 THEN 'P12'
            ELSE 'P13'
          END as period,
          pe.area as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE YEAR(t.created_at) = ${parseInt(year)}
          AND t.status IN ('closed', 'resolved')
          AND pe.plant = '${plant}'
          AND pe.area IS NOT NULL
        GROUP BY 
          CASE 
            WHEN MONTH(t.created_at) = 1 THEN 'P1'
            WHEN MONTH(t.created_at) = 2 THEN 'P2'
            WHEN MONTH(t.created_at) = 3 THEN 'P3'
            WHEN MONTH(t.created_at) = 4 THEN 'P4'
            WHEN MONTH(t.created_at) = 5 THEN 'P5'
            WHEN MONTH(t.created_at) = 6 THEN 'P6'
            WHEN MONTH(t.created_at) = 7 THEN 'P7'
            WHEN MONTH(t.created_at) = 8 THEN 'P8'
            WHEN MONTH(t.created_at) = 9 THEN 'P9'
            WHEN MONTH(t.created_at) = 10 THEN 'P10'
            WHEN MONTH(t.created_at) = 11 THEN 'P11'
            WHEN MONTH(t.created_at) = 12 THEN 'P12'
            ELSE 'P13'
          END,
          pe.area
        ORDER BY period, pe.area
      `;
    } else {
      // Condition 3: Show group by equipment (machine/line) if any area filter is selected
      groupByField = 'pe.machine';
      displayNameField = 'pe.machine as display_name';
      summaryLabel = 'Equipment';
      
      downtimeQuery = `
        SELECT 
          CASE 
            WHEN MONTH(t.created_at) = 1 THEN 'P1'
            WHEN MONTH(t.created_at) = 2 THEN 'P2'
            WHEN MONTH(t.created_at) = 3 THEN 'P3'
            WHEN MONTH(t.created_at) = 4 THEN 'P4'
            WHEN MONTH(t.created_at) = 5 THEN 'P5'
            WHEN MONTH(t.created_at) = 6 THEN 'P6'
            WHEN MONTH(t.created_at) = 7 THEN 'P7'
            WHEN MONTH(t.created_at) = 8 THEN 'P8'
            WHEN MONTH(t.created_at) = 9 THEN 'P9'
            WHEN MONTH(t.created_at) = 10 THEN 'P10'
            WHEN MONTH(t.created_at) = 11 THEN 'P11'
            WHEN MONTH(t.created_at) = 12 THEN 'P12'
            ELSE 'P13'
          END as period,
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE YEAR(t.created_at) = ${parseInt(year)}
          AND t.status IN ('closed', 'resolved')
          AND pe.plant = '${plant}'
          AND pe.area = '${area}'
        GROUP BY 
          CASE 
            WHEN MONTH(t.created_at) = 1 THEN 'P1'
            WHEN MONTH(t.created_at) = 2 THEN 'P2'
            WHEN MONTH(t.created_at) = 3 THEN 'P3'
            WHEN MONTH(t.created_at) = 4 THEN 'P4'
            WHEN MONTH(t.created_at) = 5 THEN 'P5'
            WHEN MONTH(t.created_at) = 6 THEN 'P6'
            WHEN MONTH(t.created_at) = 7 THEN 'P7'
            WHEN MONTH(t.created_at) = 8 THEN 'P8'
            WHEN MONTH(t.created_at) = 9 THEN 'P9'
            WHEN MONTH(t.created_at) = 10 THEN 'P10'
            WHEN MONTH(t.created_at) = 11 THEN 'P11'
            WHEN MONTH(t.created_at) = 12 THEN 'P12'
            ELSE 'P13'
          END,
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END
        ORDER BY period, 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END
      `;
    }

    const result = await pool.request().query(downtimeQuery);
    
    // Create a map of data by period and grouping field
    const dataMap = {};
    result.recordset.forEach(row => {
      if (!dataMap[row.period]) {
        dataMap[row.period] = {};
      }
      dataMap[row.period][row.display_name] = {
        ticket_count: row.ticket_count,
        downtime_hours: row.total_downtime_hours
      };
    });

    // Get all unique grouping items from the data
    const allItems = new Set();
    result.recordset.forEach(row => {
      allItems.add(row.display_name);
    });
    const sortedItems = Array.from(allItems).sort();

    // Generate data for all periods (P1-P12) with all grouping items
    const periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'];
    const downtimeTrendData = periods.map(period => {
      const periodData = { period };
      
      // Add data for each grouping item (use 0 if no data)
      sortedItems.forEach(item => {
        const itemData = dataMap[period]?.[item];
        periodData[item] = itemData ? itemData.downtime_hours : 0;
      });
      
      return periodData;
    });

    res.json({
      success: true,
      data: {
        downtimeTrendData,
        summary: {
          totalPeriods: downtimeTrendData.length,
          totalItems: sortedItems.length,
          items: sortedItems,
          groupBy: summaryLabel,
          appliedFilters: {
            year: parseInt(year),
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getDowntimeAvoidanceTrend:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Cost Avoidance Data
 * Returns cost avoidance data by period
 * This chart is affected by plant/area filter and year filter
 */
exports.getCostAvoidanceData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      plant,
      area
    } = req.query;

    // Build WHERE clause based on filters with plant/area filtering via PUExtension
    let whereClause = `WHERE YEAR(t.created_at) = ${parseInt(year)} AND t.status IN ('closed', 'resolved')`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get cost avoidance data by period for the specified year and plant/area
    const costAvoidanceQuery = `
      SELECT 
        CASE 
          WHEN MONTH(t.created_at) = 1 THEN 'P1'
          WHEN MONTH(t.created_at) = 2 THEN 'P2'
          WHEN MONTH(t.created_at) = 3 THEN 'P3'
          WHEN MONTH(t.created_at) = 4 THEN 'P4'
          WHEN MONTH(t.created_at) = 5 THEN 'P5'
          WHEN MONTH(t.created_at) = 6 THEN 'P6'
          WHEN MONTH(t.created_at) = 7 THEN 'P7'
          WHEN MONTH(t.created_at) = 8 THEN 'P8'
          WHEN MONTH(t.created_at) = 9 THEN 'P9'
          WHEN MONTH(t.created_at) = 10 THEN 'P10'
          WHEN MONTH(t.created_at) = 11 THEN 'P11'
          WHEN MONTH(t.created_at) = 12 THEN 'P12'
          ELSE 'P13'
        END as period,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance,
        AVG(ISNULL(t.cost_avoidance, 0)) as avg_cost_per_case
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      ${whereClause}
      GROUP BY 
        CASE 
          WHEN MONTH(t.created_at) = 1 THEN 'P1'
          WHEN MONTH(t.created_at) = 2 THEN 'P2'
          WHEN MONTH(t.created_at) = 3 THEN 'P3'
          WHEN MONTH(t.created_at) = 4 THEN 'P4'
          WHEN MONTH(t.created_at) = 5 THEN 'P5'
          WHEN MONTH(t.created_at) = 6 THEN 'P6'
          WHEN MONTH(t.created_at) = 7 THEN 'P7'
          WHEN MONTH(t.created_at) = 8 THEN 'P8'
          WHEN MONTH(t.created_at) = 9 THEN 'P9'
          WHEN MONTH(t.created_at) = 10 THEN 'P10'
          WHEN MONTH(t.created_at) = 11 THEN 'P11'
          WHEN MONTH(t.created_at) = 12 THEN 'P12'
          ELSE 'P13'
        END
      ORDER BY period
    `;

    const result = await pool.request().query(costAvoidanceQuery);
    
    // Create a map of data by period
    const dataMap = {};
    result.recordset.forEach(row => {
      dataMap[row.period] = {
        ticket_count: row.ticket_count,
        total_cost_avoidance: row.total_cost_avoidance,
        avg_cost_per_case: row.avg_cost_per_case
      };
    });

    // Generate data for all periods (P1-P12)
    const periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'];
    const costAvoidanceData = periods.map(period => {
      const periodData = dataMap[period];
      return {
        period,
        costAvoidance: periodData ? periodData.total_cost_avoidance : 0,
        costPerCase: periodData ? periodData.avg_cost_per_case : 0,
        ticketCount: periodData ? periodData.ticket_count : 0
      };
    });

    res.json({
      success: true,
      data: {
        costAvoidanceData,
        summary: {
          totalPeriods: costAvoidanceData.length,
          totalCostAvoidance: costAvoidanceData.reduce((sum, item) => sum + item.costAvoidance, 0),
          totalTickets: costAvoidanceData.reduce((sum, item) => sum + item.ticketCount, 0),
          appliedFilters: {
            year: parseInt(year),
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getCostAvoidanceData:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Debug endpoint to check data consistency for plant/area/machine filtering
 * This helps diagnose discrepancies in totals across different filter levels
 */
exports.debugPlantAreaData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const {
      plant,
      startDate,
      endDate
    } = req.query;

    if (!plant) {
      return res.status(400).json({
        success: false,
        message: 'plant parameter is required'
      });
    }

    // Get detailed breakdown for the specified plant
    const debugQuery = `
      SELECT 
        'Plant Level' as level,
        pe.plant as name,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      WHERE pe.plant = '${plant}'
        AND t.status IN ('closed', 'resolved')
        ${startDate ? `AND t.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND t.created_at <= '${endDate}'` : ''}
      GROUP BY pe.plant

      UNION ALL

      SELECT 
        'Area Level' as level,
        CASE 
          WHEN pe.area IS NULL THEN 'NULL Area'
          ELSE pe.area
        END as name,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      WHERE pe.plant = '${plant}'
        AND t.status IN ('closed', 'resolved')
        ${startDate ? `AND t.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND t.created_at <= '${endDate}'` : ''}
      GROUP BY pe.area

      UNION ALL

      SELECT 
        'Machine/Line Level' as level,
        CASE 
          WHEN pe.machine IS NOT NULL THEN pe.machine
          WHEN pe.line IS NOT NULL THEN pe.line
          ELSE 'Unknown Equipment'
        END as name,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      WHERE pe.plant = '${plant}'
        AND pe.area = '${area}'
        AND t.status IN ('closed', 'resolved')
        ${startDate ? `AND t.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND t.created_at <= '${endDate}'` : ''}
      GROUP BY 
        CASE 
          WHEN pe.machine IS NOT NULL THEN pe.machine
          WHEN pe.line IS NOT NULL THEN pe.line
          ELSE 'Unknown Equipment'
        END

      ORDER BY level, total_downtime_hours DESC
    `;

    const result = await pool.request().query(debugQuery);
    
    res.json({
      success: true,
      data: {
        plant,
        startDate: startDate || 'No date filter',
        endDate: endDate || 'No date filter',
        breakdown: result.recordset
      }
    });

  } catch (error) {
    console.error('Error in debugPlantAreaData:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
exports.getDowntimeImpactLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    let downtimeImpactQuery;
    let groupByField;
    let displayNameField;
    let summaryLabel;

    // Determine grouping based on filter conditions
    if (!plant || plant === 'all') {
      // Condition 1: Show group by plant if all plant filter is selected
      groupByField = 'pe.plant';
      displayNameField = 'pe.plant as display_name';
      summaryLabel = 'Plants';
      
      downtimeImpactQuery = `
        SELECT TOP 10
          pe.plant as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}'
          AND t.status IN ('closed', 'resolved')
          AND pe.plant IS NOT NULL
        GROUP BY pe.plant
        HAVING SUM(ISNULL(t.downtime_avoidance_hours, 0)) > 0
        ORDER BY total_downtime_hours DESC
      `;
    } else if (!area || area === 'all') {
      // Condition 2: Show group by area if any plant selected but no area selected
      groupByField = 'pe.area';
      displayNameField = 'pe.area as display_name';
      summaryLabel = 'Areas';
      
      downtimeImpactQuery = `
        SELECT TOP 10
          CASE 
            WHEN pe.area IS NULL THEN 'Unknown Area'
            ELSE pe.area
          END as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}'
          AND t.status IN ('closed', 'resolved')
          AND pe.plant = '${plant}'
        GROUP BY pe.area
        HAVING SUM(ISNULL(t.downtime_avoidance_hours, 0)) > 0
        ORDER BY total_downtime_hours DESC
      `;
    } else {
      // Condition 3: Show group by equipment (machine/line) if any area filter is selected
      groupByField = 'pe.machine';
      displayNameField = 'pe.machine as display_name';
      summaryLabel = 'Equipment';
      
      downtimeImpactQuery = `
        SELECT TOP 10
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}'
          AND t.status IN ('closed', 'resolved')
          AND pe.plant = '${plant}'
          AND pe.area = '${area}'
        GROUP BY 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END
        HAVING SUM(ISNULL(t.downtime_avoidance_hours, 0)) > 0
        ORDER BY total_downtime_hours DESC
      `;
    }

    const result = await pool.request().query(downtimeImpactQuery);
    
    // Transform data for the chart
    const downtimeImpactData = result.recordset.map(row => ({
      display_name: row.display_name,
      hours: row.total_downtime_hours,
      ticketCount: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        downtimeImpactData,
        summary: {
          totalItems: downtimeImpactData.length,
          totalDowntimeHours: downtimeImpactData.reduce((sum, item) => sum + item.hours, 0),
          totalTickets: downtimeImpactData.reduce((sum, item) => sum + item.ticketCount, 0),
          groupBy: summaryLabel,
          appliedFilters: {
            startDate,
            endDate,
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getDowntimeImpactLeaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Cost Impact Leaderboard Data
 * Returns top 10 plant/area/equipment ranked by cost impact based on filter conditions:
 * 1. Group by plant if all plant filter is selected
 * 2. Group by area if any plant selected but no area selected  
 * 3. Group by equipment (machine/line) if any area filter is selected
 */
exports.getCostImpactLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    let costImpactQuery;
    let groupByField;
    let displayNameField;
    let summaryLabel;

    // Determine grouping based on filter conditions
    if (!plant || plant === 'all') {
      // Condition 1: Show group by plant if all plant filter is selected
      groupByField = 'pe.plant';
      displayNameField = 'pe.plant as display_name';
      summaryLabel = 'Plants';
      
      costImpactQuery = `
        SELECT TOP 10
          pe.plant as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}'
          AND t.status IN ('closed', 'resolved')
          AND pe.plant IS NOT NULL
        GROUP BY pe.plant
        HAVING SUM(ISNULL(t.cost_avoidance, 0)) > 0
        ORDER BY total_cost_avoidance DESC
      `;
    } else if (!area || area === 'all') {
      // Condition 2: Show group by area if any plant selected but no area selected
      groupByField = 'pe.area';
      displayNameField = 'pe.area as display_name';
      summaryLabel = 'Areas';
      
      costImpactQuery = `
        SELECT TOP 10
          CASE 
            WHEN pe.area IS NULL THEN 'Unknown Area'
            ELSE pe.area
          END as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}'
          AND t.status IN ('closed', 'resolved')
          AND pe.plant = '${plant}'
        GROUP BY pe.area
        HAVING SUM(ISNULL(t.cost_avoidance, 0)) > 0
        ORDER BY total_cost_avoidance DESC
      `;
    } else {
      // Condition 3: Show group by equipment (machine/line) if any area filter is selected
      groupByField = 'pe.machine';
      displayNameField = 'pe.machine as display_name';
      summaryLabel = 'Equipment';
      
      costImpactQuery = `
        SELECT TOP 10
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END as display_name,
          COUNT(t.id) as ticket_count,
          SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}'
          AND t.status IN ('closed', 'resolved')
          AND pe.plant = '${plant}'
          AND pe.area = '${area}'
        GROUP BY 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END
        HAVING SUM(ISNULL(t.cost_avoidance, 0)) > 0
        ORDER BY total_cost_avoidance DESC
      `;
    }

    const result = await pool.request().query(costImpactQuery);
    
    // Transform data for the chart
    const costImpactData = result.recordset.map(row => ({
      display_name: row.display_name,
      cost: row.total_cost_avoidance,
      ticketCount: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        costImpactData,
        summary: {
          totalItems: costImpactData.length,
          totalCostAvoidance: costImpactData.reduce((sum, item) => sum + item.cost, 0),
          totalTickets: costImpactData.reduce((sum, item) => sum + item.ticketCount, 0),
          groupBy: summaryLabel,
          appliedFilters: {
            startDate,
            endDate,
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getCostImpactLeaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Ontime Rate by Area Data
 * Returns ontime completion rate grouped by plant/area/equipment based on filter conditions:
 * 1. Group by plant if all plant filter is selected
 * 2. Group by area if any plant selected but no area selected  
 * 3. Group by equipment (machine/line) if any area filter is selected
 */
exports.getOntimeRateByArea = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    let ontimeRateQuery;
    let groupByField;
    let displayNameField;
    let summaryLabel;

    // Determine grouping based on filter conditions
    if (!plant || plant === 'all') {
      // Condition 1: Show group by plant if all plant filter is selected
      groupByField = 'pe.plant';
      displayNameField = 'pe.plant as display_name';
      summaryLabel = 'Plants';
      
      ontimeRateQuery = `
        SELECT 
          pe.plant as display_name,
          COUNT(t.id) as total_completed,
          COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) as ontime_completed,
          CASE 
            WHEN COUNT(t.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) * 100.0) / COUNT(t.id), 2)
            ELSE 0 
          END as ontime_rate_percentage
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}' 
          AND t.status = 'closed' 
          AND t.completed_at IS NOT NULL
          AND t.scheduled_complete IS NOT NULL
          AND pe.plant IS NOT NULL
        GROUP BY pe.plant
        HAVING COUNT(t.id) > 0
        ORDER BY ontime_rate_percentage DESC
      `;
    } else if (!area || area === 'all') {
      // Condition 2: Show group by area if any plant selected but no area selected
      groupByField = 'pe.area';
      displayNameField = 'pe.area as display_name';
      summaryLabel = 'Areas';
      
      ontimeRateQuery = `
        SELECT 
          CASE 
            WHEN pe.area IS NULL THEN 'Unknown Area'
            ELSE pe.area
          END as display_name,
          COUNT(t.id) as total_completed,
          COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) as ontime_completed,
          CASE 
            WHEN COUNT(t.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) * 100.0) / COUNT(t.id), 2)
            ELSE 0 
          END as ontime_rate_percentage
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}' 
          AND t.status = 'closed' 
          AND t.completed_at IS NOT NULL
          AND t.scheduled_complete IS NOT NULL
          AND pe.plant = '${plant}'
        GROUP BY pe.area
        HAVING COUNT(t.id) > 0
        ORDER BY ontime_rate_percentage DESC
      `;
    } else {
      // Condition 3: Show group by equipment (machine/line) if any area filter is selected
      groupByField = 'pe.machine';
      displayNameField = 'pe.machine as display_name';
      summaryLabel = 'Equipment';
      
      ontimeRateQuery = `
        SELECT 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END as display_name,
          COUNT(t.id) as total_completed,
          COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) as ontime_completed,
          CASE 
            WHEN COUNT(t.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) * 100.0) / COUNT(t.id), 2)
            ELSE 0 
          END as ontime_rate_percentage
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}' 
          AND t.status = 'closed' 
          AND t.completed_at IS NOT NULL
          AND t.scheduled_complete IS NOT NULL
          AND pe.plant = '${plant}'
          AND pe.area = '${area}'
        GROUP BY 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END
        HAVING COUNT(t.id) > 0
        ORDER BY ontime_rate_percentage DESC
      `;
    }

    const result = await pool.request().query(ontimeRateQuery);
    
    // Transform data for the chart
    const ontimeRateByAreaData = result.recordset.map(row => ({
      display_name: row.display_name,
      ontimeRate: row.ontime_rate_percentage,
      totalCompleted: row.total_completed,
      ontimeCompleted: row.ontime_completed
    }));

    res.json({
      success: true,
      data: {
        ontimeRateByAreaData,
        summary: {
          totalItems: ontimeRateByAreaData.length,
          totalCompleted: ontimeRateByAreaData.reduce((sum, item) => sum + item.totalCompleted, 0),
          totalOntimeCompleted: ontimeRateByAreaData.reduce((sum, item) => sum + item.ontimeCompleted, 0),
          overallOntimeRate: ontimeRateByAreaData.length > 0 
            ? Math.round((ontimeRateByAreaData.reduce((sum, item) => sum + item.ontimeCompleted, 0) / ontimeRateByAreaData.reduce((sum, item) => sum + item.totalCompleted, 0)) * 10000) / 100
            : 0,
          groupBy: summaryLabel,
          appliedFilters: {
            startDate,
            endDate,
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getOntimeRateByArea:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Ontime Rate by User Data
 * Returns percentage of tickets completed on time (completed_at < scheduled_complete)
 * Grouped by user with avatar support
 * Sorted from max to min (best performance first)
 * Only shown when specific plant/area is selected
 */
exports.getOntimeRateByUser = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let whereClause = `WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}' 
        AND t.status = 'closed' 
        AND t.completed_at IS NOT NULL
        AND t.scheduled_complete IS NOT NULL
        AND t.completed_by IS NOT NULL`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get ontime rate data by user for the specified period and plant/area
    const ontimeRateByUserQuery = `
      SELECT 
        t.completed_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as total_completed,
        COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) as ontime_completed,
        CASE 
          WHEN COUNT(t.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) * 100.0) / COUNT(t.id), 2)
          ELSE 0 
        END as ontime_rate_percentage
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      INNER JOIN Person p ON t.completed_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${whereClause}
      GROUP BY t.completed_by, p.PERSON_NAME, u.AvatarUrl
      HAVING COUNT(t.id) > 0
      ORDER BY ontime_rate_percentage DESC
    `;

    const result = await pool.request().query(ontimeRateByUserQuery);
    
    // Transform data for the chart
    const ontimeRateByUserData = result.recordset.map((row, index) => {
      // Generate initials from user name
      const initials = row.user_name 
        ? row.user_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U' + row.user_id;
      
      // Generate background color based on index for consistency
      const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f97316',
        '#14b8a6', '#6366f1', '#ef4444', '#eab308', '#06b6d4'
      ];
      const bgColor = colors[index % colors.length];

      return {
        id: row.user_id.toString(),
        userName: row.user_name || `User ${row.user_id}`,
        initials: initials,
        bgColor: bgColor,
        avatar: row.avatar_url,
        ontimeRate: row.ontime_rate_percentage,
        totalCompleted: row.total_completed,
        ontimeCompleted: row.ontime_completed
      };
    });

    res.json({
      success: true,
      data: {
        ontimeRateByUserData,
        summary: {
          totalUsers: ontimeRateByUserData.length,
          totalCompleted: ontimeRateByUserData.reduce((sum, item) => sum + item.totalCompleted, 0),
          totalOntimeCompleted: ontimeRateByUserData.reduce((sum, item) => sum + item.ontimeCompleted, 0),
          overallOntimeRate: ontimeRateByUserData.length > 0 
            ? Math.round((ontimeRateByUserData.reduce((sum, item) => sum + item.ontimeCompleted, 0) / ontimeRateByUserData.reduce((sum, item) => sum + item.totalCompleted, 0)) * 10000) / 100
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error in getOntimeRateByUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Ticket Average Resolve Duration by User Data
 * Returns average resolve time from created_at to completed_at for closed tickets
 * Grouped by user with avatar support
 * Sorted from min to max (best performance first)
 * Only shown when specific plant/area is selected
 */
exports.getTicketResolveDurationByUser = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let whereClause = `WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}' 
        AND t.status = 'closed' 
        AND t.completed_at IS NOT NULL
        AND t.completed_by IS NOT NULL`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get ticket resolve duration data by user for the specified period and plant/area
    const resolveDurationByUserQuery = `
      SELECT 
        t.completed_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count,
        AVG(DATEDIFF(HOUR, t.created_at, t.completed_at)) as avg_resolve_hours
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      INNER JOIN Person p ON t.completed_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${whereClause}
      GROUP BY t.completed_by, p.PERSON_NAME, u.AvatarUrl
      HAVING COUNT(t.id) > 0
      ORDER BY avg_resolve_hours ASC
    `;

    const result = await pool.request().query(resolveDurationByUserQuery);
    
    // Transform data for the chart
    const resolveDurationByUserData = result.recordset.map((row, index) => {
      // Generate initials from user name
      const initials = row.user_name 
        ? row.user_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U' + row.user_id;
      
      // Generate background color based on index for consistency
      const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f97316',
        '#14b8a6', '#6366f1', '#ef4444', '#eab308', '#06b6d4'
      ];
      const bgColor = colors[index % colors.length];

      return {
        id: row.user_id.toString(),
        userName: row.user_name || `User ${row.user_id}`,
        initials: initials,
        bgColor: bgColor,
        avatar: row.avatar_url,
        avgResolveHours: Math.round(row.avg_resolve_hours * 100) / 100, // Round to 2 decimal places
        ticketCount: row.ticket_count
      };
    });

    res.json({
      success: true,
      data: {
        resolveDurationByUserData,
        summary: {
          totalUsers: resolveDurationByUserData.length,
          totalTickets: resolveDurationByUserData.reduce((sum, item) => sum + item.ticketCount, 0),
          overallAvgResolveHours: resolveDurationByUserData.length > 0 
            ? Math.round((resolveDurationByUserData.reduce((sum, item) => sum + (item.avgResolveHours * item.ticketCount), 0) / resolveDurationByUserData.reduce((sum, item) => sum + item.ticketCount, 0)) * 100) / 100
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error in getTicketResolveDurationByUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Ticket Average Resolve Duration by Area Data
 * Returns average resolve duration grouped by plant/area/equipment based on filter conditions:
 * 1. Group by plant if all plant filter is selected
 * 2. Group by area if any plant selected but no area selected  
 * 3. Group by equipment (machine/line) if any area filter is selected
 */
exports.getTicketResolveDurationByArea = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    let resolveDurationQuery;
    let groupByField;
    let displayNameField;
    let summaryLabel;

    // Determine grouping based on filter conditions
    if (!plant || plant === 'all') {
      // Condition 1: Show group by plant if all plant filter is selected
      groupByField = 'pe.plant';
      displayNameField = 'pe.plant as display_name';
      summaryLabel = 'Plants';
      
      resolveDurationQuery = `
        SELECT 
          pe.plant as display_name,
          COUNT(t.id) as ticket_count,
          AVG(DATEDIFF(HOUR, t.created_at, t.completed_at)) as avg_resolve_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}' 
          AND t.status = 'closed' 
          AND t.completed_at IS NOT NULL
          AND pe.plant IS NOT NULL
        GROUP BY pe.plant
        HAVING COUNT(t.id) > 0
        ORDER BY avg_resolve_hours ASC
      `;
    } else if (!area || area === 'all') {
      // Condition 2: Show group by area if any plant selected but no area selected
      groupByField = 'pe.area';
      displayNameField = 'pe.area as display_name';
      summaryLabel = 'Areas';
      
      resolveDurationQuery = `
        SELECT 
          CASE 
            WHEN pe.area IS NULL THEN 'Unknown Area'
            ELSE pe.area
          END as display_name,
          COUNT(t.id) as ticket_count,
          AVG(DATEDIFF(HOUR, t.created_at, t.completed_at)) as avg_resolve_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}' 
          AND t.status = 'closed' 
          AND t.completed_at IS NOT NULL
          AND pe.plant = '${plant}'
        GROUP BY pe.area
        HAVING COUNT(t.id) > 0
        ORDER BY avg_resolve_hours ASC
      `;
    } else {
      // Condition 3: Show group by equipment (machine/line) if any area filter is selected
      groupByField = 'pe.machine';
      displayNameField = 'pe.machine as display_name';
      summaryLabel = 'Equipment';
      
      resolveDurationQuery = `
        SELECT 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END as display_name,
          COUNT(t.id) as ticket_count,
          AVG(DATEDIFF(HOUR, t.created_at, t.completed_at)) as avg_resolve_hours
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        WHERE t.created_at >= '${startDate}' 
          AND t.created_at <= '${endDate}' 
          AND t.status = 'closed' 
          AND t.completed_at IS NOT NULL
          AND pe.plant = '${plant}'
          AND pe.area = '${area}'
        GROUP BY 
          CASE 
            WHEN pe.machine IS NOT NULL THEN pe.machine
            WHEN pe.line IS NOT NULL THEN pe.line
            ELSE 'Unknown Equipment'
          END
        HAVING COUNT(t.id) > 0
        ORDER BY avg_resolve_hours ASC
      `;
    }

    const result = await pool.request().query(resolveDurationQuery);
    
    // Transform data for the chart
    const resolveDurationByAreaData = result.recordset.map(row => ({
      display_name: row.display_name,
      avgResolveHours: Math.round(row.avg_resolve_hours * 100) / 100, // Round to 2 decimal places
      ticketCount: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        resolveDurationByAreaData,
        summary: {
          totalItems: resolveDurationByAreaData.length,
          totalTickets: resolveDurationByAreaData.reduce((sum, item) => sum + item.ticketCount, 0),
          overallAvgResolveHours: resolveDurationByAreaData.length > 0 
            ? Math.round((resolveDurationByAreaData.reduce((sum, item) => sum + (item.avgResolveHours * item.ticketCount), 0) / resolveDurationByAreaData.reduce((sum, item) => sum + item.ticketCount, 0)) * 100) / 100
            : 0,
          groupBy: summaryLabel,
          appliedFilters: {
            startDate,
            endDate,
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getTicketResolveDurationByArea:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Cost Impact by Failure Mode Data
 * Returns cost impact data grouped by failure mode
 * This chart is affected by plant/area filter and exact time range
 * Sorted by cost accumulation (max to min)
 */
exports.getCostImpactByFailureMode = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get cost impact data by failure mode for the specified period and plant/area
    const costByFailureModeQuery = `
      SELECT 
        fm.FailureModeCode as failure_mode_code,
        fm.FailureModeName as failure_mode_name,
        COUNT(t.id) as case_count,
        SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      LEFT JOIN FailureModes fm ON t.failure_mode_id = fm.FailureModeNo
      ${whereClause}
      GROUP BY fm.FailureModeCode, fm.FailureModeName
      HAVING SUM(ISNULL(t.cost_avoidance, 0)) > 0
      ORDER BY total_cost_avoidance DESC
    `;

    const result = await pool.request().query(costByFailureModeQuery);
    
    // Transform data for the chart
    const costByFailureModeData = result.recordset.map(row => ({
      failureModeCode: row.failure_mode_code || 'UNKNOWN',
      failureModeName: row.failure_mode_name || 'Unknown',
      cost: row.total_cost_avoidance,
      caseCount: row.case_count
    }));

    res.json({
      success: true,
      data: {
        costByFailureModeData,
        summary: {
          totalFailureModes: costByFailureModeData.length,
          totalCostAvoidance: costByFailureModeData.reduce((sum, item) => sum + item.cost, 0),
          totalCases: costByFailureModeData.reduce((sum, item) => sum + item.caseCount, 0),
          averageCostPerMode: costByFailureModeData.length > 0 
            ? costByFailureModeData.reduce((sum, item) => sum + item.cost, 0) / costByFailureModeData.length 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error in getCostImpactByFailureMode:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Downtime Impact by Failure Mode Data
 * Returns downtime impact data grouped by failure mode
 * This chart is affected by plant/area filter and exact time range
 * Sorted by downtime accumulation (max to min)
 */
exports.getDowntimeImpactByFailureMode = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get downtime impact data by failure mode for the specified period and plant/area
    const downtimeByFailureModeQuery = `
      SELECT 
        fm.FailureModeCode as failure_mode_code,
        fm.FailureModeName as failure_mode_name,
        COUNT(t.id) as case_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      LEFT JOIN FailureModes fm ON t.failure_mode_id = fm.FailureModeNo
      ${whereClause}
      GROUP BY fm.FailureModeCode, fm.FailureModeName
      HAVING SUM(ISNULL(t.downtime_avoidance_hours, 0)) > 0
      ORDER BY total_downtime_hours DESC
    `;

    const result = await pool.request().query(downtimeByFailureModeQuery);
    
    // Transform data for the chart
    const downtimeByFailureModeData = result.recordset.map(row => ({
      failureModeCode: row.failure_mode_code || 'UNKNOWN',
      failureModeName: row.failure_mode_name || 'Unknown',
      downtime: row.total_downtime_hours,
      caseCount: row.case_count
    }));

    res.json({
      success: true,
      data: {
        downtimeByFailureModeData,
        summary: {
          totalFailureModes: downtimeByFailureModeData.length,
          totalDowntimeHours: downtimeByFailureModeData.reduce((sum, item) => sum + item.downtime, 0),
          totalCases: downtimeByFailureModeData.reduce((sum, item) => sum + item.caseCount, 0),
          averageDowntimePerMode: downtimeByFailureModeData.length > 0 
            ? downtimeByFailureModeData.reduce((sum, item) => sum + item.downtime, 0) / downtimeByFailureModeData.length 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error in getDowntimeImpactByFailureMode:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Cost Impact Reporter Leaderboard Data
 * Returns top 10 users ranked by cost impact
 * This chart is affected by time range and plant/area filters
 */
exports.getCostImpactReporterLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get cost impact data by reporter for the specified period and plant/area
    const costImpactReporterQuery = `
      SELECT TOP 10
        t.reported_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      INNER JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${whereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      HAVING SUM(ISNULL(t.cost_avoidance, 0)) > 0
      ORDER BY total_cost_avoidance DESC
    `;

    const result = await pool.request().query(costImpactReporterQuery);
    
    // Transform data for the chart
    const costImpactReporterData = result.recordset.map((row, index) => {
      // Generate initials from user name
      const initials = row.user_name 
        ? row.user_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U' + row.user_id;
      
      // Generate background color based on index for consistency
      const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f97316',
        '#14b8a6', '#6366f1', '#ef4444', '#eab308', '#06b6d4'
      ];
      const bgColor = colors[index % colors.length];

      return {
        id: row.user_id.toString(),
        reporter: row.user_name || `User ${row.user_id}`,
        cost: row.total_cost_avoidance,
        initials: initials,
        bgColor: bgColor,
        avatar: row.avatar_url,
        ticketCount: row.ticket_count
      };
    });

    res.json({
      success: true,
      data: {
        costImpactReporterData,
        summary: {
          totalUsers: costImpactReporterData.length,
          totalCostAvoidance: costImpactReporterData.reduce((sum, item) => sum + item.cost, 0),
          averageCostPerUser: costImpactReporterData.length > 0 
            ? costImpactReporterData.reduce((sum, item) => sum + item.cost, 0) / costImpactReporterData.length 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error in getCostImpactReporterLeaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Downtime Impact Reporter Leaderboard Data
 * Returns top 10 users ranked by downtime impact
 * This chart is affected by both time range and plant/area filter
 */
exports.getDowntimeImpactReporterLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      plant,
      area
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause based on filters with plant/area filtering via PUExtension
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get downtime impact data by reporter for the specified period and plant/area
    const downtimeImpactReporterQuery = `
      SELECT TOP 10
        t.reported_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      INNER JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${whereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      HAVING SUM(ISNULL(t.downtime_avoidance_hours, 0)) > 0
      ORDER BY total_downtime_hours DESC
    `;

    const result = await pool.request().query(downtimeImpactReporterQuery);
    
    // Transform data for the chart
    const downtimeImpactReporterData = result.recordset.map((row, index) => {
      // Generate initials from user name
      const initials = row.user_name 
        ? row.user_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U' + row.user_id;
      
      // Generate background color based on index for consistency
      const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f97316',
        '#14b8a6', '#6366f1', '#ef4444', '#eab308', '#06b6d4'
      ];
      const bgColor = colors[index % colors.length];

      return {
        id: row.user_id.toString(),
        reporter: row.user_name || `User ${row.user_id}`,
        hours: row.total_downtime_hours,
        initials: initials,
        bgColor: bgColor,
        avatar: row.avatar_url,
        ticketCount: row.ticket_count
      };
    });

    res.json({
      success: true,
      data: {
        downtimeImpactReporterData,
        summary: {
          totalUsers: downtimeImpactReporterData.length,
          totalDowntimeHours: downtimeImpactReporterData.reduce((sum, item) => sum + item.hours, 0),
          totalTickets: downtimeImpactReporterData.reduce((sum, item) => sum + item.ticketCount, 0),
          appliedFilters: {
            startDate,
            endDate,
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getDowntimeImpactReporterLeaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Calendar Heatmap Data
 * Returns ticket counts by date for the calendar heatmap
 * This chart is affected by plant/area filter and year (from time filter)
 */
exports.getCalendarHeatmapData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      plant,
      area
    } = req.query;

    // Build WHERE clause for tickets with plant/area filtering via PUExtension
    let whereClause = `WHERE YEAR(t.created_at) = ${parseInt(year)}`;
    
    if (plant && plant !== 'all') {
      whereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      whereClause += ` AND pe.area = '${area}'`;
    }

    // Get ticket counts by date for the specified year and plant/area
    const calendarQuery = `
      SELECT 
        CAST(t.created_at AS DATE) as date,
        COUNT(t.id) as count
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      ${whereClause}
      GROUP BY CAST(t.created_at AS DATE)
      ORDER BY date
    `;

    const result = await pool.request().query(calendarQuery);
    
    
    // Create a map of existing data
    const dataMap = {};
    result.recordset.forEach(row => {
      // Convert the date to ISO string format for consistent matching
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date;
      dataMap[dateStr] = row.count;
    });
    

    // Generate data for the entire year (including days with 0 tickets)
    const calendarData = [];
    const startDate = new Date(Date.UTC(parseInt(year), 0, 1)); // January 1st UTC
    const endDate = new Date(Date.UTC(parseInt(year), 11, 31)); // December 31st UTC
    
    
    // Use a more reliable date iteration method
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = dataMap[dateStr] || 0;
      
      
      calendarData.push({
        date: dateStr,
        count: count
      });
      // Move to next day
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }


    res.json({
      success: true,
      data: {
        calendarData,
        summary: {
          totalDays: calendarData.length,
          daysWithTickets: calendarData.filter(item => item.count > 0).length,
          totalTickets: calendarData.reduce((sum, item) => sum + item.count, 0),
          maxTicketsPerDay: calendarData.length > 0 ? Math.max(...calendarData.map(item => item.count)) : 0,
          appliedFilters: {
            year: parseInt(year),
            plant: plant || null,
            area: area || null
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getCalendarHeatmapData:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Abnormal Finding Dashboard KPIs
 * Returns comprehensive KPIs for abnormal finding tickets with comparison data
 */
exports.getAbnormalFindingKPIs = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      compare_startDate,
      compare_endDate,
      plant,
      area
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Convert dates to YYYYMMDD format for SQL queries
    const formatDateForSQL = (dateStr) => {
      return dateStr.replace(/-/g, '');
    };

    const startDateFormatted = formatDateForSQL(startDate);
    const endDateFormatted = formatDateForSQL(endDate);
    const compareStartDateFormatted = compare_startDate ? formatDateForSQL(compare_startDate) : null;
    const compareEndDateFormatted = compare_endDate ? formatDateForSQL(compare_endDate) : null;

    // Build WHERE clause for current period - use proper date comparison with plant/area filtering via PUExtension
    let currentWhereClause = `WHERE CAST(t.created_at AS DATE) >= '${startDate}' AND CAST(t.created_at AS DATE) <= '${endDate}'`;
    
    if (plant && plant !== 'all') {
      currentWhereClause += ` AND pe.plant = '${plant}'`;
    }
    
    if (area && area !== 'all') {
      currentWhereClause += ` AND pe.area = '${area}'`;
    }

    // Build WHERE clause for comparison period
    let compareWhereClause = '';
    if (compareStartDateFormatted && compareEndDateFormatted) {
      compareWhereClause = `WHERE CAST(t.created_at AS DATE) >= '${compare_startDate}' AND CAST(t.created_at AS DATE) <= '${compare_endDate}'`;
      
      if (plant && plant !== 'all') {
        compareWhereClause += ` AND pe.plant = '${plant}'`;
      }
      
      if (area && area !== 'all') {
        compareWhereClause += ` AND pe.area = '${area}'`;
      }
    }

    // Get current period KPIs
    const currentKPIsQuery = `
      SELECT 
        COUNT(*) as totalTickets,
        SUM(CASE WHEN t.status IN ('closed', 'completed') THEN 1 ELSE 0 END) as closedTickets,
        SUM(CASE WHEN t.status = 'open' THEN 1 ELSE 0 END) as waitingTickets,
        SUM(CASE WHEN t.status NOT IN ('closed', 'open', 'rejected_final') THEN 1 ELSE 0 END) as pendingTickets,
        ISNULL(SUM(t.downtime_avoidance_hours), 0) as totalDowntimeAvoidance,
        ISNULL(SUM(t.cost_avoidance), 0) as totalCostAvoidance
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      ${currentWhereClause}
    `;

    // Get comparison period KPIs
    let compareKPIsQuery = '';
    if (compareWhereClause) {
      compareKPIsQuery = `
        SELECT 
          COUNT(*) as totalTickets,
          SUM(CASE WHEN t.status IN ('closed', 'completed') THEN 1 ELSE 0 END) as closedTickets,
          SUM(CASE WHEN t.status = 'open' THEN 1 ELSE 0 END) as waitingTickets,
          SUM(CASE WHEN t.status NOT IN ('closed', 'open', 'rejected_final') THEN 1 ELSE 0 END) as pendingTickets,
          ISNULL(SUM(t.downtime_avoidance_hours), 0) as totalDowntimeAvoidance,
          ISNULL(SUM(t.cost_avoidance), 0) as totalCostAvoidance
        FROM Tickets t
        LEFT JOIN PUExtension pe ON t.puno = pe.puno
        ${compareWhereClause}
      `;
    }

    // Get top performers for current period
    const topPerformersQuery = `
      SELECT TOP 1
        t.reported_by as personno,
        p.PERSON_NAME as personName,
        u.AvatarUrl as avatarUrl,
        COUNT(*) as ticketCount
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      LEFT JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${currentWhereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      ORDER BY COUNT(*) DESC
    `;

    const topCostSaverQuery = `
      SELECT TOP 1
        t.reported_by as personno,
        p.PERSON_NAME as personName,
        u.AvatarUrl as avatarUrl,
        ISNULL(SUM(t.cost_avoidance), 0) as totalSavings
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      LEFT JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${currentWhereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      ORDER BY totalSavings DESC
    `;

    const topDowntimeSaverQuery = `
      SELECT TOP 1
        t.reported_by as personno,
        p.PERSON_NAME as personName,
        u.AvatarUrl as avatarUrl,
        ISNULL(SUM(t.downtime_avoidance_hours), 0) as totalDowntimeSaved
      FROM Tickets t
      LEFT JOIN PUExtension pe ON t.puno = pe.puno
      LEFT JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${currentWhereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      ORDER BY totalDowntimeSaved DESC
    `;

    // Execute all queries
    const [currentKPIsResult, compareKPIsResult, topReporterResult, topCostSaverResult, topDowntimeSaverResult] = await Promise.all([
      pool.request().query(currentKPIsQuery),
      compareKPIsQuery ? pool.request().query(compareKPIsQuery) : Promise.resolve({ recordset: [{ totalTickets: 0, closedTickets: 0, pendingTickets: 0, totalDowntimeAvoidance: 0, totalCostAvoidance: 0 }] }),
      pool.request().query(topPerformersQuery),
      pool.request().query(topCostSaverQuery),
      pool.request().query(topDowntimeSaverQuery)
    ]);

    const currentKPIs = currentKPIsResult.recordset[0];
    const compareKPIs = compareKPIsResult.recordset[0];
    const topReporter = topReporterResult.recordset[0] || null;
    const topCostSaver = topCostSaverResult.recordset[0] || null;
    const topDowntimeSaver = topDowntimeSaverResult.recordset[0] || null;

    // Calculate comparison metrics with enhanced logic
    const calculateGrowthRate = (current, previous) => {
      // Both values are 0 - no change
      if (current === 0 && previous === 0) {
        return {
          percentage: 0,
          type: 'no_change',
          description: 'No change (both periods had 0)'
        };
      }
      
      // Previous was 0, current has value - new activity
      if (previous === 0 && current > 0) {
        return {
          percentage: 100,
          type: 'new_activity',
          description: 'New activity (0 → ' + current + ')'
        };
      }
      
      // Current is 0, previous had value - activity stopped
      if (current === 0 && previous > 0) {
        return {
          percentage: -100,
          type: 'activity_stopped',
          description: 'Activity stopped (' + previous + ' → 0)'
        };
      }
      
      // Both have values - calculate percentage change
      const percentage = ((current - previous) / previous) * 100;
      return {
        percentage: percentage,
        type: percentage > 0 ? 'increase' : percentage < 0 ? 'decrease' : 'no_change',
        description: percentage > 0 ? 
          `+${percentage.toFixed(1)}% increase` : 
          percentage < 0 ? 
          `${percentage.toFixed(1)}% decrease` : 
          'No change'
      };
    };

    const comparisonMetrics = {
      ticketGrowthRate: calculateGrowthRate(currentKPIs.totalTickets, compareKPIs.totalTickets),
      closureRateImprovement: calculateGrowthRate(currentKPIs.closedTickets, compareKPIs.closedTickets),
      waitingTicketsChange: calculateGrowthRate(currentKPIs.waitingTickets, compareKPIs.waitingTickets),
      costAvoidanceGrowth: calculateGrowthRate(currentKPIs.totalCostAvoidance, compareKPIs.totalCostAvoidance),
      downtimeAvoidanceGrowth: calculateGrowthRate(currentKPIs.totalDowntimeAvoidance, compareKPIs.totalDowntimeAvoidance)
    };

    // Format response
    const response = {
      success: true,
      data: {
        kpis: {
          totalTicketsThisPeriod: currentKPIs.totalTickets,
          totalTicketsLastPeriod: compareKPIs.totalTickets,
          closedTicketsThisPeriod: currentKPIs.closedTickets,
          closedTicketsLastPeriod: compareKPIs.closedTickets,
          waitingTicketsThisPeriod: currentKPIs.waitingTickets,
          waitingTicketsLastPeriod: compareKPIs.waitingTickets,
          pendingTicketsThisPeriod: currentKPIs.pendingTickets,
          pendingTicketsLastPeriod: compareKPIs.pendingTickets,
          totalDowntimeAvoidanceThisPeriod: currentKPIs.totalDowntimeAvoidance,
          totalDowntimeAvoidanceLastPeriod: compareKPIs.totalDowntimeAvoidance,
          totalCostAvoidanceThisPeriod: currentKPIs.totalCostAvoidance,
          totalCostAvoidanceLastPeriod: compareKPIs.totalCostAvoidance
        },
        topPerformers: {
          topReporter: topReporter ? {
            personno: topReporter.personno,
            personName: topReporter.personName,
            avatarUrl: topReporter.avatarUrl,
            ticketCount: topReporter.ticketCount
          } : null,
          topCostSaver: topCostSaver ? {
            personno: topCostSaver.personno,
            personName: topCostSaver.personName,
            avatarUrl: topCostSaver.avatarUrl,
            totalSavings: topCostSaver.totalSavings
          } : null,
          topDowntimeSaver: topDowntimeSaver ? {
            personno: topDowntimeSaver.personno,
            personName: topDowntimeSaver.personName,
            avatarUrl: topDowntimeSaver.avatarUrl,
            totalDowntimeSaved: topDowntimeSaver.totalDowntimeSaved
          } : null
        },
        periodInfo: {
          currentPeriod: {
            startDate: startDate,
            endDate: endDate
          },
          lastPeriod: compare_startDate && compare_endDate ? {
            startDate: compare_startDate,
            endDate: compare_endDate
          } : null
        },
        summary: {
          appliedFilters: {
            startDate,
            endDate,
            compare_startDate,
            compare_endDate,
            plant: plant || null,
            area: area || null
          },
          comparisonMetrics
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error in getAbnormalFindingKPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
