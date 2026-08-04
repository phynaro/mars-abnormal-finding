/**
 * EMS Work Orders Controller — calibration WO execution history (registry-scoped).
 */

const sql = require('mssql');
const { getCedarPool } = require('../../config/getCedarPool');
const {
  applyEmsPlantAreaFilters,
  paginationMeta,
  plantFromTagExpr,
  eqActiveWhere,
  woSchFinishDateExpr,
  woActFinishDateExpr,
  woCompletionStatusExpr,
} = require('../../helpers/emsQueryHelpers');
const { PM_CAL_PLANTS } = require('../../helpers/pmCalibrationScheduleQuery');

const ALLOWED_STATUS = new Set(['ontime', 'late', 'not_finish']);
const ALLOWED_PLANTS = new Set(PM_CAL_PLANTS.map((p) => p.code));

function parseStatus(raw) {
  const value = raw != null ? String(raw).trim().toLowerCase() : '';
  if (!value || value === 'all') return '';
  if (!ALLOWED_STATUS.has(value)) return null;
  return value;
}

function applyPlantGuard(request, query, parts) {
  const plantRaw = query.plant != null ? String(query.plant).trim().toUpperCase() : '';
  if (!plantRaw) return;
  if (!ALLOWED_PLANTS.has(plantRaw)) return;
  request.input('WoPlant', sql.NVarChar(20), plantRaw);
  parts.push(`${plantFromTagExpr('ext.tag_no')} = @WoPlant`);
}

function buildWoFilters(request, query) {
  const parts = [
    `pm.PMCODE LIKE '%-CAL%'`,
    `(pm.FREEZE IS NULL OR LTRIM(RTRIM(pm.FREEZE)) <> 'T')`,
    `(pm.FLAGDEL IS NULL OR LTRIM(RTRIM(pm.FLAGDEL)) <> 'T')`,
    `(wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')`,
    `EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)`,
  ];

  const schFinishExpr = woSchFinishDateExpr('wo');
  const actFinishExpr = woActFinishDateExpr('wo');
  const statusExpr = woCompletionStatusExpr('wo');
  parts.push(`${schFinishExpr} IS NOT NULL`);

  applyPlantGuard(request, query, parts);
  parts.push(...applyEmsPlantAreaFilters(request, query, { extAlias: 'ext' }));

  const status = parseStatus(query.status);
  if (status === null) {
    return {
      error: 'status must be one of: ontime, late, not_finish',
      whereFragment: '',
      schFinishExpr,
      actFinishExpr,
      statusExpr,
    };
  }
  if (status) {
    request.input('WoStatusFilter', sql.NVarChar(20), status);
    parts.push(`${statusExpr} = @WoStatusFilter`);
  }

  const schFrom = query.schFrom != null ? String(query.schFrom).trim() : '';
  const schTo = query.schTo != null ? String(query.schTo).trim() : '';
  if (schFrom) {
    request.input('WoSchFrom', sql.Date, schFrom);
    parts.push(`${schFinishExpr} >= @WoSchFrom`);
  }
  if (schTo) {
    request.input('WoSchTo', sql.Date, schTo);
    parts.push(`${schFinishExpr} <= @WoSchTo`);
  }

  const q = query.q != null ? String(query.q).trim() : '';
  if (q) {
    request.input('WoQuery', sql.NVarChar(100), `%${q}%`);
    parts.push(`(ext.tag_no LIKE @WoQuery OR wo.WOCODE LIKE @WoQuery)`);
  }

  return {
    error: null,
    whereFragment: parts.join(' AND '),
    schFinishExpr,
    actFinishExpr,
    statusExpr,
  };
}

/**
 * GET /api/ems/work-orders
 */
exports.getWorkOrderList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const startRow = (page - 1) * limit + 1;
    const endRow = page * limit;

    const pool = await getCedarPool();

    const countReq = pool.request();
    const countBuilt = buildWoFilters(countReq, req.query);
    if (countBuilt.error) {
      return res.status(400).json({ success: false, message: countBuilt.error });
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM dbo.WO wo
      INNER JOIN dbo.PM pm ON pm.PMNO = wo.PMNO
      INNER JOIN dbo.EQ eq ON eq.EQNO = pm.EQNO AND ${eqActiveWhere('eq')}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      WHERE ${countBuilt.whereFragment}
    `;
    const countResult = await countReq.query(countSql);
    const total = countResult.recordset?.[0]?.total || 0;

    const dataReq = pool.request();
    const dataBuilt = buildWoFilters(dataReq, req.query);
    if (dataBuilt.error) {
      return res.status(400).json({ success: false, message: dataBuilt.error });
    }

    dataReq.input('WoStartRow', sql.Int, startRow);
    dataReq.input('WoEndRow', sql.Int, endRow);

    const dataSql = `
      SELECT *
      FROM (
        SELECT
          wo.WONO AS woNo,
          wo.WOCODE AS woCode,
          ext.tag_no AS tagNo,
          ISNULL(ext.description, eq.EQNAME) AS description,
          ${plantFromTagExpr('ext.tag_no')} AS plant,
          ext.location AS area,
          ${dataBuilt.statusExpr} AS status,
          ${dataBuilt.schFinishExpr} AS schFinishDate,
          ${dataBuilt.actFinishExpr} AS actFinishDate,
          wo.ASSIGN AS assigneeId,
          LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName,
          ROW_NUMBER() OVER (ORDER BY ${dataBuilt.schFinishExpr} DESC, wo.WONO DESC) AS RowNum
        FROM dbo.WO wo
        INNER JOIN dbo.PM pm ON pm.PMNO = wo.PMNO
        INNER JOIN dbo.EQ eq ON eq.EQNO = pm.EQNO AND ${eqActiveWhere('eq')}
        INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
        LEFT JOIN dbo.Person p ON p.PERSONNO = wo.ASSIGN
        WHERE ${dataBuilt.whereFragment}
      ) AS Ordered
      WHERE RowNum >= @WoStartRow AND RowNum <= @WoEndRow
    `;

    const result = await dataReq.query(dataSql);
    const items = (result.recordset || []).map((row) => ({
      woNo: row.woNo ?? null,
      woCode: row.woCode ?? null,
      tagNo: row.tagNo,
      description: row.description ?? null,
      plant: row.plant,
      area: row.area ?? null,
      status: row.status,
      schFinishDate: row.schFinishDate ?? null,
      actFinishDate: row.actFinishDate ?? null,
      assigneeName: row.assigneeName || null,
      assigneeId: row.assigneeId ?? null,
    }));

    res.json({
      success: true,
      data: { items, pagination: paginationMeta(page, limit, total) },
      message: 'EMS work order list',
    });
  } catch (error) {
    console.error('EMS getWorkOrderList error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS work orders', error: error.message });
  }
};

/**
 * GET /api/ems/work-orders/kpi
 */
exports.getWorkOrderKpi = async (req, res) => {
  try {
    const pool = await getCedarPool();
    const request = pool.request();
    const built = buildWoFilters(request, req.query);
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    const sqlText = `
      SELECT
        COUNT(*) AS total,
        ISNULL(SUM(CASE WHEN ${built.statusExpr} = 'ontime' THEN 1 ELSE 0 END), 0) AS ontime,
        ISNULL(SUM(CASE WHEN ${built.statusExpr} = 'late' THEN 1 ELSE 0 END), 0) AS late,
        ISNULL(SUM(CASE WHEN ${built.statusExpr} = 'not_finish' THEN 1 ELSE 0 END), 0) AS notFinish
      FROM dbo.WO wo
      INNER JOIN dbo.PM pm ON pm.PMNO = wo.PMNO
      INNER JOIN dbo.EQ eq ON eq.EQNO = pm.EQNO AND ${eqActiveWhere('eq')}
      INNER JOIN dbo.IgxEQExtension ext ON ext.eqno = eq.EQNO
      WHERE ${built.whereFragment}
    `;

    const result = await request.query(sqlText);
    const row = result.recordset?.[0] || {};
    res.json({
      success: true,
      data: {
        total: row.total ?? 0,
        ontime: row.ontime ?? 0,
        late: row.late ?? 0,
        notFinish: row.notFinish ?? 0,
      },
      message: 'EMS work order KPI',
    });
  } catch (error) {
    console.error('EMS getWorkOrderKpi error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EMS work order KPI', error: error.message });
  }
};
