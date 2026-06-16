/**
 * Shared SQL helpers for EMS (IgxEQExtension + Cedar PM/WO).
 */

const sql = require('mssql');
const {
  dateExprFromColumn,
  pmNotFrozen,
  pmFlagActive,
  ALLOWED_PLANT_PREFIXES,
  PM_CAL_PLANTS,
} = require('./pmCalibrationScheduleQuery');
const {
  EMS_DUE_SOON_MAX_DAYS,
} = require('../constants/emsConstants');

const WO_FINISHED_SQL = `(s.WOStatusNo = 9 OR (s.WONo > 0 AND wo.WOSTATUSNO IN (7, 9)))`;

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

/** Next open calibration schedule row per equipment. */
function openCalApplySql() {
  const dueExpr = dateExprFromColumn('s.DUEDATE');
  const woFinishDateExpr = dateExprFromColumn('wo.SCH_FINISH_D');
  const woFinishMinutesExpr = timeToMinutesExpr('wo.SCH_FINISH_T');
  const woFinishDateTimeExpr = `(
    CASE
      WHEN s.WONo > 0
        AND wo.WONO IS NOT NULL
        AND ${woFinishDateExpr} IS NOT NULL
      THEN DATEADD(minute, ${woFinishMinutesExpr}, CAST(${woFinishDateExpr} AS DATETIME))
      ELSE NULL
    END
  )`;
  const effectiveDueDateTimeExpr = `COALESCE(${woFinishDateTimeExpr}, CAST(${dueExpr} AS DATETIME))`;
  return `
    OUTER APPLY (
      SELECT TOP 1
        CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
        s.DUEDATE,
        s.WONo,
        s.WOStatusNo AS schedWOStatusNo,
        wo.WOSTATUSNO AS woStatusNo,
        pm.ASSIGN AS assigneeId,
        pm.PMNO,
        wo.WOCODE,
        wo.SCH_FINISH_D,
        wo.SCH_FINISH_T,
        ${woFinishDateTimeExpr} AS woDueDateTime,
        ${effectiveDueDateTimeExpr} AS dueDateTime,
        ${dueExpr} AS dueDateParsed
      FROM dbo.PM pm
      INNER JOIN dbo.PMSched s ON s.PMNO = pm.PMNO
      LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo AND s.WONo > 0
        AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')
      WHERE pm.EQNO = eq.EQNO
        AND pm.PMCODE LIKE '%-CAL%'
        AND ${pmNotFrozen('pm')}
        AND ${pmFlagActive('pm')}
        AND NOT ${WO_FINISHED_SQL}
      ORDER BY
        CASE WHEN ${woFinishDateTimeExpr} IS NOT NULL THEN 0 ELSE 1 END,
        ${effectiveDueDateTimeExpr} ASC
    ) cal
  `;
}

/** SQL CASE matching statusCalculationService buckets (no_wo | overdue | due_this_week | due_soon | ok). */
function kpiBucketCaseExpr(dueCol = 'cal.dueDateParsed') {
  const d = dueCol;
  const weekDeadline = weekDeadlineExpr();
  return `(
    CASE
      WHEN cal.DUEDATE IS NULL THEN 'no_wo'
      WHEN cal.schedWOStatusNo = 9 OR (cal.WONo > 0 AND cal.woStatusNo IN (7, 9)) THEN 'ok'
      WHEN ${d} IS NULL THEN 'no_wo'
      WHEN ${d} < GETDATE() THEN 'overdue'
      WHEN ${d} >= GETDATE() AND ${d} < ${weekDeadline} THEN 'due_this_week'
      WHEN ${d} >= ${weekDeadline} AND ${d} < DATEADD(day, ${EMS_DUE_SOON_MAX_DAYS}, ${weekDeadline}) THEN 'due_soon'
      ELSE 'ok'
    END
  )`;
}

/** Badge status for equipment list (NO WO | OVERDUE | DUE SOON | OK). */
function equipmentStatusCaseExpr(dueCol = 'cal.dueDateParsed') {
  const d = dueCol;
  const weekDeadline = weekDeadlineExpr();
  return `(
    CASE
      WHEN cal.DUEDATE IS NULL THEN 'NO WO'
      WHEN cal.schedWOStatusNo = 9 OR (cal.WONo > 0 AND cal.woStatusNo IN (7, 9)) THEN 'OK'
      WHEN ${d} IS NULL THEN 'NO WO'
      WHEN ${d} < GETDATE() THEN 'OVERDUE'
      WHEN ${d} < DATEADD(day, ${EMS_DUE_SOON_MAX_DAYS}, ${weekDeadline}) THEN 'DUE SOON'
      ELSE 'OK'
    END
  )`;
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

module.exports = {
  dateExprFromColumn,
  pmNotFrozen,
  pmFlagActive,
  ALLOWED_PLANT_PREFIXES,
  PM_CAL_PLANTS,
  WO_FINISHED_SQL,
  plantFromTagExpr,
  eqActiveWhere,
  emsEquipmentFromJoin,
  openCalApplySql,
  timeToMinutesExpr,
  weekDeadlineExpr,
  kpiBucketCaseExpr,
  equipmentStatusCaseExpr,
  applyEmsPlantAreaFilters,
  parseStatusFilter,
  parseKpiBucketFilter,
  KPI_BUCKET_VALUES,
  paginationMeta,
};
