/**
 * EMS Dashboard Controller — KPI tiles and overdue / due-soon panels.
 * Scoped to dbo.IgxEQExtension registry (287 equipment).
 */

const sql = require('mssql');
const { getCedarPool } = require('../../config/getCedarPool');
const {
  dateExprFromColumn,
  emsEquipmentFromJoin,
  openCalApplySql,
  applyEmsPlantAreaFilters,
  paginationMeta,
  WO_FINISHED_SQL,
  plantFromTagExpr,
  PM_CAL_PLANTS,
  weekDeadlineExpr,
  timeToMinutesExpr,
} = require('../../helpers/emsQueryHelpers');
const {
  EMS_DUE_SOON_MAX_DAYS,
} = require('../../constants/emsConstants');

const {
  getPMCalSchedCoreWhere,
  getPMCalSched,
  applyPmCalSchedDateRangeClause,
} = require('../../helpers/pmCalibrationScheduleQuery');

function buildRegistryWhere(request, query) {
  const parts = applyEmsPlantAreaFilters(request, query);
  return parts.length ? parts.join(' AND ') : '1=1';
}

function mapDashboardItem(row) {
  return {
    tagNo: row.tagNo,
    description: row.description,
    area: row.area,
    plant: row.plant,
    daysOverdue: row.daysOverdue ?? null,
    daysUntilDue: row.daysUntilDue ?? null,
    dueDate: row.dueDateRaw,
    woNo: row.WONo ?? null,
    woCode: row.WOCODE ?? null,
    assigneeId: row.assigneeId ?? null,
    assigneeName: row.assigneeName ?? null,
    pmSchNo: row.PMSchNo ?? null,
  };
}

/**
 * GET /api/ems/dashboard/kpi
 */
exports.getKpi = async (req, res) => {
  try {
    const pool = await getCedarPool();
    const request = pool.request();
    const registryWhere = buildRegistryWhere(request, req.query);
    const bucketExpr = `(
      CASE
        WHEN cal.DUEDATE IS NULL THEN 'no_wo'
        WHEN cal.schedWOStatusNo = 9 OR (cal.WONo > 0 AND cal.woStatusNo IN (7, 9)) THEN 'ok'
        WHEN cal.dueDateTime IS NULL THEN 'no_wo'
        WHEN cal.dueDateTime < GETDATE() THEN 'overdue'
        WHEN cal.dueDateTime >= GETDATE() AND cal.dueDateTime < ${weekDeadlineExpr()} THEN 'due_this_week'
        WHEN cal.dueDateTime >= ${weekDeadlineExpr()} AND cal.dueDateTime < DATEADD(day, ${EMS_DUE_SOON_MAX_DAYS}, ${weekDeadlineExpr()}) THEN 'due_soon'
        ELSE 'ok'
      END
    )`;

    const sqlText = `
      SELECT ${bucketExpr} AS bucket, COUNT(*) AS cnt
      ${emsEquipmentFromJoin()}
      ${openCalApplySql()}
      WHERE ${registryWhere}
      GROUP BY ${bucketExpr}
    `;

    const result = await request.query(sqlText);
    const counts = {
      totalEquipment: 0,
      overdue: 0,
      dueThisWeek: 0,
      dueSoon: 0,
      ok: 0,
      noWo: 0,
    };

    for (const row of result.recordset || []) {
      counts.totalEquipment += row.cnt;
      switch (row.bucket) {
        case 'overdue': counts.overdue += row.cnt; break;
        case 'due_this_week': counts.dueThisWeek += row.cnt; break;
        case 'due_soon': counts.dueSoon += row.cnt; break;
        case 'ok': counts.ok += row.cnt; break;
        case 'no_wo': counts.noWo += row.cnt; break;
        default: break;
      }
    }

    res.json({
      success: true,
      data: {
        totalEquipment: counts.totalEquipment,
        overdue: counts.overdue,
        dueThisWeek: counts.dueThisWeek,
        dueSoon: counts.dueSoon,
        ok: counts.ok,
        noWo: counts.noWo,
      },
      message: 'EMS dashboard KPI',
    });
  } catch (error) {
    console.error('EMS getKpi error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS dashboard KPI', error: error.message });
  }
};

async function fetchSchedulePanel(req, res, windowClause, orderBy) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const startRow = (page - 1) * limit + 1;
  const endRow = (page - 1) * limit + limit;

  const pool = await getCedarPool();
  const dueExpr = dateExprFromColumn('s.DUEDATE');
  const woFinishDateExpr = dateExprFromColumn('wo.SCH_FINISH_D');
  const woFinishMinutesExpr = timeToMinutesExpr('wo.SCH_FINISH_T');
  const woDueDateTimeExpr = `(
    CASE
      WHEN s.WONo > 0 AND wo.WONO IS NOT NULL AND ${woFinishDateExpr} IS NOT NULL
      THEN DATEADD(minute, ${woFinishMinutesExpr}, CAST(${woFinishDateExpr} AS DATETIME))
      ELSE NULL
    END
  )`;
  const effectiveDueDateTimeExpr = `COALESCE(${woDueDateTimeExpr}, CAST(${dueExpr} AS DATETIME))`;
  const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();

  const countReq = pool.request();
  const registryFilters = applyEmsPlantAreaFilters(countReq, req.query, { extAlias: 'ext' });
  const whereFragment = [
    getPMCalSchedCoreWhere(),
    `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,
    windowClause,
    `NOT ${WO_FINISHED_SQL}`,
    ...registryFilters,
  ].join(' AND ');

  const countSql = `
    SELECT COUNT(*) AS total
    ${fromJoinPm}
    ${leftJoinEq}
    ${leftJoinWo}
    INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
    WHERE ${whereFragment}
  `;
  const countResult = await countReq.query(countSql);
  const total = countResult.recordset[0]?.total || 0;

  const dataReq = pool.request();
  const dataFilters = applyEmsPlantAreaFilters(dataReq, req.query, { extAlias: 'ext' });
  const dataWhere = [
    getPMCalSchedCoreWhere(),
    `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,
    windowClause,
    `NOT ${WO_FINISHED_SQL}`,
    ...dataFilters,
  ].join(' AND ');

  dataReq.input('StartRow', sql.Int, startRow);
  dataReq.input('EndRow', sql.Int, endRow);

  const dataSql = `
    SELECT tagNo, description, area, plant, daysOverdue, daysUntilDue, dueDateRaw, WONo, WOCODE,
           assigneeId, assigneeName, PMSchNo
    FROM (
      SELECT
        ext.tag_no AS tagNo,
        ISNULL(ext.description, eq.EQNAME) AS description,
        ext.location AS area,
        ${plantFromTagExpr('ext.tag_no')} AS plant,
        CASE WHEN ${effectiveDueDateTimeExpr} < GETDATE()
          THEN DATEDIFF(day, ${effectiveDueDateTimeExpr}, GETDATE()) ELSE NULL END AS daysOverdue,
        DATEDIFF(day, GETDATE(), ${effectiveDueDateTimeExpr}) AS daysUntilDue,
        s.DUEDATE AS dueDateRaw,
        s.WONo,
        wo.WOCODE,
        pm.ASSIGN AS assigneeId,
        LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName,
        CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNum
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
  const items = (dataResult.recordset || []).map(mapDashboardItem);

  res.json({
    success: true,
    data: { items, pagination: paginationMeta(page, limit, total) },
    message: 'EMS dashboard panel',
  });
}

/**
 * GET /api/ems/dashboard/overdue
 */
exports.getOverdue = async (req, res) => {
  try {
    const dueExpr = dateExprFromColumn('s.DUEDATE');
    await fetchSchedulePanel(
      req,
      res,
      `${dueExpr} < CAST(GETDATE() AS DATE)`,
      `DATEDIFF(day, ${dueExpr}, CAST(GETDATE() AS DATE)) DESC, ${dueExpr} ASC`
    );
  } catch (error) {
    console.error('EMS getOverdue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS overdue list', error: error.message });
  }
};

/**
 * GET /api/ems/dashboard/due-this-week — due within 0–7 days
 */
exports.getDueThisWeek = async (req, res) => {
  try {
    const dueExpr = `COALESCE(
      CASE
        WHEN s.WONo > 0 AND wo.WONO IS NOT NULL AND ${dateExprFromColumn('wo.SCH_FINISH_D')} IS NOT NULL
        THEN DATEADD(minute, ${timeToMinutesExpr('wo.SCH_FINISH_T')}, CAST(${dateExprFromColumn('wo.SCH_FINISH_D')} AS DATETIME))
        ELSE NULL
      END,
      CAST(${dateExprFromColumn('s.DUEDATE')} AS DATETIME)
    )`;
    await fetchSchedulePanel(
      req,
      res,
      `${dueExpr} >= GETDATE() AND ${dueExpr} < ${weekDeadlineExpr()}`,
      `${dueExpr} ASC`
    );
  } catch (error) {
    console.error('EMS getDueThisWeek error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS due-this-week list', error: error.message });
  }
};

/**
 * GET /api/ems/dashboard/due-soon — due within 8–30 days
 */
exports.getDueSoon = async (req, res) => {
  try {
    const dueExpr = `COALESCE(
      CASE
        WHEN s.WONo > 0 AND wo.WONO IS NOT NULL AND ${dateExprFromColumn('wo.SCH_FINISH_D')} IS NOT NULL
        THEN DATEADD(minute, ${timeToMinutesExpr('wo.SCH_FINISH_T')}, CAST(${dateExprFromColumn('wo.SCH_FINISH_D')} AS DATETIME))
        ELSE NULL
      END,
      CAST(${dateExprFromColumn('s.DUEDATE')} AS DATETIME)
    )`;
    await fetchSchedulePanel(
      req,
      res,
      `${dueExpr} >= ${weekDeadlineExpr()}
       AND ${dueExpr} < DATEADD(day, ${EMS_DUE_SOON_MAX_DAYS}, ${weekDeadlineExpr()})`,
      `${dueExpr} ASC`
    );
  } catch (error) {
    console.error('EMS getDueSoon error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS due-soon list', error: error.message });
  }
};

function monthDateRange(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!y || m < 1 || m > 12) return null;
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { rangeStart: monthStart, rangeEnd: monthEnd };
}

function resolvePlantMatrixRange(query) {
  if (query.startDate && query.endDate) {
    return {
      mode: query.mode || 'month',
      year: parseInt(query.year, 10) || new Date().getFullYear(),
      month: query.month != null ? parseInt(query.month, 10) : undefined,
      period: query.period != null ? parseInt(query.period, 10) : undefined,
      rangeStart: String(query.startDate),
      rangeEnd: String(query.endDate),
    };
  }

  const range = monthDateRange(query.year, query.month);
  if (!range) return null;
  return {
    mode: 'month',
    year: parseInt(query.year, 10),
    month: parseInt(query.month, 10),
    period: undefined,
    ...range,
  };
}

function plantLabelFor(code) {
  const row = PM_CAL_PLANTS.find((p) => p.code === String(code).toUpperCase());
  return row?.label || code;
}

/**
 * GET /api/ems/dashboard/plant-matrix
 * Per-plant schedule completion for tasks due within the selected range.
 * Query: mode=month|period|year, year, month (month mode), period (period mode),
 *        or startDate + endDate (YYYY-MM-DD).
 */
exports.getPlantMatrix = async (req, res) => {
  try {
    const range = resolvePlantMatrixRange(req.query);
    if (!range) {
      return res.status(400).json({
        success: false,
        message: 'Provide startDate/endDate or year and month (month 1–12)',
      });
    }

    const pool = await getCedarPool();
    const request = pool.request();
    const dateRange = applyPmCalSchedDateRangeClause(request, {
      startDate: range.rangeStart,
      endDate: range.rangeEnd,
      startParamName: 'PlantMatrixStart',
      endParamName: 'PlantMatrixEnd',
    });
    if (dateRange.error) {
      return res.status(400).json({ success: false, message: dateRange.error });
    }

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const plantExpr = plantFromTagExpr('ext.tag_no');
    const whereFragment = [
      getPMCalSchedCoreWhere(),
      dateRange.clause,
      `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,
    ].join(' AND ');

    const sqlText = `
      SELECT
        ${plantExpr} AS plant,
        COUNT(*) AS total,
        ISNULL(SUM(CASE WHEN ${WO_FINISHED_SQL} THEN 1 ELSE 0 END), 0) AS done,
        ISNULL(SUM(CASE WHEN s.WONo > 0 AND NOT (${WO_FINISHED_SQL}) THEN 1 ELSE 0 END), 0) AS inProgress,
        ISNULL(SUM(CASE WHEN (s.WONo IS NULL OR s.WONo <= 0) AND NOT (${WO_FINISHED_SQL}) THEN 1 ELSE 0 END), 0) AS noWo
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      WHERE ${whereFragment}
      GROUP BY ${plantExpr}
      ORDER BY ${plantExpr}
    `;

    const result = await request.query(sqlText);
    const byPlant = new Map();
    for (const row of result.recordset || []) {
      const plant = String(row.plant || '').toUpperCase();
      if (!plant) continue;
      const total = row.total ?? 0;
      const done = row.done ?? 0;
      byPlant.set(plant, {
        plant,
        plantLabel: plantLabelFor(plant),
        total,
        done,
        inProgress: row.inProgress ?? 0,
        noWo: row.noWo ?? 0,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      });
    }

    const plants = PM_CAL_PLANTS.map((p) => {
      if (byPlant.has(p.code)) return byPlant.get(p.code);
      return {
        plant: p.code,
        plantLabel: p.label,
        total: 0,
        done: 0,
        inProgress: 0,
        noWo: 0,
        completionRate: 0,
      };
    });

    res.json({
      success: true,
      data: {
        mode: range.mode,
        year: range.year,
        month: range.month,
        period: range.period,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        plants,
      },
      message: 'EMS dashboard plant matrix',
    });
  } catch (error) {
    console.error('EMS getPlantMatrix error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMS plant matrix',
      error: error.message,
    });
  }
};
