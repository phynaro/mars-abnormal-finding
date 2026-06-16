/**
 * EMS Schedule Controller — PM calibration schedule list (registry-scoped).
 */

const sql = require('mssql');
const { getCedarPool } = require('../../config/getCedarPool');
const {
  getPMCalSched,
  getPMCalSchedCoreWhere,
  eqTypeKeyExpr,
} = require('../../helpers/pmCalibrationScheduleQuery');
const {
  applyEmsPlantAreaFilters,
  paginationMeta,
  WO_FINISHED_SQL,
  plantFromTagExpr,
  timeToMinutesExpr,
} = require('../../helpers/emsQueryHelpers');

const WO_STATUS_HISTORY = 9;

function scheduleStatusLabel(row) {
  if ((row?.schedWOStatusNo ?? null) === WO_STATUS_HISTORY || (row?.woStatusNo ?? null) === WO_STATUS_HISTORY) {
    return 'Done';
  }
  if ((row?.WONo ?? null) != null && row.WONo > 0) {
    return 'In Progress';
  }
  return 'Pending';
}

function mapScheduleItem(row, dueExpr) {
  const daysUntilDue = row.daysUntilDue;
  return {
    tagNo: row.tagNo,
    description: row.description,
    area: row.area,
    plant: row.plant,
    woNo: row.WONo ?? null,
    woCode: row.WOCODE ?? null,
    woStatus: scheduleStatusLabel(row),
    dueDate: row.DUEDATE,
    daysUntilDue,
    daysOverdue: daysUntilDue != null && daysUntilDue < 0 ? Math.abs(daysUntilDue) : null,
    assignedCalibrator: row.assigneeName || null,
    assigneeId: row.assigneeId ?? null,
    pmSchNo: row.PMSchNo,
  };
}

function applyWoStatusFilter(query, parts) {
  const woStatus = query.woStatus != null ? String(query.woStatus).trim().toLowerCase() : '';
  if (!woStatus || woStatus === 'all') return;

  if (woStatus === 'done') {
    parts.push(`(${WO_FINISHED_SQL})`);
    return;
  }
  if (woStatus === 'in-progress') {
    parts.push(`s.WONo > 0 AND NOT (${WO_FINISHED_SQL})`);
    return;
  }
  if (woStatus === 'pending') {
    parts.push(`(s.WONo IS NULL OR s.WONo <= 0) AND NOT (${WO_FINISHED_SQL})`);
  }
}

function buildEmsScheduleWhere(request, query) {
  const { applyPmCalSchedNonDateFilters, applyPmCalSchedDateRangeClause } = require('../../helpers/pmCalibrationScheduleQuery');
  // Plant/area are scoped via IgxEQExtension tag (applyEmsPlantAreaFilters), not PMCODE prefix.
  const { plant: _plant, area: _area, ...pmQuery } = query;
  const base = applyPmCalSchedNonDateFilters(request, pmQuery);
  if (base.error) return { error: base.error };

  const parts = [...base.parts];
  const dueFrom = query.dueFrom || query.startDate;
  const dueTo = query.dueTo || query.endDate;

  if (dueFrom && dueTo) {
    const range = applyPmCalSchedDateRangeClause(request, {
      startDate: dueFrom,
      endDate: dueTo,
      startParamName: 'EmsDueFrom',
      endParamName: 'EmsDueTo',
    });
    if (range.error) return { error: range.error };
    parts.push(range.clause);
  }

  parts.push(`EXISTS (SELECT 1 FROM dbo.IgxEQExtension extc WHERE extc.eqno = eq.EQNO)`);
  parts.push(...applyEmsPlantAreaFilters(request, query, { extAlias: 'ext' }));
  applyWoStatusFilter(query, parts);

  return { whereFragment: parts.join(' AND '), dueDateExpr: base.dueDateExpr, error: null };
}

/**
 * GET /api/ems/schedule
 */
exports.getScheduleList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;

    const pool = await getCedarPool();

    const countReq = pool.request();
    const builtCount = buildEmsScheduleWhere(countReq, req.query);
    if (builtCount.error) {
      return res.status(400).json({ success: false, message: builtCount.error });
    }

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const countWhere = builtCount.whereFragment;

    const countSql = `
      SELECT COUNT(*) AS total
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      WHERE ${countWhere}
    `;
    const countResult = await countReq.query(countSql);
    const total = countResult.recordset[0]?.total || 0;

    const dataReq = pool.request();
    const builtData = buildEmsScheduleWhere(dataReq, req.query);
    if (builtData.error) {
      return res.status(400).json({ success: false, message: builtData.error });
    }

    dataReq.input('StartRow', sql.Int, startRow);
    dataReq.input('EndRow', sql.Int, endRow);

    const dueExpr = builtData.dueDateExpr;
    const woFinishDateExpr = `(
      CASE
        WHEN LEN(LTRIM(RTRIM(wo.SCH_FINISH_D))) = 8 AND ISDATE(STUFF(STUFF(wo.SCH_FINISH_D, 5, 0, '-'), 8, 0, '-')) = 1 THEN CONVERT(date, STUFF(STUFF(wo.SCH_FINISH_D, 5, 0, '-'), 8, 0, '-'), 23)
        WHEN LEN(LTRIM(RTRIM(wo.SCH_FINISH_D))) >= 10 AND ISDATE(LEFT(wo.SCH_FINISH_D, 10)) = 1 THEN CONVERT(date, LEFT(wo.SCH_FINISH_D, 10), 23)
        ELSE NULL
      END
    )`;
    const effectiveDueDateTimeExpr = `COALESCE(
      CASE
        WHEN s.WONo > 0 AND wo.WONO IS NOT NULL AND ${woFinishDateExpr} IS NOT NULL
        THEN DATEADD(minute, ${timeToMinutesExpr('wo.SCH_FINISH_T')}, CAST(${woFinishDateExpr} AS DATETIME))
        ELSE NULL
      END,
      CAST(${dueExpr} AS DATETIME)
    )`;
    const dataWhere = builtData.whereFragment;

    const dataSql = `
      SELECT *
      FROM (
        SELECT
          ext.tag_no AS tagNo,
          ISNULL(ext.description, eq.EQNAME) AS description,
          ext.location AS area,
          ${plantFromTagExpr('ext.tag_no')} AS plant,
          ${effectiveDueDateTimeExpr} AS DUEDATE,
          s.WONo,
          s.WOStatusNo AS schedWOStatusNo,
          wo.WOSTATUSNO AS woStatusNo,
          wo.WOCODE,
          pm.ASSIGN AS assigneeId,
          LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName,
          CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
          DATEDIFF(day, GETDATE(), ${effectiveDueDateTimeExpr}) AS daysUntilDue,
          ROW_NUMBER() OVER (ORDER BY ${effectiveDueDateTimeExpr}, s.PMNO) AS RowNum
        ${fromJoinPm}
        ${leftJoinEq}
        ${leftJoinWo}
        INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
        LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
        WHERE ${dataWhere}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `;

    const dataResult = await dataReq.query(dataSql);
    const items = (dataResult.recordset || []).map((row) => mapScheduleItem(row, dueExpr));

    res.json({
      success: true,
      data: { items, pagination: paginationMeta(page, limit, total) },
      message: 'EMS schedule list',
    });
  } catch (error) {
    console.error('EMS getScheduleList error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS schedule', error: error.message });
  }
};

/**
 * GET /api/ems/schedule/kpi
 */
exports.getScheduleKpi = async (req, res) => {
  try {
    const pool = await getCedarPool();
    const request = pool.request();
    const built = buildEmsScheduleWhere(request, req.query);
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const whereFragment = built.whereFragment;

    const kpiSql = `
      SELECT
        COUNT(*) AS totalSchedules,
        ISNULL(SUM(CASE WHEN ${WO_FINISHED_SQL} THEN 1 ELSE 0 END), 0) AS completed
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      WHERE ${whereFragment}
    `;

    const result = await request.query(kpiSql);
    const row = result.recordset[0] || {};

    res.json({
      success: true,
      data: {
        totalSchedules: row.totalSchedules ?? 0,
        completed: row.completed ?? 0,
        remaining: (row.totalSchedules ?? 0) - (row.completed ?? 0),
      },
      message: 'EMS schedule KPI',
    });
  } catch (error) {
    console.error('EMS getScheduleKpi error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS schedule KPI', error: error.message });
  }
};

/**
 * GET /api/ems/schedule/calendar-range
 * Registry-scoped PM rows for react-big-calendar (same shape as Calibration V2).
 */
exports.getScheduleCalendarRange = async (req, res) => {
  try {
    const viewStartDate = req.query.viewStartDate;
    const viewEndDate = req.query.viewEndDate;
    if (!viewStartDate || !viewEndDate) {
      return res.status(400).json({
        success: false,
        message: 'viewStartDate and viewEndDate are required (YYYY-MM-DD)',
      });
    }

    const pool = await getCedarPool();
    const request = pool.request();
    const built = buildEmsScheduleWhere(request, {
      ...req.query,
      dueFrom: viewStartDate,
      dueTo: viewEndDate,
    });
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const typeKeySel = eqTypeKeyExpr('eq');
    const dueExpr = built.dueDateExpr;

    const sqlText = `
      SELECT
        CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
        s.PMNO,
        s.DUEDATE,
        s.WONo,
        s.WOStatusNo AS schedWOStatusNo,
        ext.tag_no AS PMCODE,
        ISNULL(ext.description, eq.EQNAME) AS PMNAME,
        pm.DEPTNO,
        pm.ASSIGN AS assigneeId,
        LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName,
        wo.WOCODE,
        wo.WOSTATUSNO AS woStatusNo,
        ext.tag_no AS EQCODE,
        ${typeKeySel} AS eqTypeKey
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
      WHERE ${built.whereFragment}
      ORDER BY ${dueExpr}, s.PMNO
    `;

    const result = await request.query(sqlText);
    const items = result.recordset || [];

    res.json({
      success: true,
      data: {
        items,
        rangeStart: viewStartDate,
        rangeEnd: viewEndDate,
        count: items.length,
      },
      message: 'EMS schedule calendar range',
    });
  } catch (error) {
    console.error('EMS getScheduleCalendarRange error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMS schedule calendar range',
      error: error.message,
    });
  }
};

/**
 * GET /api/ems/schedule/assignees — distinct PM assignees for registry equipment.
 */
exports.getScheduleAssignees = async (req, res) => {
  try {
    const pool = await getCedarPool();
    const { fromJoinPm, leftJoinEq } = getPMCalSched();
    const sqlText = `
      SELECT DISTINCT
        pm.ASSIGN AS id,
        COALESCE(
          NULLIF(LTRIM(RTRIM(ISNULL(per.FIRSTNAME,'') + ' ' + ISNULL(per.LASTNAME,''))), N''),
          N'User ' + CAST(pm.ASSIGN AS nvarchar(20))
        ) AS name
      ${fromJoinPm}
      ${leftJoinEq}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      LEFT JOIN dbo.Person per ON per.PERSONNO = pm.ASSIGN
      WHERE ${getPMCalSchedCoreWhere()}
        AND pm.ASSIGN IS NOT NULL
        AND pm.ASSIGN <> 0
      ORDER BY name
    `;
    const result = await pool.request().query(sqlText);
    const users = (result.recordset || []).map((row) => ({
      id: row.id,
      name: row.name,
    }));
    res.json({
      success: true,
      data: { users },
      message: 'EMS schedule assignees',
    });
  } catch (error) {
    console.error('EMS getScheduleAssignees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMS schedule assignees',
      error: error.message,
    });
  }
};
