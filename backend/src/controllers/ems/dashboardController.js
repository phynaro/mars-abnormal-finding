/**

 * EMS Dashboard Controller — KPI tiles and overdue / due-soon panels.

 * Scoped to dbo.IgxEQExtension registry (287 equipment).

 */



const sql = require('mssql');

const { getCedarPool } = require('../../config/getCedarPool');

const {

  emsEquipmentFromJoin,

  applyEmsPlantAreaFilters,

  paginationMeta,

  WO_FINISHED_SQL,

  WO_OPEN_SQL,

  leftJoinFinishedWoBySched,

  woFinishedJoinExpr,

  plantFromTagExpr,

  PM_CAL_PLANTS,

  weekDeadlineExpr,
  daysFromTodayExpr,

  kpiBucketCaseExpr,

  effectiveDueDateTimeExpr,

  scheduleDueDateExpr,

  dueDateSourceExpr,

  woTargetDateTimeExpr,

  mapDueFields,
  applyEmsEffectiveDueDateRangeClause,
  getEmsScheduleFromJoin,
  EMS_SCHEDULE_HAS_ROW_SQL,
  emsEquipmentCalPrepSql,
  emptyEmsKpiCounts,
  accumulateEmsKpiCounts,
  liveHasCurrentDueWoExpr,
  emptyWoHistoryTotals,
  accumulateWoHistoryTotals,

  dateExprFromColumn,

  woSchFinishDateExpr,

  woCompletionStatusExpr,

  woPostponeCaseExpr,

  woPostponeOnJoinedWoCaseExpr,

  emptyPlantMatrixItem,

  emptyWoPeriodStatusEntry,

  applyWoPeriodStatusCount,

  eqActiveWhere,

} = require('../../helpers/emsQueryHelpers');

const {

  EMS_DUE_SOON_MAX_DAYS,
  emsWoStatusNotCanceledSql,

} = require('../../constants/emsConstants');



const {

  getPMCalSchedCoreWhere,

  pmNotFrozen,

  pmFlagActive,

} = require('../../helpers/pmCalibrationScheduleQuery');



function buildRegistryWhere(request, query) {

  const parts = applyEmsPlantAreaFilters(request, query);

  return parts.length ? parts.join(' AND ') : '1=1';

}



function mapDashboardItem(row) {

  const due = mapDueFields(row);

  return {

    tagNo: row.tagNo,

    description: row.description,

    area: row.area,

    plant: row.plant,

    daysOverdue: row.daysOverdue ?? null,

    daysUntilDue: row.daysUntilDue ?? null,

    scheduleDueDate: due.scheduleDueDate,

    woTargetDate: due.woTargetDate,

    effectiveDueDate: due.effectiveDueDate,

    dueDateSource: due.dueDateSource,

    dueDate: due.effectiveDueDate,

    woNo: row.openWoNo ?? row.WONo ?? null,

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

    const startedAt = Date.now();

    const pool = await getCedarPool();

    const request = pool.request();

    const registryWhere = buildRegistryWhere(request, req.query);

    const bucketExpr = kpiBucketCaseExpr('cal.effectiveDueDate');
    const hasWoExpr = liveHasCurrentDueWoExpr('cal');

    const result = await request.query(`

      ${emsEquipmentCalPrepSql(registryWhere)}

      SELECT bucket, hasWo, COUNT(*) AS cnt
      FROM (
        SELECT ${bucketExpr} AS bucket, ${hasWoExpr} AS hasWo
        FROM #EmsEq e
        LEFT JOIN #EmsCal cal ON cal.eqno = e.eqno
      ) ranked
      GROUP BY bucket, hasWo

    `);

    const counts = emptyEmsKpiCounts();

    const rows = Array.isArray(result.recordsets) && result.recordsets.length
      ? result.recordsets[result.recordsets.length - 1]
      : result.recordset;

    for (const row of rows || []) {

      accumulateEmsKpiCounts(counts, row.bucket, row.cnt, row.hasWo);

    }

    console.log(`EMS getKpi ${Date.now() - startedAt}ms total=${counts.totalEquipment}`);

    res.json({

      success: true,

      data: counts,

      message: 'EMS dashboard KPI',

    });

  } catch (error) {

    console.error('EMS getKpi error:', error);

    res.status(500).json({ success: false, message: 'Failed to fetch EMS dashboard KPI', error: error.message });

  }

};

/**
 * GET /api/ems/dashboard/kpi-by-plant
 */
exports.getKpiByPlant = async (req, res) => {

  try {

    const startedAt = Date.now();

    const pool = await getCedarPool();

    const request = pool.request();

    const registryWhere = buildRegistryWhere(request, req.query);

    const bucketExpr = kpiBucketCaseExpr('cal.effectiveDueDate');
    const hasWoExpr = liveHasCurrentDueWoExpr('cal');

    const result = await request.query(`

      ${emsEquipmentCalPrepSql(registryWhere)}

      SELECT plant, bucket, hasWo, COUNT(*) AS cnt
      FROM (
        SELECT e.plant, ${bucketExpr} AS bucket, ${hasWoExpr} AS hasWo
        FROM #EmsEq e
        LEFT JOIN #EmsCal cal ON cal.eqno = e.eqno
      ) ranked
      GROUP BY plant, bucket, hasWo

    `);

    const rows = Array.isArray(result.recordsets) && result.recordsets.length
      ? result.recordsets[result.recordsets.length - 1]
      : result.recordset;

    const plants = {};

    for (const p of PM_CAL_PLANTS) {

      plants[p.code] = emptyEmsKpiCounts();

    }

    for (const row of rows || []) {

      const plant = String(row.plant || '').toUpperCase();

      if (!plants[plant]) plants[plant] = emptyEmsKpiCounts();

      accumulateEmsKpiCounts(plants[plant], row.bucket, row.cnt, row.hasWo);

    }

    console.log(`EMS getKpiByPlant ${Date.now() - startedAt}ms plants=${Object.keys(plants).length}`);

    res.json({

      success: true,

      data: { plants },

      message: 'EMS dashboard KPI by plant',

    });

  } catch (error) {

    console.error('EMS getKpiByPlant error:', error);

    res.status(500).json({ success: false, message: 'Failed to fetch EMS dashboard KPI by plant', error: error.message });

  }

};



async function fetchSchedulePanel(req, res, windowClause, orderBy) {

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const startRow = (page - 1) * limit + 1;

  const endRow = (page - 1) * limit + limit;



  const pool = await getCedarPool();

  const effectiveExpr = effectiveDueDateTimeExpr('s', 'pm', 'openWo');

  const schedDueExpr = scheduleDueDateExpr('s', 'pm');

  const sourceExpr = dueDateSourceExpr('s', 'pm', 'openWo');

  const { fromJoinPm, leftJoinEq, leftJoinWo, leftJoinOpenWo } = getEmsScheduleFromJoin();



  const countReq = pool.request();

  const registryFilters = applyEmsPlantAreaFilters(countReq, req.query, { extAlias: 'ext' });

  const whereFragment = [

    getPMCalSchedCoreWhere(),

    `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,

    EMS_SCHEDULE_HAS_ROW_SQL,

    windowClause,

    `NOT ${WO_FINISHED_SQL}`,

    ...registryFilters,

  ].join(' AND ');



  const countSql = `

    SELECT COUNT(*) AS total

    ${fromJoinPm}

    ${leftJoinEq}

    ${leftJoinWo}

    ${leftJoinOpenWo}

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

    EMS_SCHEDULE_HAS_ROW_SQL,

    windowClause,

    `NOT ${WO_FINISHED_SQL}`,

    ...dataFilters,

  ].join(' AND ');



  dataReq.input('StartRow', sql.Int, startRow);

  dataReq.input('EndRow', sql.Int, endRow);



  const dataSql = `

    SELECT tagNo, description, area, plant, daysOverdue, daysUntilDue,

           scheduleDueDateRaw, woTargetDate, effectiveDueDate, dueDateSource,

           openWoNo, WOCODE, assigneeId, assigneeName, PMSchNo

    FROM (

      SELECT

        ext.tag_no AS tagNo,

        ISNULL(ext.description, eq.EQNAME) AS description,

        ext.location AS area,

        ${plantFromTagExpr('ext.tag_no')} AS plant,

        CASE WHEN ${effectiveExpr} < GETDATE()

          THEN DATEDIFF(day, ${effectiveExpr}, GETDATE()) ELSE NULL END AS daysOverdue,

        DATEDIFF(day, GETDATE(), ${effectiveExpr}) AS daysUntilDue,

        s.DUEDATE AS scheduleDueDateRaw,

        ${woTargetDateTimeExpr('openWo')} AS woTargetDate,

        ${effectiveExpr} AS effectiveDueDate,

        ${sourceExpr} AS dueDateSource,

        openWo.WONO AS openWoNo,

        openWo.WOCODE,

        pm.ASSIGN AS assigneeId,

        LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName,

        CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,

        ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNum

      ${fromJoinPm}

      ${leftJoinEq}

      ${leftJoinWo}

      ${leftJoinOpenWo}

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

    const effectiveExpr = effectiveDueDateTimeExpr('s', 'pm', 'openWo');

    await fetchSchedulePanel(

      req,

      res,

      `${effectiveExpr} < GETDATE()`,

      `${effectiveExpr} ASC`

    );

  } catch (error) {

    console.error('EMS getOverdue error:', error);

    res.status(500).json({ success: false, message: 'Failed to fetch EMS overdue list', error: error.message });

  }

};



/**

 * GET /api/ems/dashboard/due-this-week — today until Saturday midnight

 */

exports.getDueThisWeek = async (req, res) => {

  try {

    const effectiveExpr = effectiveDueDateTimeExpr('s', 'pm', 'openWo');

    await fetchSchedulePanel(

      req,

      res,

      `${effectiveExpr} >= GETDATE() AND ${effectiveExpr} < ${weekDeadlineExpr()}`,

      `${effectiveExpr} ASC`

    );

  } catch (error) {

    console.error('EMS getDueThisWeek error:', error);

    res.status(500).json({ success: false, message: 'Failed to fetch EMS due-this-week list', error: error.message });

  }

};



/**

 * GET /api/ems/dashboard/due-soon — next 7 days from today

 */

exports.getDueSoon = async (req, res) => {

  try {

    const effectiveExpr = effectiveDueDateTimeExpr('s', 'pm', 'openWo');

    await fetchSchedulePanel(

      req,

      res,

      `${effectiveExpr} >= GETDATE() AND ${effectiveExpr} < ${daysFromTodayExpr(EMS_DUE_SOON_MAX_DAYS)}`,

      `${effectiveExpr} ASC`

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

    const dateRange = applyEmsEffectiveDueDateRangeClause(request, {

      startDate: range.rangeStart,

      endDate: range.rangeEnd,

    }, {

      startParamName: 'PlantMatrixStart',

      endParamName: 'PlantMatrixEnd',

    });

    if (dateRange.error) {

      return res.status(400).json({ success: false, message: dateRange.error });

    }



    const { fromJoinPm, leftJoinEq, leftJoinWo, leftJoinOpenWo } = getEmsScheduleFromJoin();

    const plantExpr = plantFromTagExpr('ext.tag_no');

    const whereFragment = [

      getPMCalSchedCoreWhere(),

      dateRange.clause,

      `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,

      EMS_SCHEDULE_HAS_ROW_SQL,

    ].join(' AND ');



    const finishedExpr = woFinishedJoinExpr('wof', 'wo');
    const effectiveExpr = effectiveDueDateTimeExpr('s', 'pm', 'openWo');

    const sqlText = `

      SELECT

        ${plantExpr} AS plant,

        COUNT(*) AS total,

        ISNULL(SUM(CASE WHEN ${finishedExpr} THEN 1 ELSE 0 END), 0) AS done,

        ISNULL(SUM(CASE WHEN NOT (${finishedExpr}) AND ${effectiveExpr} < GETDATE() THEN 1 ELSE 0 END), 0) AS overdue,

        ISNULL(SUM(CASE WHEN NOT (${finishedExpr}) AND ${effectiveExpr} >= GETDATE() AND ${WO_OPEN_SQL} THEN 1 ELSE 0 END), 0) AS inProgress,

        ISNULL(SUM(CASE WHEN NOT (${finishedExpr}) AND ${effectiveExpr} >= GETDATE() AND NOT ${WO_OPEN_SQL} THEN 1 ELSE 0 END), 0) AS noWo,

        ISNULL(SUM(${woPostponeOnJoinedWoCaseExpr()}), 0) AS wo_postpone

      ${fromJoinPm}

      ${leftJoinEq}

      ${leftJoinWo}

      ${leftJoinOpenWo}

      ${leftJoinFinishedWoBySched('wof')}

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

        overdue: row.overdue ?? 0,

        inProgress: row.inProgress ?? 0,

        noWo: row.noWo ?? 0,

        wo_postpone: Number(row.wo_postpone) || 0,

        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,

      });

    }



    const plants = PM_CAL_PLANTS.map((p) => {

      if (byPlant.has(p.code)) return byPlant.get(p.code);

      return emptyPlantMatrixItem(p.code, p.label);

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



/**

 * GET /api/ems/dashboard/wo-period-status

 */

function emptyWoPeriodSlots() {
  const byPeriod = new Map();
  for (let p = 1; p <= 13; p += 1) {
    byPeriod.set(p, emptyWoPeriodStatusEntry(p));
  }
  return byPeriod;
}

exports.getWoPeriodStatus = async (req, res) => {

  try {

    const range = resolvePlantMatrixRange(req.query);

    if (!range) {

      return res.status(400).json({

        success: false,

        message: 'Provide startDate and endDate (YYYY-MM-DD)',

      });

    }



    const pool = await getCedarPool();

    const request = pool.request();

    request.input('WoPeriodRangeStart', sql.Date, range.rangeStart);

    request.input('WoPeriodRangeEnd', sql.Date, range.rangeEnd);



    const pmDueExpr = dateExprFromColumn('wo.PMDUE_D');

    const plantExpr = plantFromTagExpr('ext.tag_no');

    const periodExpr = `(DATEDIFF(day, @WoPeriodRangeStart, ${pmDueExpr}) / 28) + 1`;

    const statusExpr = woCompletionStatusExpr('wo');
    const postponeExpr = woPostponeCaseExpr('wo');



    const whereFragment = [

      `pm.PMCODE LIKE '%-CAL%'`,

      pmNotFrozen('pm'),

      pmFlagActive('pm'),

      `(wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')`,

      emsWoStatusNotCanceledSql('wo'),

      `${pmDueExpr} IS NOT NULL`,

      `${pmDueExpr} >= @WoPeriodRangeStart`,

      `${pmDueExpr} <= @WoPeriodRangeEnd`,

      `${periodExpr} BETWEEN 1 AND 13`,

      `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,

    ].join(' AND ');



    const sqlText = `

      SELECT

        ${plantExpr} AS plant,

        ${periodExpr} AS period,

        ${statusExpr} AS status,

        COUNT(*) AS cnt,

        SUM(${postponeExpr}) AS wo_postpone

      FROM dbo.WO wo

      INNER JOIN dbo.PM pm ON pm.PMNO = wo.PMNO

      INNER JOIN dbo.EQ eq ON eq.EQNO = pm.EQNO AND ${eqActiveWhere('eq')}

      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO

      WHERE ${whereFragment}

      GROUP BY ${plantExpr}, ${periodExpr}, ${statusExpr}

      ORDER BY plant, period, status

    `;



    const result = await request.query(sqlText);

    const allowedPlants = new Set(PM_CAL_PLANTS.map((p) => p.code));
    const byPeriod = emptyWoPeriodSlots();
    const byPlantMap = new Map();
    for (const p of PM_CAL_PLANTS) {
      byPlantMap.set(p.code, emptyWoPeriodSlots());
    }

    for (const row of result.recordset || []) {
      const period = Number(row.period);
      if (period < 1 || period > 13) continue;

      const plant = String(row.plant || '').toUpperCase();
      if (!allowedPlants.has(plant)) continue;

      const cnt = row.cnt ?? 0;
      const postponeCnt = row.wo_postpone ?? 0;
      const aggEntry = byPeriod.get(period);
      if (aggEntry) applyWoPeriodStatusCount(aggEntry, row.status, cnt, postponeCnt);

      const plantPeriods = byPlantMap.get(plant);
      if (!plantPeriods) continue;
      const plantEntry = plantPeriods.get(period);
      if (plantEntry) applyWoPeriodStatusCount(plantEntry, row.status, cnt, postponeCnt);
    }

    const periods = Array.from(byPeriod.values());
    const byPlant = PM_CAL_PLANTS.map((p) => ({
      plant: p.code,
      periods: Array.from(byPlantMap.get(p.code).values()),
    }));

    res.json({

      success: true,

      data: {

        year: range.year,

        rangeStart: range.rangeStart,

        rangeEnd: range.rangeEnd,

        periods,

        byPlant,

      },

      message: 'EMS dashboard WO period status',

    });

  } catch (error) {

    console.error('EMS getWoPeriodStatus error:', error);

    res.status(500).json({

      success: false,

      message: 'Failed to fetch EMS WO period status',

      error: error.message,

    });

  }

};


/**
 * GET /api/ems/dashboard/wo-history
 * Calibration WO history for a selected range, anchored on WO.PMDUE_D.
 */
exports.getWoHistory = async (req, res) => {
  try {
    const range = resolvePlantMatrixRange(req.query);
    if (!range) {
      return res.status(400).json({
        success: false,
        message: 'Provide startDate/endDate or year and month (month 1–12)',
      });
    }

    const mode = String(req.query.mode || range.mode || 'month').toLowerCase();
    const grain = mode === 'year' ? 'period' : 'day';

    const pool = await getCedarPool();
    const request = pool.request();
    request.input('WoHistRangeStart', sql.Date, range.rangeStart);
    request.input('WoHistRangeEnd', sql.Date, range.rangeEnd);

    const plantFilters = applyEmsPlantAreaFilters(request, req.query, { extAlias: 'ext' });
    const pmDueExpr = dateExprFromColumn('wo.PMDUE_D');
    const plantExpr = plantFromTagExpr('ext.tag_no');
    const statusExpr = woCompletionStatusExpr('wo');
    const postponeExpr = woPostponeCaseExpr('wo');
    const openPastDueExpr = `(CASE
      WHEN ${dateExprFromColumn('wo.ACT_FINISH_D')} IS NULL
        AND ${pmDueExpr} < CAST(GETDATE() AS DATE)
      THEN 1 ELSE 0 END)`;
    const periodExpr = `(DATEDIFF(day, @WoHistRangeStart, ${pmDueExpr}) / 28) + 1`;
    const dayKeyExpr = `CONVERT(varchar(10), ${pmDueExpr}, 23)`;
    const bucketExpr = grain === 'period' ? periodExpr : dayKeyExpr;
    const assigneeIdExpr = `ISNULL(wo.ASSIGN, 0)`;
    const assigneeNameExpr = `CASE
      WHEN wo.ASSIGN IS NULL OR wo.ASSIGN = 0 THEN N'Unassigned'
      ELSE LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,'')))
    END`;

    const whereFragment = [
      `pm.PMCODE LIKE '%-CAL%'`,
      pmNotFrozen('pm'),
      pmFlagActive('pm'),
      `(wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')`,
      emsWoStatusNotCanceledSql('wo'),
      `${pmDueExpr} IS NOT NULL`,
      `${pmDueExpr} >= @WoHistRangeStart`,
      `${pmDueExpr} <= @WoHistRangeEnd`,
      `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,
      ...plantFilters,
    ].join(' AND ');

    const sqlText = `
      SELECT
        ${plantExpr} AS plant,
        ${assigneeIdExpr} AS assigneeId,
        ${assigneeNameExpr} AS assigneeName,
        ${bucketExpr} AS bucket,
        ${statusExpr} AS status,
        COUNT(*) AS cnt,
        SUM(${postponeExpr}) AS wo_postpone,
        SUM(${openPastDueExpr}) AS open_past_due
      FROM dbo.WO wo
      INNER JOIN dbo.PM pm ON pm.PMNO = wo.PMNO
      INNER JOIN dbo.EQ eq ON eq.EQNO = pm.EQNO AND ${eqActiveWhere('eq')}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      LEFT JOIN dbo.Person p ON p.PERSONNO = wo.ASSIGN
      WHERE ${whereFragment}
      GROUP BY ${plantExpr}, ${assigneeIdExpr}, ${assigneeNameExpr}, ${bucketExpr}, ${statusExpr}
    `;

    const result = await request.query(sqlText);
    const rows = result.recordset || [];

    const totals = emptyWoHistoryTotals();
    const byPlantMap = new Map();
    for (const p of PM_CAL_PLANTS) {
      byPlantMap.set(p.code, emptyWoHistoryTotals());
    }
    const byAssigneeMap = new Map();
    const byTimeMap = new Map();

    const allowedPlants = new Set(PM_CAL_PLANTS.map((p) => p.code));

    for (const row of rows) {
      const plant = String(row.plant || '').toUpperCase();
      if (!allowedPlants.has(plant)) continue;

      const status = row.status;
      const cnt = row.cnt ?? 0;
      const postponeCnt = row.wo_postpone ?? 0;
      const openPastDueCnt = row.open_past_due ?? 0;

      accumulateWoHistoryTotals(totals, status, cnt, postponeCnt, openPastDueCnt);

      if (!byPlantMap.has(plant)) byPlantMap.set(plant, emptyWoHistoryTotals());
      accumulateWoHistoryTotals(byPlantMap.get(plant), status, cnt, postponeCnt, openPastDueCnt);

      const assigneeId = Number(row.assigneeId) || 0;
      const assigneeKey = String(assigneeId);
      if (!byAssigneeMap.has(assigneeKey)) {
        byAssigneeMap.set(assigneeKey, {
          assigneeId,
          assigneeName: row.assigneeName || 'Unassigned',
          ...emptyWoHistoryTotals(),
        });
      }
      const assigneeEntry = byAssigneeMap.get(assigneeKey);
      accumulateWoHistoryTotals(assigneeEntry, status, cnt, postponeCnt, openPastDueCnt);

      let bucketKey = row.bucket;
      if (grain === 'period') {
        const period = Number(row.bucket);
        if (period < 1 || period > 13) continue;
        bucketKey = period;
      } else {
        bucketKey = String(row.bucket || '');
        if (!bucketKey) continue;
      }

      if (!byTimeMap.has(bucketKey)) {
        byTimeMap.set(bucketKey, {
          ...(grain === 'period' ? { period: bucketKey } : { day: bucketKey }),
          ...emptyWoHistoryTotals(),
        });
      }
      accumulateWoHistoryTotals(byTimeMap.get(bucketKey), status, cnt, postponeCnt, openPastDueCnt);
    }

    const byPlant = PM_CAL_PLANTS.map((p) => ({
      plant: p.code,
      plantLabel: p.label,
      ...byPlantMap.get(p.code),
    }));

    const byAssignee = Array.from(byAssigneeMap.values()).sort(
      (a, b) => b.total - a.total || String(a.assigneeName).localeCompare(String(b.assigneeName))
    );

    let byTime;
    if (grain === 'period') {
      byTime = Array.from({ length: 13 }, (_, i) => {
        const period = i + 1;
        return byTimeMap.get(period) || { period, ...emptyWoHistoryTotals() };
      });
    } else {
      byTime = Array.from(byTimeMap.values()).sort((a, b) => String(a.day).localeCompare(String(b.day)));
    }

    res.json({
      success: true,
      data: {
        mode: range.mode,
        grain,
        year: range.year,
        month: range.month,
        period: range.period,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        totals,
        byPlant,
        byAssignee,
        byTime,
      },
      message: 'EMS dashboard WO history',
    });
  } catch (error) {
    console.error('EMS getWoHistory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMS WO history',
      error: error.message,
    });
  }
};
