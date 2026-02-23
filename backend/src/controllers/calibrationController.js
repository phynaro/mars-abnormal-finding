/**
 * Calibration Dashboard Controller
 * WOTypeNo = 5 (Calibration). Data from dbo.PM, dbo.PMSched, dbo.WO.
 * Due dates from PMSched.DUEDATE (target date). Audit allows completion up to 7 days after DUEDATE.
 * Classification: see helps/calibration-classification-guideline.md
 */

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

const WO_TYPE_CALIBRATION = 5;
/** WO status: 9 = history, 7 = finish (completed) */
const WO_STATUS_FINISHED = [7, 9];

/**
 * SQL Server 2008–compatible date expression (no TRY_CONVERT).
 * Parse 8-char (YYYYMMDD) or 10-char (YYYY-MM-DD) to date or NULL.
 */
function dateExprFromColumn(colName) {
  const c = `LTRIM(RTRIM(${colName}))`;
  return `(CASE WHEN LEN(${c}) = 8 AND ISDATE(STUFF(STUFF(${colName}, 5, 0, '-'), 8, 0, '-')) = 1 THEN CONVERT(date, STUFF(STUFF(${colName}, 5, 0, '-'), 8, 0, '-'), 23) WHEN LEN(${c}) >= 10 AND ISDATE(LEFT(${c}, 10)) = 1 THEN CONVERT(date, LEFT(${c}, 10), 23) ELSE NULL END)`;
}

/** WODATE 8-char to date expression (2008 compatible) */
function woDateExpr(colName) {
  return `(CASE WHEN ISDATE(STUFF(STUFF(${colName}, 5, 0, '-'), 8, 0, '-')) = 1 THEN CONVERT(date, STUFF(STUFF(${colName}, 5, 0, '-'), 8, 0, '-'), 23) ELSE NULL END)`;
}

/**
 * GET /api/dashboard/calibration/person-period-summary
 * Query: companyYear, assigneeId (optional)
 * Returns: assignees with periods array { period, periodNo, finished, remaining }
 */
exports.getPersonPeriodSummary = async (req, res) => {
  try {
    let { companyYear, assigneeId } = req.query;
    const pool = await sql.connect(dbConfig);

    if (!companyYear) {
      companyYear = new Date().getFullYear();
    }

    const dueDateExpr = dateExprFromColumn('s.DUEDATE');
    const actFinishExpr = dateExprFromColumn('wo.ACT_FINISH_D');

    // Finished per period: WO calibration (WOTYPENO=5), ASSIGN set, ACT_FINISH_D in period, status finished/history
    // Remaining per period: PMSched for calibration PM where DUEDATE in period and (no WO or WO not finished)
    const query = `
      WITH Periods AS (
        SELECT 1 AS PeriodNo UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
        UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13
      ),
      CompanyYearParam AS (SELECT CAST(@CompanyYear AS INT) AS cy),
      -- Finished: WO with WOTYPENO=5, status 7 or 9, by assignee and period of ACT_FINISH_D
      FinishedCTE AS (
        SELECT
          wo.ASSIGN AS assigneeId,
          p.PERSON_NAME AS assigneeName,
          dd.CompanyYear,
          dd.PeriodNo,
          COUNT(*) AS finished
        FROM dbo.WO wo
        INNER JOIN dbo.IgxDateDim dd ON dd.DateKey = ${actFinishExpr}
          AND dd.CompanyYear = (SELECT cy FROM CompanyYearParam)
        LEFT JOIN dbo.Person p ON p.PERSONNO = wo.ASSIGN
        WHERE wo.WOTYPENO = ${WO_TYPE_CALIBRATION}
          AND wo.ASSIGN IS NOT NULL AND wo.ASSIGN <> 0
          AND wo.WOSTATUSNO IN (7, 9)
          AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')
          AND (@AssigneeId IS NULL OR wo.ASSIGN = @AssigneeId)
        GROUP BY wo.ASSIGN, p.PERSON_NAME, dd.CompanyYear, dd.PeriodNo
      ),
      -- Remaining: PMSched for calibration PM, DUEDATE in period, (WONo IS NULL or WO not finished)
      RemainingCTE AS (
        SELECT
          COALESCE(wo.ASSIGN, pm.ASSIGN) AS assigneeId,
          p.PERSON_NAME AS assigneeName,
          dd.CompanyYear,
          dd.PeriodNo,
          COUNT(*) AS remaining
        FROM dbo.PMSched s
        INNER JOIN dbo.PM pm ON pm.PMNO = s.PMNO AND pm.WOTYPENO = ${WO_TYPE_CALIBRATION}
          AND (pm.FLAGDEL IS NULL OR pm.FLAGDEL <> 'Y')
        INNER JOIN dbo.IgxDateDim dd ON dd.DateKey = ${dueDateExpr}
          AND dd.CompanyYear = (SELECT cy FROM CompanyYearParam)
        LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
        LEFT JOIN dbo.Person p ON p.PERSONNO = COALESCE(wo.ASSIGN, pm.ASSIGN)
        WHERE (s.WONo IS NULL OR (wo.WOSTATUSNO NOT IN (7, 9) AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')))
          AND (COALESCE(wo.ASSIGN, pm.ASSIGN) IS NOT NULL AND COALESCE(wo.ASSIGN, pm.ASSIGN) <> 0)
          AND (@AssigneeId IS NULL OR COALESCE(wo.ASSIGN, pm.ASSIGN) = @AssigneeId)
          AND s.YearNo = (SELECT cy FROM CompanyYearParam)
        GROUP BY COALESCE(wo.ASSIGN, pm.ASSIGN), p.PERSON_NAME, dd.CompanyYear, dd.PeriodNo
      ),
      AllAssignees AS (
        SELECT assigneeId, assigneeName FROM FinishedCTE
        UNION
        SELECT assigneeId, assigneeName FROM RemainingCTE
      )
      SELECT
        a.assigneeId,
        a.assigneeName,
        pr.PeriodNo,
        'P' + CAST(pr.PeriodNo AS VARCHAR(10)) AS period,
        ISNULL(f.finished, 0) AS finished,
        ISNULL(r.remaining, 0) AS remaining
      FROM AllAssignees a
      CROSS JOIN Periods pr
      LEFT JOIN FinishedCTE f ON f.assigneeId = a.assigneeId AND f.PeriodNo = pr.PeriodNo
      LEFT JOIN RemainingCTE r ON r.assigneeId = a.assigneeId AND r.PeriodNo = pr.PeriodNo
      ORDER BY a.assigneeName, pr.PeriodNo
    `;

    const request = pool.request();
    request.input('CompanyYear', sql.Int, parseInt(companyYear, 10));
    request.input('AssigneeId', sql.Int, assigneeId ? parseInt(assigneeId, 10) : null);

    const result = await request.query(query);
    const rows = result.recordset || [];

    // Group by assignee
    const byAssignee = new Map();
    for (const row of rows) {
      const key = row.assigneeId;
      if (!byAssignee.has(key)) {
        byAssignee.set(key, {
          assigneeId: row.assigneeId,
          assigneeName: row.assigneeName || `User ${row.assigneeId}`,
          periods: []
        });
      }
      byAssignee.get(key).periods.push({
        period: row.period,
        periodNo: row.PeriodNo,
        finished: row.finished,
        remaining: row.remaining
      });
    }

    res.json({
      success: true,
      data: {
        assignees: Array.from(byAssignee.values()),
        companyYear: companyYear ? parseInt(companyYear, 10) : null
      }
    });
  } catch (error) {
    console.error('Error in getPersonPeriodSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration person-period summary',
      error: error.message
    });
  }
};

/**
 * GET /api/dashboard/calibration/incoming
 * Due this week: DUEDATE in [today, today+N]. Default N=7. Query: days, page, limit.
 */
exports.getIncoming = async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 14));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const startRow = offset + 1;
    const endRow = offset + limit;
    const yearNo = req.query.year != null || req.query.companyYear != null
      ? parseInt(req.query.year || req.query.companyYear, 10)
      : null;

    const pool = await sql.connect(dbConfig);
    const dueExpr = dateExprFromColumn('s.DUEDATE');
    const yearFilter = yearNo != null && !Number.isNaN(yearNo) ? 'AND s.YearNo = @YearNo' : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.PMSched s
      INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
        AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
      LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
      WHERE ${dueExpr} >= CAST(GETDATE() AS DATE)
        AND ${dueExpr} <= DATEADD(day, @Days, CAST(GETDATE() AS DATE))
        ${yearFilter}
    `;
    const countReq = pool.request().input('Days', sql.Int, days);
    if (yearNo != null && !Number.isNaN(yearNo)) countReq.input('YearNo', sql.Int, yearNo);
    const countResult = await countReq.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    const dataQuery = `
      SELECT PMSchNo, PMNO, DUEDATE, WONo, SchedWOStatusNo AS WOStatusNo, PMCODE, PMNAME, WOCODE, woStatusNo
      FROM (
        SELECT
          s.PMSchNo,
          s.PMNO,
          s.DUEDATE,
          s.WONo,
          s.WOStatusNo AS SchedWOStatusNo,
          p.PMCODE,
          p.PMNAME,
          wo.WOCODE,
          wo.WOSTATUSNO AS woStatusNo,
          ROW_NUMBER() OVER (ORDER BY ${dueExpr}, s.PMSchNo) AS RowNum
        FROM dbo.PMSched s
        INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
          AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
        LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
        WHERE ${dueExpr} >= CAST(GETDATE() AS DATE)
          AND ${dueExpr} <= DATEADD(day, @Days, CAST(GETDATE() AS DATE))
          ${yearFilter}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `;
    const dataRequest = pool.request()
      .input('Days', sql.Int, days)
      .input('StartRow', sql.Int, startRow)
      .input('EndRow', sql.Int, endRow);
    if (yearNo != null && !Number.isNaN(yearNo)) dataRequest.input('YearNo', sql.Int, yearNo);
    const result = await dataRequest.query(dataQuery);

    res.json({
      success: true,
      data: {
        items: result.recordset || [],
        days,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getIncoming:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incoming calibration',
      error: error.message
    });
  }
};

/**
 * GET /api/dashboard/calibration/late
 * Late (within grace): target date passed but still within 7-day grace.
 * DUEDATE in [today-7, today). Audit deadline = DUEDATE+7. Query: page, limit.
 */
exports.getLate = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;
    const yearNo = req.query.year != null || req.query.companyYear != null
      ? parseInt(req.query.year || req.query.companyYear, 10)
      : null;

    const pool = await sql.connect(dbConfig);
    const dueExpr = dateExprFromColumn('s.DUEDATE');
    const yearFilter = yearNo != null && !Number.isNaN(yearNo) ? 'AND s.YearNo = @YearNo' : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.PMSched s
      INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
        AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
      LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
      WHERE ${dueExpr} >= DATEADD(day, -7, CAST(GETDATE() AS DATE))
        AND ${dueExpr} < CAST(GETDATE() AS DATE)
        ${yearFilter}
    `;
    const countReq = pool.request();
    if (yearNo != null && !Number.isNaN(yearNo)) countReq.input('YearNo', sql.Int, yearNo);
    const countResult = await countReq.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    const dataQuery = `
      SELECT PMSchNo, PMNO, DUEDATE, WONo, SchedWOStatusNo AS WOStatusNo, PMCODE, PMNAME, WOCODE, woStatusNo, daysPastTarget, completeBy
      FROM (
        SELECT
          s.PMSchNo,
          s.PMNO,
          s.DUEDATE,
          s.WONo,
          s.WOStatusNo AS SchedWOStatusNo,
          p.PMCODE,
          p.PMNAME,
          wo.WOCODE,
          wo.WOSTATUSNO AS woStatusNo,
          DATEDIFF(day, ${dueExpr}, CAST(GETDATE() AS DATE)) AS daysPastTarget,
          CAST(DATEADD(day, 7, ${dueExpr}) AS DATE) AS completeBy,
          ROW_NUMBER() OVER (ORDER BY ${dueExpr}, s.PMSchNo) AS RowNum
        FROM dbo.PMSched s
        INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
          AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
        LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
        WHERE ${dueExpr} >= DATEADD(day, -7, CAST(GETDATE() AS DATE))
          AND ${dueExpr} < CAST(GETDATE() AS DATE)
          ${yearFilter}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `;
    const result = pool.request()
      .input('StartRow', sql.Int, startRow)
      .input('EndRow', sql.Int, endRow);
    if (yearNo != null && !Number.isNaN(yearNo)) result.input('YearNo', sql.Int, yearNo);
    const dataResult = await result.query(dataQuery);

    res.json({
      success: true,
      data: {
        items: dataResult.recordset || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getLate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration late (within grace)',
      error: error.message
    });
  }
};

/**
 * GET /api/dashboard/calibration/due-soon
 * Due soon = DUEDATE in (today+7, today+14]. Query: page (default 1), limit (default 20).
 */
exports.getDueSoon = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;
    const yearNo = req.query.year != null || req.query.companyYear != null
      ? parseInt(req.query.year || req.query.companyYear, 10)
      : null;

    const pool = await sql.connect(dbConfig);
    const dueExpr = dateExprFromColumn('s.DUEDATE');
    const yearFilter = yearNo != null && !Number.isNaN(yearNo) ? 'AND s.YearNo = @YearNo' : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.PMSched s
      INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
        AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
      LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
      WHERE ${dueExpr} > DATEADD(day, 7, CAST(GETDATE() AS DATE))
        AND ${dueExpr} <= DATEADD(day, 14, CAST(GETDATE() AS DATE))
        ${yearFilter}
    `;
    const countReq = pool.request();
    if (yearNo != null && !Number.isNaN(yearNo)) countReq.input('YearNo', sql.Int, yearNo);
    const countResult = await countReq.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    const dataQuery = `
      SELECT PMSchNo, PMNO, DUEDATE, WONo, SchedWOStatusNo AS WOStatusNo, PMCODE, PMNAME, WOCODE, woStatusNo
      FROM (
        SELECT
          s.PMSchNo,
          s.PMNO,
          s.DUEDATE,
          s.WONo,
          s.WOStatusNo AS SchedWOStatusNo,
          p.PMCODE,
          p.PMNAME,
          wo.WOCODE,
          wo.WOSTATUSNO AS woStatusNo,
          ROW_NUMBER() OVER (ORDER BY ${dueExpr}, s.PMSchNo) AS RowNum
        FROM dbo.PMSched s
        INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
          AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
        LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
        WHERE ${dueExpr} > DATEADD(day, 7, CAST(GETDATE() AS DATE))
          AND ${dueExpr} <= DATEADD(day, 14, CAST(GETDATE() AS DATE))
          ${yearFilter}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `;
    const dataReq = pool.request()
      .input('StartRow', sql.Int, startRow)
      .input('EndRow', sql.Int, endRow);
    if (yearNo != null && !Number.isNaN(yearNo)) dataReq.input('YearNo', sql.Int, yearNo);
    const dataResult = await dataReq.query(dataQuery);

    res.json({
      success: true,
      data: {
        items: dataResult.recordset || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getDueSoon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration due soon',
      error: error.message
    });
  }
};

/**
 * GET /api/dashboard/calibration/overdue
 * Overdue = DUEDATE < today - 7 days. Include days overdue. Query: page (default 1), limit (default 20).
 */
exports.getOverdue = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;
    const yearNo = req.query.year != null || req.query.companyYear != null
      ? parseInt(req.query.year || req.query.companyYear, 10)
      : null;

    const pool = await sql.connect(dbConfig);
    const dueExpr = dateExprFromColumn('s.DUEDATE');
    const yearFilter = yearNo != null && !Number.isNaN(yearNo) ? 'AND s.YearNo = @YearNo' : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.PMSched s
      INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
        AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
      LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
      WHERE ${dueExpr} < DATEADD(day, -7, CAST(GETDATE() AS DATE))
        ${yearFilter}
    `;
    const countReq = pool.request();
    if (yearNo != null && !Number.isNaN(yearNo)) countReq.input('YearNo', sql.Int, yearNo);
    const countResult = await countReq.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    const dataQuery = `
      SELECT PMSchNo, PMNO, DUEDATE, WONo, SchedWOStatusNo AS WOStatusNo, PMCODE, PMNAME, WOCODE, woStatusNo, daysOverdue
      FROM (
        SELECT
          s.PMSchNo,
          s.PMNO,
          s.DUEDATE,
          s.WONo,
          s.WOStatusNo AS SchedWOStatusNo,
          p.PMCODE,
          p.PMNAME,
          wo.WOCODE,
          wo.WOSTATUSNO AS woStatusNo,
          DATEDIFF(day, ${dueExpr}, CAST(GETDATE() AS DATE)) AS daysOverdue,
          ROW_NUMBER() OVER (ORDER BY ${dueExpr}, s.PMSchNo) AS RowNum
        FROM dbo.PMSched s
        INNER JOIN dbo.PM p ON p.PMNO = s.PMNO AND p.WOTYPENO = ${WO_TYPE_CALIBRATION}
          AND (p.FLAGDEL IS NULL OR p.FLAGDEL <> 'Y')
        LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo
        WHERE ${dueExpr} < DATEADD(day, -7, CAST(GETDATE() AS DATE))
          ${yearFilter}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `;
    const dataReq = pool.request()
      .input('StartRow', sql.Int, startRow)
      .input('EndRow', sql.Int, endRow);
    if (yearNo != null && !Number.isNaN(yearNo)) dataReq.input('YearNo', sql.Int, yearNo);
    const dataResult = await dataReq.query(dataQuery);

    res.json({
      success: true,
      data: {
        items: dataResult.recordset || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getOverdue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration overdue',
      error: error.message
    });
  }
};

/**
 * GET /api/dashboard/calibration/jobs
 * Paginated list of calibration WOs (WOTYPENO=5). Query: page, limit, search, status, assignee, dateFrom, dateTo
 */
exports.getJobs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const status = req.query.status;
    const assignee = req.query.assignee;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    const pool = await sql.connect(dbConfig);

    let whereClause = ` WHERE wo.WOTYPENO = ${WO_TYPE_CALIBRATION} AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')`;

    const addInputs = (req) => {
      if (search) req.input('Search', sql.NVarChar(100), `%${search}%`);
      if (status !== undefined && status !== '') req.input('Status', sql.Int, parseInt(status, 10));
      if (assignee !== undefined && assignee !== '') req.input('Assignee', sql.Int, parseInt(assignee, 10));
      if (dateFrom) req.input('DateFrom', sql.Date, dateFrom);
      if (dateTo) req.input('DateTo', sql.Date, dateTo);
    };

    if (search) {
      whereClause += ` AND (wo.WOCODE LIKE @Search OR wo.WO_PLAN LIKE @Search OR wo.WO_PROBLEM LIKE @Search)`;
    }
    if (status !== undefined && status !== '') {
      whereClause += ` AND wo.WOSTATUSNO = @Status`;
    }
    if (assignee !== undefined && assignee !== '') {
      whereClause += ` AND wo.ASSIGN = @Assignee`;
    }
    if (dateFrom) {
      whereClause += ` AND ${woDateExpr('wo.WODATE')} >= @DateFrom`;
    }
    if (dateTo) {
      whereClause += ` AND ${woDateExpr('wo.WODATE')} <= @DateTo`;
    }

    const countRequest = pool.request();
    addInputs(countRequest);
    const countResult = await countRequest.query(`
      SELECT COUNT(*) AS total FROM dbo.WO wo
      LEFT JOIN dbo.Person p ON p.PERSONNO = wo.ASSIGN
      ${whereClause}
    `);
    const total = countResult.recordset[0]?.total || 0;

    const dataRequest = pool.request();
    addInputs(dataRequest);
    const startRow = offset + 1;       /* 1-based start row */
    const endRow = offset + limit;     /* 1-based end row (inclusive) */
    dataRequest.input('StartRow', sql.Int, startRow);
    dataRequest.input('EndRow', sql.Int, endRow);
    const dataResult = await dataRequest.query(`
      SELECT id, woCode, woDate, woStatusNo, PMNO, assigneeId, assigneeName
      FROM (
        SELECT
          wo.WONO AS id,
          wo.WOCODE AS woCode,
          wo.WODATE AS woDate,
          wo.WOSTATUSNO AS woStatusNo,
          wo.PMNO,
          wo.ASSIGN AS assigneeId,
          p.PERSON_NAME AS assigneeName,
          ROW_NUMBER() OVER (ORDER BY wo.WODATE DESC, wo.WONO DESC) AS RowNum
        FROM dbo.WO wo
        LEFT JOIN dbo.Person p ON p.PERSONNO = wo.ASSIGN
        ${whereClause}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `);

    res.json({
      success: true,
      data: {
        workOrders: dataResult.recordset || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getJobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration jobs',
      error: error.message
    });
  }
};

/**
 * GET /api/dashboard/calibration/pm-plans
 * List PM plans for calibration (WOTYPENO=5) with frequency. Query: page, limit.
 */
exports.getPmPlans = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;

    const pool = await sql.connect(dbConfig);

    const countResult = await pool.request().query(`
      SELECT COUNT(*) AS total FROM dbo.PM pm
      WHERE pm.WOTYPENO = ${WO_TYPE_CALIBRATION}
        AND (pm.FLAGDEL IS NULL OR pm.FLAGDEL <> 'Y')
    `);
    const total = countResult.recordset[0]?.total || 0;

    const request = pool.request();
    request.input('StartRow', sql.Int, startRow);
    request.input('EndRow', sql.Int, endRow);
    const result = await request.query(`
      SELECT PMNO, PMCODE, PMNAME, FREQUENCY, FREQUNITNO, nextDueD, lastDoneD, EQNO, PUNO
      FROM (
        SELECT
          pm.PMNO,
          pm.PMCODE,
          pm.PMNAME,
          pm.FREQUENCY,
          pm.FREQUNITNO,
          pm.NEXTDUE_D AS nextDueD,
          pm.LASTDONE_D AS lastDoneD,
          pm.EQNO,
          pm.PUNO,
          ROW_NUMBER() OVER (ORDER BY pm.PMCODE) AS RowNum
        FROM dbo.PM pm
        WHERE pm.WOTYPENO = ${WO_TYPE_CALIBRATION}
          AND (pm.FLAGDEL IS NULL OR pm.FLAGDEL <> 'Y')
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `);

    res.json({
      success: true,
      data: {
        items: result.recordset || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getPmPlans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration PM plans',
      error: error.message
    });
  }
};
