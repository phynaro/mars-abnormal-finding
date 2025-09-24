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
      area_id
    } = req.query;

    // Build WHERE clause for tickets
    let ticketsWhereClause = `WHERE YEAR(t.created_at) = ${parseInt(year)}`;
    
    if (area_id && area_id !== 'all') {
      ticketsWhereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get tickets count per period
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

    // Get targets for the same year and area
    let targetsWhereClause = `WHERE t.year = ${parseInt(year)} AND t.type = 'open case'`;
    
    if (area_id && area_id !== 'all') {
      // Get area code from area_id
      const areaQuery = `SELECT code FROM Area WHERE id = ${parseInt(area_id)}`;
      const areaResult = await pool.request().query(areaQuery);
      
      if (areaResult.recordset.length > 0) {
        const areaCode = areaResult.recordset[0].code;
        targetsWhereClause += ` AND t.area = '${areaCode}'`;
      }
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
            area_id: area_id ? parseInt(area_id) : null
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
 * Get Area Activity Data
 * Returns ticket counts grouped by area for the "Who Active (Area)" chart
 * This chart is not affected by area filter - shows all areas
 */
exports.getAreaActivityData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear()
    } = req.query;

    // Get ticket counts by area for the specified year
    const areaActivityQuery = `
      SELECT TOP 10
        a.id as area_id,
        a.name as area_name,
        a.code as area_code,
        COUNT(t.id) as ticket_count
      FROM Area a
      INNER JOIN Tickets t ON a.id = t.area_id 
        AND YEAR(t.created_at) = ${parseInt(year)}
      WHERE a.is_active = 1
      GROUP BY a.id, a.name, a.code
      HAVING COUNT(t.id) > 0
      ORDER BY ticket_count DESC, a.name ASC
    `;

    const result = await pool.request().query(areaActivityQuery);
    
    // Transform the data for frontend consumption
    const areaActivityData = result.recordset.map(row => ({
      area_id: row.area_id,
      area_name: row.area_name,
      area_code: row.area_code,
      tickets: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        areaActivityData,
        summary: {
          totalAreas: areaActivityData.length,
          totalTickets: areaActivityData.reduce((sum, item) => sum + item.tickets, 0),
          averageTicketsPerArea: areaActivityData.length > 0 
            ? Math.round(areaActivityData.reduce((sum, item) => sum + item.tickets, 0) / areaActivityData.length)
            : 0,
          appliedFilters: {
            year: parseInt(year)
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
 * This chart is affected by time range and area filters
 */
exports.getUserActivityData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      area_id
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

    // Build WHERE clause for tickets
    let whereClause = `WHERE CAST(t.created_at AS DATE) >= '${startDate}' AND CAST(t.created_at AS DATE) <= '${endDate}'`;
    
    if (area_id && area_id !== 'all') {
      whereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get ticket counts by user for the specified time range and area
    const userActivityQuery = `
      SELECT TOP 10
        t.reported_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count
      FROM Tickets t
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
            area_id: area_id ? parseInt(area_id) : null
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
 * Returns downtime avoidance data by period and area
 * This chart is affected by year filter only (not area filter)
 */
exports.getDowntimeAvoidanceTrend = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear()
    } = req.query;

    // Get downtime avoidance data by period and area for the specified year
    const downtimeQuery = `
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
        CONCAT(p.code, '-', a.code) as area_display_name,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
      INNER JOIN Area a ON t.area_id = a.id
      INNER JOIN Plant p ON a.plant_id = p.id
      WHERE YEAR(t.created_at) = ${parseInt(year)}
        AND t.status IN ('closed', 'resolved')
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
        CONCAT(p.code, '-', a.code)
      ORDER BY period, area_display_name
    `;

    const result = await pool.request().query(downtimeQuery);
    
    // Create a map of data by period and area
    const dataMap = {};
    result.recordset.forEach(row => {
      if (!dataMap[row.period]) {
        dataMap[row.period] = {};
      }
      dataMap[row.period][row.area_display_name] = {
        ticket_count: row.ticket_count,
        downtime_hours: row.total_downtime_hours
      };
    });

    // Get all unique areas from the data
    const allAreas = new Set();
    result.recordset.forEach(row => {
      allAreas.add(row.area_display_name);
    });
    const sortedAreas = Array.from(allAreas).sort();

    // Generate data for all periods (P1-P12) with all areas
    const periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'];
    const downtimeTrendData = periods.map(period => {
      const periodData = { period };
      
      // Add data for each area (use 0 if no data)
      sortedAreas.forEach(area => {
        const areaData = dataMap[period]?.[area];
        periodData[area] = areaData ? areaData.downtime_hours : 0;
      });
      
      return periodData;
    });

    res.json({
      success: true,
      data: {
        downtimeTrendData,
        summary: {
          totalPeriods: downtimeTrendData.length,
          totalAreas: sortedAreas.length,
          areas: sortedAreas,
          appliedFilters: {
            year: parseInt(year)
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
 * This chart is affected by area filter and year filter
 */
exports.getCostAvoidanceData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      area_id
    } = req.query;

    // Build WHERE clause based on filters
    let whereClause = `WHERE YEAR(t.created_at) = ${parseInt(year)} AND t.status IN ('closed', 'resolved')`;
    if (area_id && area_id !== 'all') {
      whereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get cost avoidance data by period for the specified year and area
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
            area_id: area_id ? parseInt(area_id) : null
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
 * Get Downtime Impact Leaderboard Data
 * Returns top 10 areas ranked by downtime impact
 * This chart is NOT affected by area filter, but affected by selected period
 */
exports.getDowntimeImpactLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Get downtime impact data by area for the specified period
    const downtimeImpactQuery = `
      SELECT TOP 10
        CONCAT(p.code, '-', a.code) as area_display_name,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
      INNER JOIN Area a ON t.area_id = a.id
      INNER JOIN Plant p ON a.plant_id = p.id
      WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}'
        AND t.status IN ('closed', 'resolved')
      GROUP BY CONCAT(p.code, '-', a.code)
      HAVING SUM(ISNULL(t.downtime_avoidance_hours, 0)) > 0
      ORDER BY total_downtime_hours DESC
    `;

    const result = await pool.request().query(downtimeImpactQuery);
    
    // Transform data for the chart
    const downtimeImpactData = result.recordset.map(row => ({
      area: row.area_display_name,
      hours: row.total_downtime_hours,
      ticketCount: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        downtimeImpactData,
        summary: {
          totalAreas: downtimeImpactData.length,
          totalDowntimeHours: downtimeImpactData.reduce((sum, item) => sum + item.hours, 0),
          totalTickets: downtimeImpactData.reduce((sum, item) => sum + item.ticketCount, 0),
          appliedFilters: {
            startDate,
            endDate
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
 * Returns top 10 areas ranked by cost impact
 * This chart is NOT affected by area filter, but affected by selected period
 */
exports.getCostImpactLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Get cost impact data by area for the specified period
    const costImpactQuery = `
      SELECT TOP 10
        CONCAT(p.code, '-', a.code) as area_display_name,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
      FROM Tickets t
      INNER JOIN Area a ON t.area_id = a.id
      INNER JOIN Plant p ON a.plant_id = p.id
      WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}'
        AND t.status IN ('closed', 'resolved')
      GROUP BY CONCAT(p.code, '-', a.code)
      HAVING SUM(ISNULL(t.cost_avoidance, 0)) > 0
      ORDER BY total_cost_avoidance DESC
    `;

    const result = await pool.request().query(costImpactQuery);
    
    // Transform data for the chart
    const costImpactData = result.recordset.map(row => ({
      area: row.area_display_name,
      cost: row.total_cost_avoidance,
      ticketCount: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        costImpactData,
        summary: {
          totalAreas: costImpactData.length,
          totalCostAvoidance: costImpactData.reduce((sum, item) => sum + item.cost, 0),
          totalTickets: costImpactData.reduce((sum, item) => sum + item.ticketCount, 0),
          appliedFilters: {
            startDate,
            endDate
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
 * Returns percentage of tickets completed on time (completed_at < scheduled_complete)
 * Grouped by area using plant-area code format
 * Sorted from max to min (best performance first)
 * Only shown when "All Area" is selected
 */
exports.getOntimeRateByArea = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Get ontime rate data by area for the specified period
    const ontimeRateByAreaQuery = `
      SELECT 
        CONCAT(p.code, '-', a.code) as area_code,
        COUNT(t.id) as total_completed,
        COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) as ontime_completed,
        CASE 
          WHEN COUNT(t.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN t.completed_at < t.scheduled_complete THEN 1 END) * 100.0) / COUNT(t.id), 2)
          ELSE 0 
        END as ontime_rate_percentage
      FROM Tickets t
      LEFT JOIN Area a ON t.area_id = a.id
      LEFT JOIN Plant p ON a.plant_id = p.id
      WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}' 
        AND t.status = 'closed' 
        AND t.completed_at IS NOT NULL
        AND t.scheduled_complete IS NOT NULL
        AND a.code IS NOT NULL 
        AND p.code IS NOT NULL
      GROUP BY p.code, a.code
      HAVING COUNT(t.id) > 0
      ORDER BY ontime_rate_percentage DESC
    `;

    const result = await pool.request().query(ontimeRateByAreaQuery);
    
    // Transform data for the chart
    const ontimeRateByAreaData = result.recordset.map(row => ({
      areaCode: row.area_code,
      ontimeRate: row.ontime_rate_percentage,
      totalCompleted: row.total_completed,
      ontimeCompleted: row.ontime_completed
    }));

    res.json({
      success: true,
      data: {
        ontimeRateByAreaData,
        summary: {
          totalAreas: ontimeRateByAreaData.length,
          totalCompleted: ontimeRateByAreaData.reduce((sum, item) => sum + item.totalCompleted, 0),
          totalOntimeCompleted: ontimeRateByAreaData.reduce((sum, item) => sum + item.ontimeCompleted, 0),
          overallOntimeRate: ontimeRateByAreaData.length > 0 
            ? Math.round((ontimeRateByAreaData.reduce((sum, item) => sum + item.ontimeCompleted, 0) / ontimeRateByAreaData.reduce((sum, item) => sum + item.totalCompleted, 0)) * 10000) / 100
            : 0
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
 * Only shown when specific area is selected
 */
exports.getOntimeRateByUser = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      area_id
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate || !area_id || area_id === 'all') {
      return res.status(400).json({
        success: false,
        message: 'startDate, endDate, and area_id (not "all") are required'
      });
    }

    // Get ontime rate data by user for the specified period and area
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
      INNER JOIN Person p ON t.completed_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}' 
        AND t.status = 'closed' 
        AND t.completed_at IS NOT NULL
        AND t.scheduled_complete IS NOT NULL
        AND t.area_id = ${parseInt(area_id)}
        AND t.completed_by IS NOT NULL
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
 * Only shown when specific area is selected
 */
exports.getTicketResolveDurationByUser = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      area_id
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate || !area_id || area_id === 'all') {
      return res.status(400).json({
        success: false,
        message: 'startDate, endDate, and area_id (not "all") are required'
      });
    }

    // Get ticket resolve duration data by user for the specified period and area
    const resolveDurationByUserQuery = `
      SELECT 
        t.completed_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count,
        AVG(DATEDIFF(HOUR, t.created_at, t.completed_at)) as avg_resolve_hours
      FROM Tickets t
      INNER JOIN Person p ON t.completed_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}' 
        AND t.status = 'closed' 
        AND t.completed_at IS NOT NULL
        AND t.area_id = ${parseInt(area_id)}
        AND t.completed_by IS NOT NULL
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
 * Returns average resolve time from created_at to completed_at for closed tickets
 * Grouped by area using plant-area code format
 * Sorted from min to max (best performance first)
 * Only shown when "All Area" is selected
 */
exports.getTicketResolveDurationByArea = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Get ticket resolve duration data by area for the specified period
    const resolveDurationByAreaQuery = `
      SELECT 
        CONCAT(p.code, '-', a.code) as area_code,
        COUNT(t.id) as ticket_count,
        AVG(DATEDIFF(HOUR, t.created_at, t.completed_at)) as avg_resolve_hours
      FROM Tickets t
      LEFT JOIN Area a ON t.area_id = a.id
      LEFT JOIN Plant p ON a.plant_id = p.id
      WHERE t.created_at >= '${startDate}' 
        AND t.created_at <= '${endDate}' 
        AND t.status = 'closed' 
        AND t.completed_at IS NOT NULL
        AND a.code IS NOT NULL 
        AND p.code IS NOT NULL
      GROUP BY p.code, a.code
      HAVING COUNT(t.id) > 0
      ORDER BY avg_resolve_hours ASC
    `;

    const result = await pool.request().query(resolveDurationByAreaQuery);
    
    // Transform data for the chart
    const resolveDurationByAreaData = result.recordset.map(row => ({
      areaCode: row.area_code,
      avgResolveHours: Math.round(row.avg_resolve_hours * 100) / 100, // Round to 2 decimal places
      ticketCount: row.ticket_count
    }));

    res.json({
      success: true,
      data: {
        resolveDurationByAreaData,
        summary: {
          totalAreas: resolveDurationByAreaData.length,
          totalTickets: resolveDurationByAreaData.reduce((sum, item) => sum + item.ticketCount, 0),
          overallAvgResolveHours: resolveDurationByAreaData.length > 0 
            ? Math.round((resolveDurationByAreaData.reduce((sum, item) => sum + (item.avgResolveHours * item.ticketCount), 0) / resolveDurationByAreaData.reduce((sum, item) => sum + item.ticketCount, 0)) * 100) / 100
            : 0
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
 * This chart is affected by area filter and exact time range
 * Sorted by cost accumulation (max to min)
 */
exports.getCostImpactByFailureMode = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      area_id
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    if (area_id && area_id !== 'all') {
      whereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get cost impact data by failure mode for the specified period and area
    const costByFailureModeQuery = `
      SELECT 
        fm.FailureModeCode as failure_mode_code,
        fm.FailureModeName as failure_mode_name,
        COUNT(t.id) as case_count,
        SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
      FROM Tickets t
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
 * This chart is affected by area filter and exact time range
 * Sorted by downtime accumulation (max to min)
 */
exports.getDowntimeImpactByFailureMode = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      area_id
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    if (area_id && area_id !== 'all') {
      whereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get downtime impact data by failure mode for the specified period and area
    const downtimeByFailureModeQuery = `
      SELECT 
        fm.FailureModeCode as failure_mode_code,
        fm.FailureModeName as failure_mode_name,
        COUNT(t.id) as case_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
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
 * This chart is affected by time range and area filters
 */
exports.getCostImpactReporterLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      area_id
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause for tickets
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    if (area_id && area_id !== 'all') {
      whereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get cost impact data by reporter for the specified period and area
    const costImpactReporterQuery = `
      SELECT TOP 10
        t.reported_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.cost_avoidance, 0)) as total_cost_avoidance
      FROM Tickets t
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
 * This chart is affected by both time range and area filter
 */
exports.getDowntimeImpactReporterLeaderboard = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      startDate,
      endDate,
      area_id
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Build WHERE clause based on filters
    let whereClause = `WHERE t.created_at >= '${startDate}' AND t.created_at <= '${endDate}' AND t.status IN ('closed', 'resolved')`;
    if (area_id && area_id !== 'all') {
      whereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get downtime impact data by reporter for the specified period and area
    const downtimeImpactReporterQuery = `
      SELECT TOP 10
        t.reported_by as user_id,
        p.PERSON_NAME as user_name,
        u.AvatarUrl as avatar_url,
        COUNT(t.id) as ticket_count,
        SUM(ISNULL(t.downtime_avoidance_hours, 0)) as total_downtime_hours
      FROM Tickets t
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
            area_id: area_id ? parseInt(area_id) : null
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
 * This chart is affected by area filter and year (from time filter)
 */
exports.getCalendarHeatmapData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Extract query parameters
    const {
      year = new Date().getFullYear(),
      area_id
    } = req.query;

    // Build WHERE clause for tickets
    let whereClause = `WHERE YEAR(t.created_at) = ${parseInt(year)}`;
    
    if (area_id && area_id !== 'all') {
      whereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Get ticket counts by date for the specified year and area
    const calendarQuery = `
      SELECT 
        CAST(t.created_at AS DATE) as date,
        COUNT(t.id) as count
      FROM Tickets t
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
            area_id: area_id ? parseInt(area_id) : null
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
      area_id
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

    // Build WHERE clause for current period - use proper date comparison
    let currentWhereClause = `WHERE CAST(t.created_at AS DATE) >= '${startDate}' AND CAST(t.created_at AS DATE) <= '${endDate}'`;
    
    if (area_id) {
      currentWhereClause += ` AND t.area_id = ${parseInt(area_id)}`;
    }

    // Build WHERE clause for comparison period
    let compareWhereClause = '';
    if (compareStartDateFormatted && compareEndDateFormatted) {
      compareWhereClause = `WHERE CAST(t.created_at AS DATE) >= '${compare_startDate}' AND CAST(t.created_at AS DATE) <= '${compare_endDate}'`;
      
      if (area_id) {
        compareWhereClause += ` AND t.area_id = ${parseInt(area_id)}`;
      }
    }

    // Get current period KPIs
    const currentKPIsQuery = `
      SELECT 
        COUNT(*) as totalTickets,
        SUM(CASE WHEN t.status IN ('closed', 'completed') THEN 1 ELSE 0 END) as closedTickets,
        SUM(CASE WHEN t.status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as pendingTickets,
        ISNULL(SUM(t.downtime_avoidance_hours), 0) as totalDowntimeAvoidance,
        ISNULL(SUM(t.cost_avoidance), 0) as totalCostAvoidance
      FROM Tickets t
      ${currentWhereClause}
    `;

    // Get comparison period KPIs
    let compareKPIsQuery = '';
    if (compareWhereClause) {
      compareKPIsQuery = `
        SELECT 
          COUNT(*) as totalTickets,
          SUM(CASE WHEN t.status IN ('closed', 'completed') THEN 1 ELSE 0 END) as closedTickets,
          SUM(CASE WHEN t.status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as pendingTickets,
          ISNULL(SUM(t.downtime_avoidance_hours), 0) as totalDowntimeAvoidance,
          ISNULL(SUM(t.cost_avoidance), 0) as totalCostAvoidance
        FROM Tickets t
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
      LEFT JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${currentWhereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      ORDER BY ISNULL(SUM(t.cost_avoidance), 0) DESC
    `;

    const topDowntimeSaverQuery = `
      SELECT TOP 1
        t.reported_by as personno,
        p.PERSON_NAME as personName,
        u.AvatarUrl as avatarUrl,
        ISNULL(SUM(t.downtime_avoidance_hours), 0) as totalDowntimeSaved
      FROM Tickets t
      LEFT JOIN Person p ON t.reported_by = p.PERSONNO
      LEFT JOIN _secUsers u ON p.PERSONNO = u.PersonNo
      ${currentWhereClause}
      GROUP BY t.reported_by, p.PERSON_NAME, u.AvatarUrl
      ORDER BY ISNULL(SUM(t.downtime_avoidance_hours), 0) DESC
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
            area_id: area_id ? parseInt(area_id) : null
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
