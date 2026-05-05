/**
 * PM calibration schedule queries (PMSched + PM with PMCODE containing -CAL).
 * Separate from WO-type calibration in calibrationController.js.
 */

const sql = require('mssql');

/** First two characters of PMCODE → plant (validated filter values). */
const ALLOWED_PLANT_PREFIXES = ['PP', 'DJ', 'DP', 'SN', 'CT', 'PS'];

const PM_CAL_PLANTS = [
  { code: 'PP', label: 'Pouch Plant' },
  { code: 'DJ', label: 'Dry Jaroen' },
  { code: 'DP', label: 'Dry Plant' },
  { code: 'SN', label: 'Dry Sanook' },
  { code: 'CT', label: 'Care & Treat' },
  { code: 'PS', label: 'Positive Treat' },
];

/**
 * SQL Server 2008–compatible: parse 8-char (YYYYMMDD) or 10-char (YYYY-MM-DD) to date or NULL.
 */
function dateExprFromColumn(colName) {
  const c = `LTRIM(RTRIM(${colName}))`;
  return `(CASE WHEN LEN(${c}) = 8 AND ISDATE(STUFF(STUFF(${colName}, 5, 0, '-'), 8, 0, '-')) = 1 THEN CONVERT(date, STUFF(STUFF(${colName}, 5, 0, '-'), 8, 0, '-'), 23) WHEN LEN(${c}) >= 10 AND ISDATE(LEFT(${colName}, 10)) = 1 THEN CONVERT(date, LEFT(${colName}, 10), 23) ELSE NULL END)`;
}

function pmNotFrozen(alias) {
  return `(${alias}.FREEZE IS NULL OR LTRIM(RTRIM(${alias}.FREEZE)) <> 'T')`;
}

function pmFlagActive(alias) {
  return `(${alias}.FLAGDEL IS NULL OR LTRIM(RTRIM(${alias}.FLAGDEL)) <> 'T')`;
}

function plantPrefixExpr() {
  return `UPPER(LEFT(LTRIM(RTRIM(pm.PMCODE)), 2))`;
}

/**
 * Core predicates for calibration PM schedule rows (after s/pm join).
 */
function getPMCalSchedCoreWhere() {
  return [
    `pm.PMCODE LIKE '%-CAL%'`,
    pmNotFrozen('pm'),
    pmFlagActive('pm'),
  ].join(' AND ');
}

/**
 * FROM/JOIN fragments for PM calibration schedule queries.
 */
/**
 * LEFT JOIN equipment for EQCODE-based type key (5th segment rule, matches calibrationEqTypeFromEqcode.js).
 */
function leftJoinEq(eqAlias = 'eq') {
  return `LEFT JOIN dbo.EQ ${eqAlias} ON ${eqAlias}.EQNO = pm.EQNO AND (${eqAlias}.FLAGDEL IS NULL OR ${eqAlias}.FLAGDEL <> 'Y')`;
}

/**
 * SQL expression for equipment type key (nvarchar). Uses _UNPARSED when code cannot be classified.
 * @param {string} [eqAlias]
 */
function eqTypeKeyExpr(eqAlias = 'eq') {
  const norm = `LTRIM(RTRIM(REPLACE(${eqAlias}.EQCODE, ' ', '')))`;
  const xml = `CAST('<r><p>' + REPLACE(${norm}, N'-', N'</p><p>') + N'</p></r>' AS XML)`;
  const fifth = `LTRIM(RTRIM(CAST(${xml}.value('(/r/p)[5]', 'nvarchar(50)') AS nvarchar(50))))`;
  return `(
    CASE
      WHEN ${eqAlias}.EQNO IS NULL OR ${eqAlias}.EQCODE IS NULL OR LTRIM(RTRIM(${eqAlias}.EQCODE)) = N'' THEN N'_UNPARSED'
      WHEN ${fifth} IS NULL OR ${fifth} = N'' THEN N'_UNPARSED'
      WHEN PATINDEX(N'%[0-9]%', ${fifth}) > 1 THEN UPPER(LEFT(${fifth}, PATINDEX(N'%[0-9]%', ${fifth}) - 1))
      WHEN PATINDEX(N'%[0-9]%', ${fifth}) = 0 AND LEN(${fifth}) > 0 THEN UPPER(${fifth})
      ELSE N'_UNPARSED'
    END
  )`;
}

function getPMCalSched() {
  return {
    fromJoinPm: `FROM dbo.PMSched s INNER JOIN dbo.PM pm ON pm.PMNO = s.PMNO`,
    leftJoinEq: leftJoinEq('eq'),
    leftJoinWo: `LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')`,
    dueDateExpr: dateExprFromColumn('s.DUEDATE'),
    plantPrefixExpr: plantPrefixExpr(),
  };
}

/**
 * Apply plant, dept, assignee, eqType filters to a mssql request; excludes date range.
 * @returns {{ parts: string[], dueDateExpr: string, error: string|null }}
 */
function applyPmCalSchedNonDateFilters(request, query) {
  const dueDateExpr = dateExprFromColumn('s.DUEDATE');
  const parts = [getPMCalSchedCoreWhere()];

  const plantParam = query.plant;
  if (plantParam != null && String(plantParam).trim() !== '') {
    const codes = String(plantParam)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .filter((c) => ALLOWED_PLANT_PREFIXES.includes(c));
    if (codes.length > 0) {
      codes.forEach((c, i) => {
        request.input(`Plant${i}`, sql.VarChar(2), c);
      });
      parts.push(`${plantPrefixExpr()} IN (${codes.map((_, i) => `@Plant${i}`).join(', ')})`);
    }
  }

  const deptParam = query.dept;
  if (deptParam != null && String(deptParam).trim() !== '') {
    const deptNos = String(deptParam)
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (deptNos.length > 0) {
      deptNos.forEach((n, i) => {
        request.input(`Dept${i}`, sql.Int, n);
      });
      parts.push(`pm.DEPTNO IN (${deptNos.map((_, i) => `@Dept${i}`).join(', ')})`);
    }
  }

  const assigneeRaw = query.assigneeIds != null ? query.assigneeIds : query.assignee;
  if (assigneeRaw != null && String(assigneeRaw).trim() !== '') {
    const ids = String(assigneeRaw)
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (ids.length > 0) {
      ids.forEach((n, i) => {
        request.input(`Asg${i}`, sql.Int, n);
      });
      parts.push(`pm.ASSIGN IN (${ids.map((_, i) => `@Asg${i}`).join(', ')})`);
    }
  }

  const eqTypeRaw = query.eqType != null ? String(query.eqType).trim() : '';
  if (eqTypeRaw !== '') {
    request.input('EqType', sql.NVarChar(40), eqTypeRaw);
    parts.push(`${eqTypeKeyExpr('eq')} = @EqType`);
  }

  return { parts, dueDateExpr, error: null };
}

/**
 * Apply a date range clause using caller-supplied dates/param names.
 * @returns {{ clause: string, dueDateExpr: string, error: string|null }}
 */
function applyPmCalSchedDateRangeClause(request, options = {}) {
  const dueDateExpr = dateExprFromColumn('s.DUEDATE');
  const startDate = options.startDate != null ? String(options.startDate).trim() : '';
  const endDate = options.endDate != null ? String(options.endDate).trim() : '';
  const startParamName = options.startParamName || 'StartDate';
  const endParamName = options.endParamName || 'EndDate';
  const requiredMessage = options.requiredMessage || 'startDate and endDate are required (YYYY-MM-DD)';

  if (!startDate || !endDate) {
    return { clause: '', dueDateExpr, error: requiredMessage };
  }

  request.input(startParamName, sql.Date, startDate);
  request.input(endParamName, sql.Date, endDate);

  return {
    clause: `${dueDateExpr} >= @${startParamName} AND ${dueDateExpr} <= @${endParamName}`,
    dueDateExpr,
    error: null,
  };
}

/**
 * Apply date, plant, dept, assignee filters to a mssql request; append to core WHERE.
 * @returns {{ whereFragment: string, dueDateExpr: string, error: string|null }}
 */
function buildPmCalSchedFilterClause(request, query) {
  const base = applyPmCalSchedNonDateFilters(request, query);
  if (base.error) return { whereFragment: '', dueDateExpr: base.dueDateExpr, error: base.error };

  const dateRange = applyPmCalSchedDateRangeClause(request, {
    startDate: query.startDate,
    endDate: query.endDate,
  });
  if (dateRange.error) return { whereFragment: '', dueDateExpr: dateRange.dueDateExpr, error: dateRange.error };

  return { whereFragment: [...base.parts, dateRange.clause].join(' AND '), dueDateExpr: dateRange.dueDateExpr, error: null };
}

module.exports = {
  ALLOWED_PLANT_PREFIXES,
  PM_CAL_PLANTS,
  dateExprFromColumn,
  pmNotFrozen,
  getPMCalSchedCoreWhere,
  getPMCalSched,
  leftJoinEq,
  eqTypeKeyExpr,
  plantPrefixExpr,
  applyPmCalSchedNonDateFilters,
  applyPmCalSchedDateRangeClause,
  buildPmCalSchedFilterClause,
};
