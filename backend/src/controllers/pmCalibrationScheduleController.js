/**
 * PM calibration schedule KPI and list (PMSched + PM where PMCODE contains -CAL).
 */

const sql = require('mssql');
const dbConfigNew = require('../config/dbConfigNew');
const {
  getPMCalSched,
  getPMCalSchedCoreWhere,
  PM_CAL_PLANTS,
  applyPmCalSchedNonDateFilters,
  applyPmCalSchedDateRangeClause,
  buildPmCalSchedFilterClause,
  eqTypeKeyExpr,
  dateExprFromColumn,
} = require('../helpers/pmCalibrationScheduleQuery');
const { suggestedLabelForTypeKey } = require('../helpers/calibrationEqTypeFromEqcode');

const WO_STATUS_HISTORY = 9;

function displayLabelForTypeKey(typeKey) {
  if (!typeKey) return '';
  if (typeKey === '_UNPARSED') return 'Unparsed / other';
  return suggestedLabelForTypeKey(typeKey) || typeKey;
}

function scheduleStatusSummary(row) {
  if ((row?.schedWOStatusNo ?? null) === WO_STATUS_HISTORY || (row?.woStatusNo ?? null) === WO_STATUS_HISTORY) {
    return { key: 'done', label: 'Done' };
  }
  if ((row?.WONo ?? null) != null && row.WONo > 0) {
    return { key: 'in-progress', label: 'In Progress' };
  }
  return { key: 'pending', label: 'Pending' };
}

function plantInfoFromPmCode(pmCode) {
  const code = String(pmCode || '').trim().slice(0, 2).toUpperCase();
  const match = PM_CAL_PLANTS.find((p) => p.code === code);
  return {
    plantCode: code || null,
    plantLabel: match?.label || null,
  };
}

exports.getPmScheduleKpi = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfigNew);

    const request = pool.request();
    const built = buildPmCalSchedFilterClause(request, req.query);
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const kpiSql = `
      SELECT
        COUNT(*) AS totalCalibrationJobs,
        ISNULL(SUM(CASE WHEN wo.WOSTATUSNO = ${WO_STATUS_HISTORY} THEN 1 ELSE 0 END), 0) AS totalCompleted
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      WHERE ${built.whereFragment}
    `;

    const result = await request.query(kpiSql);
    const row = result.recordset[0] || {};

    const queryNoEqType = { ...req.query };
    delete queryNoEqType.eqType;
    const typeReq = pool.request();
    const builtTypes = buildPmCalSchedFilterClause(typeReq, queryNoEqType);
    if (builtTypes.error) {
      return res.status(400).json({ success: false, message: builtTypes.error });
    }

    const typeSql = `
      SELECT EqTypeKey AS typeKey, COUNT(*) AS scheduleCount
      FROM (
        SELECT ${eqTypeKeyExpr('eq')} AS EqTypeKey
        ${fromJoinPm}
        ${leftJoinEq}
        ${leftJoinWo}
        WHERE ${builtTypes.whereFragment}
      ) AS t
      GROUP BY EqTypeKey
      ORDER BY COUNT(*) DESC, EqTypeKey
    `;
    const typeResult = await typeReq.query(typeSql);
    const equipmentTypes = (typeResult.recordset || []).map((r) => {
      const key = r.typeKey;
      return {
        typeKey: key,
        count: r.scheduleCount ?? 0,
        displayLabel: displayLabelForTypeKey(key),
      };
    });

    res.json({
      success: true,
      data: {
        totalCalibrationJobs: row.totalCalibrationJobs ?? 0,
        totalCompleted: row.totalCompleted ?? 0,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        equipmentTypes,
      },
    });
  } catch (error) {
    console.error('Error in getPmScheduleKpi:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PM calibration schedule KPIs',
      error: error.message,
    });
  }
};

exports.getPmScheduleList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;

    const pool = await sql.connect(dbConfigNew);

    const countReq = pool.request();
    const builtCount = buildPmCalSchedFilterClause(countReq, req.query);
    if (builtCount.error) {
      return res.status(400).json({ success: false, message: builtCount.error });
    }

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const countSql = `
      SELECT COUNT(*) AS total
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      WHERE ${builtCount.whereFragment}
    `;
    const countResult = await countReq.query(countSql);
    const total = countResult.recordset[0]?.total || 0;

    const dataReq = pool.request();
    const builtData = buildPmCalSchedFilterClause(dataReq, req.query);
    if (builtData.error) {
      return res.status(400).json({ success: false, message: builtData.error });
    }

    dataReq.input('StartRow', sql.Int, startRow);
    dataReq.input('EndRow', sql.Int, endRow);

    const dueExpr = builtData.dueDateExpr;
    const typeKeySel = eqTypeKeyExpr('eq');
    const dataSql = `
      SELECT
        PMSchNo,
        PMNO,
        DUEDATE,
        WONo,
        schedWOStatusNo,
        PMCODE,
        PMNAME,
        DEPTNO,
        assigneeId,
        assigneeName,
        WOCODE,
        woStatusNo,
        EQCODE,
        eqTypeKey
      FROM (
        SELECT
          CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
          s.PMNO,
          s.DUEDATE,
          s.WONo,
          s.WOStatusNo AS schedWOStatusNo,
          pm.PMCODE,
          pm.PMNAME,
          pm.DEPTNO,
          pm.ASSIGN AS assigneeId,
          ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,'') AS assigneeName,
          wo.WOCODE,
          wo.WOSTATUSNO AS woStatusNo,
          eq.EQCODE,
          ${typeKeySel} AS eqTypeKey,
          ROW_NUMBER() OVER (ORDER BY ${dueExpr}, s.PMNO) AS RowNum
        ${fromJoinPm}
        ${leftJoinEq}
        ${leftJoinWo}
        LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
        WHERE ${builtData.whereFragment}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `;

    const dataResult = await dataReq.query(dataSql);

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
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error in getPmScheduleList:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PM calibration schedule list',
      error: error.message,
    });
  }
};

exports.getPmScheduleCalendarRange = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfigNew);
    const request = pool.request();

    const base = applyPmCalSchedNonDateFilters(request, req.query);
    if (base.error) {
      return res.status(400).json({ success: false, message: base.error });
    }

    const range = applyPmCalSchedDateRangeClause(request, {
      startDate: req.query.viewStartDate,
      endDate: req.query.viewEndDate,
      startParamName: 'ViewStartDate',
      endParamName: 'ViewEndDate',
      requiredMessage: 'viewStartDate and viewEndDate are required (YYYY-MM-DD)',
    });
    if (range.error) {
      return res.status(400).json({ success: false, message: range.error });
    }

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const dueExpr = range.dueDateExpr;
    const typeKeySel = eqTypeKeyExpr('eq');
    const sqlText = `
      SELECT
        CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
        s.PMNO,
        s.DUEDATE,
        s.WONo,
        s.WOStatusNo AS schedWOStatusNo,
        pm.PMCODE,
        pm.PMNAME,
        pm.DEPTNO,
        pm.ASSIGN AS assigneeId,
        ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,'') AS assigneeName,
        wo.WOCODE,
        wo.WOSTATUSNO AS woStatusNo,
        eq.EQCODE,
        ${typeKeySel} AS eqTypeKey
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
      WHERE ${[...base.parts, range.clause].join(' AND ')}
      ORDER BY ${dueExpr}, s.PMNO
    `;

    const result = await request.query(sqlText);
    const items = result.recordset || [];

    res.json({
      success: true,
      data: {
        items,
        rangeStart: req.query.viewStartDate,
        rangeEnd: req.query.viewEndDate,
        count: items.length,
      },
    });
  } catch (error) {
    console.error('Error in getPmScheduleCalendarRange:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PM calibration calendar range',
      error: error.message,
    });
  }
};

exports.getPmScheduleDetail = async (req, res) => {
  try {
    const pmSchId = req.params.pmSchNo || '';
    const sepIdx = pmSchId.indexOf('_');
    const pmNo = sepIdx > 0 ? parseInt(pmSchId.slice(0, sepIdx), 10) : NaN;
    const dueDate = sepIdx > 0 ? pmSchId.slice(sepIdx + 1) : '';
    if (Number.isNaN(pmNo) || !dueDate) {
      return res.status(400).json({ success: false, message: 'Valid pmSchNo is required (format: pmno_YYYYMMDD)' });
    }

    const pool = await sql.connect(dbConfigNew);
    const request = pool.request();
    request.input('PmNo', sql.Int, pmNo);
    request.input('DueDate', sql.VarChar(10), dueDate);

    const { fromJoinPm, leftJoinEq, leftJoinWo } = getPMCalSched();
    const typeKeySel = eqTypeKeyExpr('eq');
    const woDateExpr = dateExprFromColumn('wo.WODATE');
    const woFinishExpr = dateExprFromColumn('wo.ACT_FINISH_D');

    const sqlText = `
      SELECT TOP 1
        CAST(s.PMNO AS VARCHAR(10)) + '_' + s.DUEDATE AS PMSchNo,
        s.PMNO,
        s.DUEDATE,
        s.WONo,
        s.WOStatusNo AS schedWOStatusNo,
        pm.PMCODE,
        pm.PMNAME,
        pm.DEPTNO,
        d.DEPTCODE,
        d.DEPTNAME,
        pm.ASSIGN AS assigneeId,
        ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,'') AS assigneeName,
        wo.WOCODE,
        wo.WOSTATUSNO AS woStatusNo,
        wo.WODATE AS woDateRaw,
        wo.ACT_FINISH_D AS woFinishDateRaw,
        ${woDateExpr} AS woDate,
        ${woFinishExpr} AS woFinishDate,
        eq.EQCODE,
        eq.EQNAME,
        ${typeKeySel} AS eqTypeKey
      ${fromJoinPm}
      ${leftJoinEq}
      ${leftJoinWo}
      LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
      LEFT JOIN dbo.Dept d ON d.DEPTNO = pm.DEPTNO
      WHERE ${getPMCalSchedCoreWhere()}
        AND s.PMNO = @PmNo AND s.DUEDATE = @DueDate
    `;

    const result = await request.query(sqlText);
    const row = result.recordset?.[0];

    if (!row) {
      return res.status(404).json({ success: false, message: 'PM schedule detail not found' });
    }

    const status = scheduleStatusSummary(row);
    const plant = plantInfoFromPmCode(row.PMCODE);
    const eqTypeDisplayLabel = displayLabelForTypeKey(row.eqTypeKey);

    res.json({
      success: true,
      data: {
        ...row,
        ...plant,
        eqTypeDisplayLabel,
        derivedStatus: status.key,
        derivedStatusLabel: status.label,
      },
    });
  } catch (error) {
    console.error('Error in getPmScheduleDetail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PM schedule detail',
      error: error.message,
    });
  }
};

/**
 * Per-assignee KPI totals for the filtered date range.
 * Returns one row per assignee: totalScheduled, totalCompleted, totalRemaining.
 */
exports.getPmScheduleTeamKpi = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfigNew);
    const request = pool.request();
    const built = buildPmCalSchedFilterClause(request, req.query);
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    const { fromJoinPm, leftJoinWo } = getPMCalSched();

    const sqlText = `
      SELECT
        pm.ASSIGN AS assigneeId,
        COALESCE(
          NULLIF(LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))), N''),
          N'User ' + CAST(pm.ASSIGN AS nvarchar(20))
        ) AS assigneeName,
        COUNT(*) AS totalScheduled,
        SUM(CASE
          WHEN s.WOStatusNo = ${WO_STATUS_HISTORY} THEN 1
          WHEN s.WONo > 0 AND wo.WOSTATUSNO = ${WO_STATUS_HISTORY} THEN 1
          ELSE 0
        END) AS totalCompleted
      ${fromJoinPm}
      ${leftJoinWo}
      LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
      WHERE ${built.whereFragment}
        AND pm.ASSIGN IS NOT NULL
        AND pm.ASSIGN <> 0
      GROUP BY pm.ASSIGN, p.FIRSTNAME, p.LASTNAME
      ORDER BY assigneeName
    `;

    const result = await request.query(sqlText);
    const members = (result.recordset || []).map((r) => ({
      assigneeId: r.assigneeId,
      assigneeName: r.assigneeName,
      totalScheduled: r.totalScheduled ?? 0,
      totalCompleted: r.totalCompleted ?? 0,
      totalRemaining: (r.totalScheduled ?? 0) - (r.totalCompleted ?? 0),
    }));

    res.json({ success: true, data: { members } });
  } catch (error) {
    console.error('Error in getPmScheduleTeamKpi:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PM calibration team KPI',
      error: error.message,
    });
  }
};

/**
 * Distinct PM assignees for calibration plans (PMCODE contains -CAL), for filter dropdowns only.
 */
exports.getPmScheduleAssignees = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfigNew);
    const sqlText = `
      SELECT DISTINCT
        pm.ASSIGN AS id,
        COALESCE(
          NULLIF(LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))), N''),
          N'User ' + CAST(pm.ASSIGN AS nvarchar(20))
        ) AS name
      FROM dbo.PM pm
      LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
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
    });
  } catch (error) {
    console.error('Error in getPmScheduleAssignees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PM calibration assignees',
      error: error.message,
    });
  }
};
