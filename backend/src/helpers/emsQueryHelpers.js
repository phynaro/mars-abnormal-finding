/**
 * Shared SQL helpers for EMS (IgxEQExtension + Cedar PM/WO).
 * Effective due: PM.NEXTDUE_D only (never WO scheduled finish).
 */

const sql = require('mssql');
const {
  dateExprFromColumn,
  pmNotFrozen,
  pmFlagActive,
  ALLOWED_PLANT_PREFIXES,
  PM_CAL_PLANTS,
  leftJoinEq,
  leftJoinWoBySched,
  leftJoinOpenWoByPmno,
} = require('./pmCalibrationScheduleQuery');
const {
  EMS_DUE_SOON_MAX_DAYS,
  EMS_SCHEDULE_OPEN_WO_CREATED_FROM,
  emsWoStatusNonOpenSql,
} = require('../constants/emsConstants');

/** Schedule row considered finished (legacy sched status, WONo link, or matching finished WO on PM). */
const WO_FINISHED_SQL = `(
  s.WOStatusNo = 9
  OR (s.WONo > 0 AND wo.WOSTATUSNO IN (7, 9))
  OR EXISTS (
    SELECT 1 FROM dbo.WO wof
    WHERE wof.PMNO = pm.PMNO
      AND wof.WOSTATUSNO IN (7, 9)
      AND (wof.FLAGDEL IS NULL OR wof.FLAGDEL <> 'Y')
      AND ${dateExprFromColumn('wof.SCH_FINISH_D')} = ${dateExprFromColumn('s.DUEDATE')}
  )
)`;

/** LEFT JOIN finished WO matched to schedule due (for aggregates — no subquery in SUM). */
function leftJoinFinishedWoBySched(finishedAlias = 'wof', schedAlias = 's', pmAlias = 'pm') {
  return `LEFT JOIN dbo.WO ${finishedAlias} ON ${finishedAlias}.PMNO = ${pmAlias}.PMNO
    AND ${finishedAlias}.WOSTATUSNO IN (7, 9)
    AND (${finishedAlias}.FLAGDEL IS NULL OR ${finishedAlias}.FLAGDEL <> 'Y')
    AND ${dateExprFromColumn(`${finishedAlias}.SCH_FINISH_D`)} = ${dateExprFromColumn(`${schedAlias}.DUEDATE`)}`;
}

/** Finished check using leftJoinFinishedWoBySched (safe inside SUM/CASE). */
function woFinishedJoinExpr(finishedAlias = 'wof', schedWoAlias = 'wo') {
  return `(
    s.WOStatusNo = 9
    OR (s.WONo > 0 AND ${schedWoAlias}.WOSTATUSNO IN (7, 9))
    OR ${finishedAlias}.WONO IS NOT NULL
  )`;
}

/** Open WO exists on PM (new Cedar links via PMNO, not PMSched.WONo). */
const WO_OPEN_SQL = `(openWo.WONO IS NOT NULL)`;

/** Parse HHmm-like column to minutes since midnight (invalid -> 0). */
function timeToMinutesExpr(colName) {
  const raw = `RIGHT('0000' + LTRIM(RTRIM(CAST(${colName} AS VARCHAR(10)))), 4)`;
  return `(
    CASE
      WHEN ${colName} IS NULL THEN 0
      WHEN ISNUMERIC(LTRIM(RTRIM(CAST(${colName} AS VARCHAR(10))))) = 0 THEN 0
      WHEN CAST(LEFT(${raw}, 2) AS INT) NOT BETWEEN 0 AND 23 THEN 0
      WHEN CAST(RIGHT(${raw}, 2) AS INT) NOT BETWEEN 0 AND 59 THEN 0
      ELSE CAST(LEFT(${raw}, 2) AS INT) * 60 + CAST(RIGHT(${raw}, 2) AS INT)
    END
  )`;
}

/** WO scheduled finish as datetime (date + time columns). */
function woTargetDateTimeExpr(woAlias = 'openWo') {
  const woFinishDateExpr = dateExprFromColumn(`${woAlias}.SCH_FINISH_D`);
  const woFinishMinutesExpr = timeToMinutesExpr(`${woAlias}.SCH_FINISH_T`);
  return `(
    CASE
      WHEN ${woAlias}.WONO IS NOT NULL AND ${woFinishDateExpr} IS NOT NULL
      THEN DATEADD(minute, ${woFinishMinutesExpr}, CAST(${woFinishDateExpr} AS DATETIME))
      ELSE NULL
    END
  )`;
}

/** Parsed scheduled finish date from WO. */
function woSchFinishDateExpr(woAlias = 'wo') {
  return dateExprFromColumn(`${woAlias}.SCH_FINISH_D`);
}

/** Parsed actual finish date from WO. */
function woActFinishDateExpr(woAlias = 'wo') {
  return dateExprFromColumn(`${woAlias}.ACT_FINISH_D`);
}

/** WO completion status used by EMS calibration WO analytics and drill-down. */
function woCompletionStatusExpr(woAlias = 'wo') {
  const schFinishExpr = woSchFinishDateExpr(woAlias);
  const actFinishExpr = woActFinishDateExpr(woAlias);
  return `(
    CASE
      WHEN ${actFinishExpr} IS NULL THEN 'not_finish'
      WHEN ${actFinishExpr} <= ${schFinishExpr} THEN 'ontime'
      ELSE 'late'
    END
  )`;
}

/** PMSched due with PM.NEXTDUE_D fallback. */
function scheduleDueDateExpr(schedAlias = 's', pmAlias = 'pm') {
  const schedDue = dateExprFromColumn(`${schedAlias}.DUEDATE`);
  const pmNextDue = dateExprFromColumn(`${pmAlias}.NEXTDUE_D`);
  return `COALESCE(${schedDue}, ${pmNextDue})`;
}

/** Effective due datetime: PM.NEXTDUE_D only. */
function effectiveDueDateTimeExpr(_schedAlias = 's', pmAlias = 'pm', _woAlias = 'openWo') {
  const pmNextDue = dateExprFromColumn(`${pmAlias}.NEXTDUE_D`);
  return `CAST(${pmNextDue} AS DATETIME)`;
}

/** Source label for effective due resolution. */
function dueDateSourceExpr(_schedAlias = 's', pmAlias = 'pm', _woAlias = 'openWo') {
  const pmNextDue = dateExprFromColumn(`${pmAlias}.NEXTDUE_D`);
  return `(
    CASE
      WHEN ${pmNextDue} IS NOT NULL THEN 'pm_next_due'
      ELSE NULL
    END
  )`;
}

/** Upcoming Sunday 00:00 local (end of coming Saturday). */
function weekDeadlineExpr(nowExpr = 'GETDATE()') {
  const todayDate = `CAST(${nowExpr} AS DATE)`;
  return `DATEADD(day, 7 - (DATEDIFF(day, '1899-12-31', ${todayDate}) % 7), ${todayDate})`;
}

function plantFromTagExpr(tagCol = 'ext.tag_no') {
  return `UPPER(LTRIM(RTRIM(LEFT(${tagCol}, NULLIF(CHARINDEX(N'-', ${tagCol} + N'-'), 0) - 1))))`;
}

function eqActiveWhere(eqAlias = 'eq') {
  return `(${eqAlias}.FLAGDEL IS NULL OR ${eqAlias}.FLAGDEL <> 'Y')`;
}

/** Base FROM for registry-scoped equipment (287 IgxEQExtension rows). */
function emsEquipmentFromJoin() {
  return `
    FROM dbo.IgxEQExtension ext
    INNER JOIN dbo.EQ eq ON eq.EQNO = ext.eqno AND ${eqActiveWhere('eq')}
  `;
}

/** OUTER APPLY: latest PMSched slot per PM (furthest future DUEDATE). */
function latestPmSchedApplySql(schedAlias = 's', pmAlias = 'pm') {
  return `
    OUTER APPLY (
      SELECT TOP 1
        sched.DUEDATE,
        sched.WONo,
        sched.WOStatusNo,
        sched.PMNO
      FROM dbo.PMSched sched
      WHERE sched.PMNO = ${pmAlias}.PMNO
      ORDER BY ${dateExprFromColumn('sched.DUEDATE')} DESC
    ) ${schedAlias}
  `;
}

/**
 * EMS schedule grain: one row per CAL PM (latest PMSched) + registry EQ + optional open WO.
 * Drop-in replacement for getPMCalSched() in EMS schedule/dashboard queries.
 */
function getEmsScheduleFromJoin(options = {}) {
  const createdFrom = options.createdFrom ?? EMS_SCHEDULE_OPEN_WO_CREATED_FROM;
  return {
    fromJoinPm: `
    FROM dbo.PM pm
    ${latestPmSchedApplySql('s', 'pm')}`,
    leftJoinEq: leftJoinEq('eq'),
    leftJoinWo: leftJoinWoBySched('wo'),
    leftJoinOpenWo: leftJoinOpenWoByPmno('openWo', 'pm', { createdFrom }),
  };
}

/** PM must have at least one PMSched row after latest-slot apply. */
const EMS_SCHEDULE_HAS_ROW_SQL = `s.DUEDATE IS NOT NULL`;

/** OUTER APPLY: latest open WO for a PM (links via PMNO on new Cedar). */
function openWoApplySql(pmAlias = 'pm', woAlias = 'openWo') {
  return `
    OUTER APPLY (
      SELECT TOP 1
        wo.WONO,
        wo.WOCODE,
        wo.WOSTATUSNO,
        wo.SCH_FINISH_D,
        wo.SCH_FINISH_T,
        wo.ASSIGN
      FROM dbo.WO wo
      WHERE wo.PMNO = ${pmAlias}.PMNO
        AND ${emsWoStatusNonOpenSql('wo')}
        AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')
      ORDER BY wo.WONO DESC
    ) ${woAlias}
  `;
}

/** Next open calibration obligation per equipment (effective-due model). */
function openCalApplySql() {
  const woTargetExpr = woTargetDateTimeExpr('openWo');
  const effectiveExpr = effectiveDueDateTimeExpr('s', 'pm', 'openWo');
  const sourceExpr = dueDateSourceExpr('s', 'pm', 'openWo');
  return `
    OUTER APPLY (
      SELECT TOP 1
        CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
        s.DUEDATE,
        s.WONo,
        s.WOStatusNo AS schedWOStatusNo,
        openWo.WONO AS openWoNo,
        openWo.WOSTATUSNO AS woStatusNo,
        openWo.WOCODE,
        openWo.SCH_FINISH_D,
        openWo.SCH_FINISH_T,
        pm.ASSIGN AS assigneeId,
        pm.PMNO,
        ${dateExprFromColumn('s.DUEDATE')} AS scheduleDueDateParsed,
        ${woTargetExpr} AS woTargetDate,
        ${effectiveExpr} AS effectiveDueDate,
        ${effectiveExpr} AS dueDateTime,
        CAST(${dateExprFromColumn('pm.NEXTDUE_D')} AS DATE) AS dueDateParsed,
        ${sourceExpr} AS dueDateSource
      FROM dbo.PM pm
      INNER JOIN dbo.PMSched s ON s.PMNO = pm.PMNO
      ${openWoApplySql('pm', 'openWo')}
      WHERE pm.EQNO = eq.EQNO
        AND pm.PMCODE LIKE '%-CAL%'
        AND ${pmNotFrozen('pm')}
        AND ${pmFlagActive('pm')}
        AND ${openCalNotFinishedWhere()}
      ORDER BY ${effectiveExpr} ASC
    ) cal
  `;
}

/**
 * Schedule row not yet completed for open-cal selection.
 */
function openCalNotFinishedWhere() {
  return `NOT (
    s.WOStatusNo = 9
    OR EXISTS (
      SELECT 1 FROM dbo.WO wof
      WHERE wof.PMNO = pm.PMNO
        AND wof.WOSTATUSNO IN (7, 9)
        AND (wof.FLAGDEL IS NULL OR wof.FLAGDEL <> 'Y')
        AND ${dateExprFromColumn('wof.SCH_FINISH_D')} = ${dateExprFromColumn('s.DUEDATE')}
    )
  )`;
}

/** SQL CASE matching statusCalculationService buckets (no_wo | overdue | due_this_week | due_soon | ok). */
function kpiBucketCaseExpr(dueCol = 'cal.effectiveDueDate') {
  const d = dueCol;
  const weekDeadline = weekDeadlineExpr();
  return `(
    CASE
      WHEN cal.DUEDATE IS NULL AND cal.scheduleDueDateParsed IS NULL THEN 'no_wo'
      WHEN cal.schedWOStatusNo = 9 OR cal.woStatusNo IN (7, 9) THEN 'ok'
      WHEN ${d} IS NULL THEN 'no_wo'
      WHEN ${d} < GETDATE() THEN 'overdue'
      WHEN ${d} >= GETDATE() AND ${d} < ${weekDeadline} THEN 'due_this_week'
      WHEN ${d} >= ${weekDeadline} AND ${d} < DATEADD(day, ${EMS_DUE_SOON_MAX_DAYS}, ${weekDeadline}) THEN 'due_soon'
      ELSE 'ok'
    END
  )`;
}

/** Badge status for equipment list (NO WO | OVERDUE | DUE SOON | OK). */
function equipmentStatusCaseExpr(dueCol = 'cal.effectiveDueDate') {
  const d = dueCol;
  const weekDeadline = weekDeadlineExpr();
  return `(
    CASE
      WHEN cal.DUEDATE IS NULL AND cal.scheduleDueDateParsed IS NULL THEN 'NO WO'
      WHEN cal.schedWOStatusNo = 9 OR cal.woStatusNo IN (7, 9) THEN 'OK'
      WHEN ${d} IS NULL THEN 'NO WO'
      WHEN ${d} < GETDATE() THEN 'OVERDUE'
      WHEN ${d} < DATEADD(day, ${EMS_DUE_SOON_MAX_DAYS}, ${weekDeadline}) THEN 'DUE SOON'
      ELSE 'OK'
    END
  )`;
}

/**
 * Date window on PM.NEXTDUE_D (EMS effective due).
 * @returns {{ clause: string, error: string|null }}
 */
function applyEmsEffectiveDueDateRangeClause(request, query = {}, options = {}) {
  const dueFrom = query.dueFrom || query.startDate;
  const dueTo = query.dueTo || query.endDate;
  const startParamName = options.startParamName || 'EmsDueFrom';
  const endParamName = options.endParamName || 'EmsDueTo';
  if (!dueFrom || !dueTo) {
    return { clause: '', error: null };
  }

  request.input(startParamName, sql.Date, dueFrom);
  request.input(endParamName, sql.Date, dueTo);
  const nextDue = dateExprFromColumn('pm.NEXTDUE_D');
  return {
    clause: `${nextDue} >= @${startParamName} AND ${nextDue} <= @${endParamName}`,
    error: null,
  };
}

/**
 * @param {import('mssql').Request} request
 * @param {object} query
 * @param {{ extAlias?: string }} [opts]
 */
function applyEmsPlantAreaFilters(request, query, opts = {}) {
  const extAlias = opts.extAlias || 'ext';
  const parts = [];

  const plantParam = query.plant;
  if (plantParam != null && String(plantParam).trim() !== '') {
    const codes = String(plantParam)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((c) => ALLOWED_PLANT_PREFIXES.includes(c));
    if (codes.length > 0) {
      codes.forEach((c, i) => {
        request.input(`EmsPlant${i}`, sql.NVarChar(20), c);
      });
      parts.push(`${plantFromTagExpr(`${extAlias}.tag_no`)} IN (${codes.map((_, i) => `@EmsPlant${i}`).join(', ')})`);
    }
  }

  const areaParam = query.area;
  if (areaParam != null && String(areaParam).trim() !== '') {
    request.input('EmsArea', sql.NVarChar(255), String(areaParam).trim());
    parts.push(`LTRIM(RTRIM(${extAlias}.location)) = @EmsArea`);
  }

  return parts;
}

function parseStatusFilter(query) {
  const raw = query.status ?? query['status[]'];
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
}

const KPI_BUCKET_VALUES = ['overdue', 'due_this_week', 'due_soon'];

function parseKpiBucketFilter(query) {
  const raw = query.kpiBucket;
  if (raw == null || String(raw).trim() === '') return null;
  const v = String(raw).trim().toLowerCase();
  return KPI_BUCKET_VALUES.includes(v) ? v : null;
}

function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

/** Map explicit due fields for API responses (with backward-compat aliases). */
function mapDueFields(row) {
  const scheduleDueDate = row.scheduleDueDate ?? row.scheduleDueDateRaw ?? row.DUEDATE ?? null;
  const woTargetDate = row.woTargetDate ?? null;
  const effectiveDueDate = row.effectiveDueDate ?? row.effectiveDueDateTime ?? row.dueDateTime ?? null;
  return {
    scheduleDueDate,
    woTargetDate,
    effectiveDueDate,
    dueDateSource: row.dueDateSource ?? null,
    dueDate: effectiveDueDate,
    nextDue: effectiveDueDate,
  };
}

module.exports = {
  dateExprFromColumn,
  pmNotFrozen,
  pmFlagActive,
  ALLOWED_PLANT_PREFIXES,
  PM_CAL_PLANTS,
  WO_FINISHED_SQL,
  WO_OPEN_SQL,
  leftJoinFinishedWoBySched,
  woFinishedJoinExpr,
  plantFromTagExpr,
  eqActiveWhere,
  emsEquipmentFromJoin,
  latestPmSchedApplySql,
  getEmsScheduleFromJoin,
  EMS_SCHEDULE_HAS_ROW_SQL,
  openCalApplySql,
  openWoApplySql,
  openCalNotFinishedWhere,
  woTargetDateTimeExpr,
  woSchFinishDateExpr,
  woActFinishDateExpr,
  woCompletionStatusExpr,
  scheduleDueDateExpr,
  effectiveDueDateTimeExpr,
  dueDateSourceExpr,
  timeToMinutesExpr,
  weekDeadlineExpr,
  kpiBucketCaseExpr,
  equipmentStatusCaseExpr,
  applyEmsEffectiveDueDateRangeClause,
  applyEmsPlantAreaFilters,
  parseStatusFilter,
  parseKpiBucketFilter,
  KPI_BUCKET_VALUES,
  paginationMeta,
  mapDueFields,
};
