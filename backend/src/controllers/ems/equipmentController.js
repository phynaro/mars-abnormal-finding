/**
 * EMS Equipment Registry Controller — IgxEQExtension + Cedar WO/PM.
 */

const fs = require('fs').promises;
const path = require('path');
const sql = require('mssql');
const { getCedarPool } = require('../../config/getCedarPool');
const { compressEquipmentImage } = require('../../utils/imageCompression');
const {
  emsEquipmentFromJoin,
  openCalApplySql,
  applyEmsPlantAreaFilters,
  parseStatusFilter,
  parseKpiBucketFilter,
  kpiBucketCaseExpr,
  paginationMeta,
  equipmentStatusCaseExpr,
  plantFromTagExpr,
  dateExprFromColumn,
  ALLOWED_PLANT_PREFIXES,
  PM_CAL_PLANTS,
  WO_FINISHED_SQL,
} = require('../../helpers/emsQueryHelpers');
const { calculateEquipmentStatus, plantFromTagNo } = require('../../services/ems/statusCalculationService');

const EQUIPMENT_LIST_SORT_COLUMNS = {
  tagNo: 'ext.tag_no',
  description: 'ISNULL(ext.description, eq.EQNAME)',
  area: 'ext.location',
  equipmentType: 'ext.equipment_type',
  nextDue: 'cal.DUEDATE',
};

/** CCP-prefixed codes first, then other values, then blank/null — alphabetical within each tier. */
function ccpCodeOrderExpr(sortOrder) {
  const tierExpr = `CASE
    WHEN ext.ccp_code IS NULL OR LTRIM(RTRIM(ext.ccp_code)) = '' THEN 2
    WHEN UPPER(LTRIM(RTRIM(ext.ccp_code))) LIKE 'CCP%' THEN 0
    ELSE 1
  END`;
  return `${tierExpr} ASC, ext.ccp_code ${sortOrder}, ext.tag_no ASC`;
}

function parseEquipmentListSort(query) {
  const sortBy = String(query.sortBy || 'ccpCode').trim();
  const sortOrder = String(query.sortOrder || 'ASC').trim().toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  if (sortBy === 'ccpCode') {
    return ccpCodeOrderExpr(sortOrder);
  }
  const column = EQUIPMENT_LIST_SORT_COLUMNS[sortBy];
  if (!column) {
    return ccpCodeOrderExpr(sortOrder);
  }
  return `${column} ${sortOrder}, ext.tag_no ASC`;
}

function mapEquipmentRow(row) {
  return {
    tagNo: row.tagNo,
    eqNo: row.eqno,
    description: row.description,
    plant: row.plant,
    area: row.area,
    manufacturer: row.manufacturer,
    model: row.model,
    equipmentType: row.equipment_type,
    calInterval: row.cal_interval,
    ccpCode: row.ccp_code || null,
    status: row.status,
    nextDue: row.nextDueRaw || null,
    assigneeName: row.assigneeName || null,
  };
}

function mapExtensionFields(row) {
  return {
    tagNo: row.tag_no,
    eqNo: row.eqno,
    description: row.description,
    plant: plantFromTagNo(row.tag_no),
    area: row.location,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNo: row.serial_no,
    equipmentType: row.equipment_type,
    workingRange: {
      min: row.working_range_min,
      max: row.working_range_max,
      unit: row.working_range_unit,
      points: row.working_range_points,
      raw: row.working_range_raw,
      type: row.working_range_type,
    },
    calRange: {
      min: row.cal_range_min,
      max: row.cal_range_max,
      unit: row.cal_range_unit,
      points: row.cal_range_points,
      raw: row.cal_range_raw,
      type: row.cal_range_type,
    },
    mpe: {
      type: row.mpe_type,
      value: row.mpe_value,
      unit: row.mpe_unit,
      condition: row.mpe_condition,
      raw: row.mpe_raw,
    },
    ccpCode: row.ccp_code,
    calRefWi: row.cal_ref_wi,
    calRefForm: row.cal_ref_form,
    calInterval: row.cal_interval,
    calIntervalWeeks: row.cal_interval_weeks,
    imageUrl: row.image_url || null,
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null,
    updatedByName: row.updatedByName?.trim() || null,
  };
}

const EDITABLE_FIELD_MAP = {
  description: { column: 'description', type: sql.NVarChar(500) },
  area: { column: 'location', type: sql.NVarChar(255) },
  manufacturer: { column: 'manufacturer', type: sql.NVarChar(255) },
  model: { column: 'model', type: sql.NVarChar(255) },
  serialNo: { column: 'serial_no', type: sql.NVarChar(255) },
  equipmentType: { column: 'equipment_type', type: sql.NVarChar(100) },
  workingRangeMin: { column: 'working_range_min', type: sql.Float, numeric: true },
  workingRangeMax: { column: 'working_range_max', type: sql.Float, numeric: true },
  workingRangeUnit: { column: 'working_range_unit', type: sql.NVarChar(50) },
  workingRangePoints: { column: 'working_range_points', type: sql.Int, numeric: true },
  calRangeMin: { column: 'cal_range_min', type: sql.Float, numeric: true },
  calRangeMax: { column: 'cal_range_max', type: sql.Float, numeric: true },
  calRangeUnit: { column: 'cal_range_unit', type: sql.NVarChar(50) },
  calRangePoints: { column: 'cal_range_points', type: sql.Int, numeric: true },
  mpeType: { column: 'mpe_type', type: sql.NVarChar(50) },
  mpeValue: { column: 'mpe_value', type: sql.Float, numeric: true },
  mpeUnit: { column: 'mpe_unit', type: sql.NVarChar(50) },
  mpeCondition: { column: 'mpe_condition', type: sql.NVarChar(255) },
  ccpCode: { column: 'ccp_code', type: sql.NVarChar(100) },
  calRefWi: { column: 'cal_ref_wi', type: sql.NVarChar(255) },
  calRefForm: { column: 'cal_ref_form', type: sql.NVarChar(255) },
  calInterval: { column: 'cal_interval', type: sql.NVarChar(100) },
  calIntervalWeeks: { column: 'cal_interval_weeks', type: sql.Int, numeric: true },
};

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseUpdatePayload(body) {
  if (body?.payload && typeof body.payload === 'string') {
    try {
      return JSON.parse(body.payload);
    } catch {
      return {};
    }
  }
  return body || {};
}

function sanitizeTagForFilename(tagNo) {
  return String(tagNo || 'equipment').replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function saveEquipmentImage(file, eqNo, tagNo, previousImageUrl) {
  const safeTag = sanitizeTagForFilename(tagNo);
  const timestamp = Date.now();
  const fileName = `${safeTag}_${timestamp}.jpg`;
  const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'equipment', String(eqNo));
  await fs.mkdir(uploadDir, { recursive: true });

  const compressed = await compressEquipmentImage(file.buffer);
  const fullPath = path.join(uploadDir, fileName);
  await fs.writeFile(fullPath, compressed);

  const relativePath = `/uploads/equipment/${eqNo}/${fileName}`;

  if (previousImageUrl && previousImageUrl.startsWith('/uploads/equipment/')) {
    const oldPath = path.join(__dirname, '..', '..', '..', previousImageUrl.replace(/^\//, ''));
    await fs.unlink(oldPath).catch(() => {});
  }

  return relativePath;
}

async function fetchEquipmentExtRow(pool, tagNo) {
  const extResult = await pool.request()
    .input('TagNo', sql.NVarChar(50), tagNo)
    .query(`
      SELECT ext.*, eq.EQNAME,
        LTRIM(RTRIM(ISNULL(upd.FIRSTNAME,'') + ' ' + ISNULL(upd.LASTNAME,''))) AS updatedByName
      ${emsEquipmentFromJoin()}
      LEFT JOIN dbo.Person upd ON upd.PERSONNO = ext.updated_by
      WHERE ext.tag_no = @TagNo
    `);
  return extResult.recordset[0] || null;
}

async function buildEquipmentDetailData(pool, extRow, historyLimit = 5) {
  const eqNo = extRow.eqno;
  const woFinishExpr = dateExprFromColumn('wo.ACT_FINISH_D');
  const woSchedFinishExpr = dateExprFromColumn('wo.SCH_FINISH_D');

  const calResult = await pool.request()
    .input('EqNo', sql.Int, eqNo)
    .query(`
      SELECT TOP 1
        s.DUEDATE,
        wo.SCH_FINISH_D,
        wo.SCH_FINISH_T,
        (
          CASE
            WHEN s.WONo > 0 AND wo.WONO IS NOT NULL AND ${woSchedFinishExpr} IS NOT NULL
            THEN DATEADD(
              minute,
              (
                CASE
                  WHEN wo.SCH_FINISH_T IS NULL THEN 0
                  WHEN ISNUMERIC(LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10))))) = 0 THEN 0
                  ELSE
                    CASE
                      WHEN CAST(LEFT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT) NOT BETWEEN 0 AND 23 THEN 0
                      WHEN CAST(RIGHT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT) NOT BETWEEN 0 AND 59 THEN 0
                      ELSE CAST(LEFT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT) * 60
                        + CAST(RIGHT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT)
                    END
                END
              ),
              CAST(${woSchedFinishExpr} AS DATETIME)
            )
            ELSE NULL
          END
        ) AS dueDateTime,
        s.WONo,
        s.WOStatusNo AS schedWOStatusNo,
        wo.WOSTATUSNO AS woStatusNo,
        wo.WOCODE,
        pm.ASSIGN AS assigneeId,
        LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName
      FROM dbo.PM pm
      INNER JOIN dbo.PMSched s ON s.PMNO = pm.PMNO
      LEFT JOIN dbo.WO wo ON wo.WONO = s.WONo AND s.WONo > 0
        AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')
      LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
      WHERE pm.EQNO = @EqNo
        AND pm.PMCODE LIKE '%-CAL%'
        AND (pm.FREEZE IS NULL OR LTRIM(RTRIM(pm.FREEZE)) <> 'T')
        AND (pm.FLAGDEL IS NULL OR pm.FLAGDEL <> 'T')
        AND NOT (${WO_FINISHED_SQL})
      ORDER BY
        CASE
          WHEN s.WONo > 0 AND wo.WONO IS NOT NULL AND ${woSchedFinishExpr} IS NOT NULL THEN 0
          ELSE 1
        END,
        COALESCE(
          CASE
            WHEN s.WONo > 0 AND wo.WONO IS NOT NULL AND ${woSchedFinishExpr} IS NOT NULL
            THEN DATEADD(
              minute,
              (
                CASE
                  WHEN wo.SCH_FINISH_T IS NULL THEN 0
                  WHEN ISNUMERIC(LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10))))) = 0 THEN 0
                  ELSE
                    CASE
                      WHEN CAST(LEFT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT) NOT BETWEEN 0 AND 23 THEN 0
                      WHEN CAST(RIGHT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT) NOT BETWEEN 0 AND 59 THEN 0
                      ELSE CAST(LEFT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT) * 60
                        + CAST(RIGHT(RIGHT('0000' + LTRIM(RTRIM(CAST(wo.SCH_FINISH_T AS VARCHAR(10)))), 4), 2) AS INT)
                    END
                END
              ),
              CAST(${woSchedFinishExpr} AS DATETIME)
            )
            ELSE NULL
          END,
          CAST(${dateExprFromColumn('s.DUEDATE')} AS DATETIME)
        ) ASC
    `);

  const cal = calResult.recordset[0] || null;
  const status = calculateEquipmentStatus({
    dueDate: cal?.dueDateTime || cal?.DUEDATE,
    woStatusNo: cal?.woStatusNo,
    schedWoStatusNo: cal?.schedWOStatusNo,
    woNo: cal?.WONo,
    hasOpenSchedule: !!cal,
  });

  const safeHistoryLimit = Math.min(100, Math.max(1, parseInt(historyLimit, 10) || 5));

  const historyResult = await pool.request()
    .input('EqNo', sql.Int, eqNo)
    .input('HistoryLimit', sql.Int, safeHistoryLimit)
    .query(`
      SELECT TOP (@HistoryLimit)
        wo.WONO AS woNo,
        wo.WOCODE AS woCode,
        ${woFinishExpr} AS completedDate,
        LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS performedBy
      FROM dbo.WO wo
      INNER JOIN dbo.PM pm ON pm.PMNO = wo.PMNO
      LEFT JOIN dbo.Person p ON p.PERSONNO = wo.ASSIGN
      WHERE pm.EQNO = @EqNo
        AND pm.PMCODE LIKE '%-CAL%'
        AND wo.WOSTATUSNO IN (7, 9)
        AND (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')
      ORDER BY ${woFinishExpr} DESC, wo.WONO DESC
    `);

  const identity = mapExtensionFields(extRow);
  identity.status = status;

  const currentWo = cal
    ? {
        woNo: cal.WONo,
        woCode: cal.WOCODE,
        dueDate: cal.dueDateTime || cal.DUEDATE,
        woStatusNo: cal.woStatusNo ?? cal.schedWOStatusNo,
        assignedCalibrator: cal.assigneeName || null,
        assigneeId: cal.assigneeId ?? null,
      }
    : null;

  return {
    identity,
    specifications: {
      workingRange: identity.workingRange,
      calRange: identity.calRange,
      mpe: identity.mpe,
      calInterval: identity.calInterval,
      calIntervalWeeks: identity.calIntervalWeeks,
      ccpCode: identity.ccpCode,
      calRefWi: identity.calRefWi,
      calRefForm: identity.calRefForm,
    },
    currentWo,
    pmHistory: historyResult.recordset || [],
  };
}

/**
 * GET /api/ems/equipment
 */
exports.listEquipment = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;
    const search = (req.query.search || '').trim();
    const equipmentType = (req.query.equipmentType || '').trim();
    const kpiBucket = parseKpiBucketFilter(req.query);
    const statusFilters = kpiBucket ? [] : parseStatusFilter(req.query);

    const pool = await getCedarPool();
    const statusExpr = equipmentStatusCaseExpr('cal.dueDateTime');
    const bucketExpr = kpiBucketCaseExpr('cal.dueDateTime');

    const countReq = pool.request();
    const whereParts = [...applyEmsPlantAreaFilters(countReq, req.query)];
    if (search) {
      countReq.input('Search', sql.NVarChar(200), `%${search}%`);
      whereParts.push(`(ext.tag_no LIKE @Search OR ext.description LIKE @Search)`);
    }
    if (equipmentType) {
      countReq.input('EqType', sql.NVarChar(100), equipmentType);
      whereParts.push(`ext.equipment_type = @EqType`);
    }
    if (kpiBucket) {
      countReq.input('KpiBucket', sql.NVarChar(20), kpiBucket);
      whereParts.push(`${bucketExpr} = @KpiBucket`);
    } else if (statusFilters.length > 0) {
      statusFilters.forEach((s, i) => countReq.input(`St${i}`, sql.NVarChar(20), s));
      whereParts.push(`${statusExpr} IN (${statusFilters.map((_, i) => `@St${i}`).join(', ')})`);
    }
    const whereClause = whereParts.length ? whereParts.join(' AND ') : '1=1';

    const countSql = `
      SELECT COUNT(*) AS total
      ${emsEquipmentFromJoin()}
      ${openCalApplySql()}
      LEFT JOIN dbo.Person p ON p.PERSONNO = cal.assigneeId
      WHERE ${whereClause}
    `;
    const countResult = await countReq.query(countSql);
    const total = countResult.recordset[0]?.total || 0;

    const dataReq = pool.request();
    const dataWhereParts = [...applyEmsPlantAreaFilters(dataReq, req.query)];
    if (search) {
      dataReq.input('Search', sql.NVarChar(200), `%${search}%`);
      dataWhereParts.push(`(ext.tag_no LIKE @Search OR ext.description LIKE @Search)`);
    }
    if (equipmentType) {
      dataReq.input('EqType', sql.NVarChar(100), equipmentType);
      dataWhereParts.push(`ext.equipment_type = @EqType`);
    }
    if (kpiBucket) {
      dataReq.input('KpiBucket', sql.NVarChar(20), kpiBucket);
      dataWhereParts.push(`${bucketExpr} = @KpiBucket`);
    } else if (statusFilters.length > 0) {
      statusFilters.forEach((s, i) => dataReq.input(`St${i}`, sql.NVarChar(20), s));
      dataWhereParts.push(`${statusExpr} IN (${statusFilters.map((_, i) => `@St${i}`).join(', ')})`);
    }
    const dataWhere = dataWhereParts.length ? dataWhereParts.join(' AND ') : '1=1';

    dataReq.input('StartRow', sql.Int, startRow);
    dataReq.input('EndRow', sql.Int, endRow);

    const orderBy = parseEquipmentListSort(req.query);

    const dataSql = `
      SELECT tagNo, eqno, description, plant, area, manufacturer, model, equipment_type,
             cal_interval, ccp_code, status, nextDueRaw, assigneeName
      FROM (
        SELECT
          ext.tag_no AS tagNo,
          ext.eqno,
          ISNULL(ext.description, eq.EQNAME) AS description,
          ${plantFromTagExpr('ext.tag_no')} AS plant,
          ext.location AS area,
          ext.manufacturer,
          ext.model,
          ext.equipment_type,
          ext.cal_interval,
          ext.ccp_code,
          ${statusExpr} AS status,
          cal.dueDateTime AS nextDueRaw,
          LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName,
          ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNum
        ${emsEquipmentFromJoin()}
        ${openCalApplySql()}
        LEFT JOIN dbo.Person p ON p.PERSONNO = cal.assigneeId
        WHERE ${dataWhere}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `;

    const dataResult = await dataReq.query(dataSql);
    const items = (dataResult.recordset || []).map(mapEquipmentRow);

    res.json({
      success: true,
      data: { items, pagination: paginationMeta(page, limit, total) },
      message: 'EMS equipment list',
    });
  } catch (error) {
    console.error('EMS listEquipment error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch equipment list', error: error.message });
  }
};

/**
 * GET /api/ems/equipment/filters
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const pool = await getCedarPool();
    const plantParam = req.query.plant ? String(req.query.plant).trim().toUpperCase() : '';

    const plantsResult = await pool.request().query(`
      SELECT DISTINCT ${plantFromTagExpr('ext.tag_no')} AS plant
      ${emsEquipmentFromJoin()}
      ORDER BY plant
    `);

    const areasReq = pool.request();
    let areasSql = `
      SELECT DISTINCT LTRIM(RTRIM(ext.location)) AS area
      ${emsEquipmentFromJoin()}
      WHERE ext.location IS NOT NULL AND LTRIM(RTRIM(ext.location)) <> ''
    `;
    if (plantParam && ALLOWED_PLANT_PREFIXES.includes(plantParam)) {
      areasReq.input('Plant', sql.NVarChar(20), plantParam);
      areasSql += ` AND ${plantFromTagExpr('ext.tag_no')} = @Plant`;
    }
    areasSql += ' ORDER BY area';
    const areasResult = await areasReq.query(areasSql);

    const typesResult = await pool.request().query(`
      SELECT DISTINCT ext.equipment_type AS equipmentType
      ${emsEquipmentFromJoin()}
      WHERE ext.equipment_type IS NOT NULL AND LTRIM(RTRIM(ext.equipment_type)) <> ''
      ORDER BY ext.equipment_type
    `);

    const plants = (plantsResult.recordset || []).map((r) => ({
      code: r.plant,
      label: PM_CAL_PLANTS.find((p) => p.code === r.plant)?.label || r.plant,
    }));

    res.json({
      success: true,
      data: {
        plants,
        areas: (areasResult.recordset || []).map((r) => r.area).filter(Boolean),
        equipmentTypes: (typesResult.recordset || []).map((r) => r.equipmentType).filter(Boolean),
        statuses: ['OVERDUE', 'DUE SOON', 'OK', 'NO WO'],
      },
      message: 'EMS equipment filter options',
    });
  } catch (error) {
    console.error('EMS getFilterOptions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch filter options', error: error.message });
  }
};

/**
 * GET /api/ems/equipment/:tagNo
 */
exports.getEquipmentDetail = async (req, res) => {
  try {
    const tagNo = (req.params.tagNo || '').trim();
    if (!tagNo) {
      return res.status(400).json({ success: false, message: 'tagNo is required' });
    }

    const pool = await getCedarPool();
    const extRow = await fetchEquipmentExtRow(pool, tagNo);

    if (!extRow) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const historyLimit = Math.min(100, Math.max(1, parseInt(req.query.historyLimit, 10) || 5));
    const data = await buildEquipmentDetailData(pool, extRow, historyLimit);

    res.json({
      success: true,
      data,
      message: 'EMS equipment detail',
    });
  } catch (error) {
    console.error('EMS getEquipmentDetail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch equipment detail', error: error.message });
  }
};

/**
 * PUT /api/ems/equipment/:tagNo
 */
exports.updateEquipment = async (req, res) => {
  try {
    const tagNo = (req.params.tagNo || '').trim();
    if (!tagNo) {
      return res.status(400).json({ success: false, message: 'tagNo is required' });
    }

    const pool = await getCedarPool();
    const extRow = await fetchEquipmentExtRow(pool, tagNo);

    if (!extRow) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const payload = parseUpdatePayload(req.body);
    const personNo = String(req.user.id);
    const setParts = ['updated_at = GETDATE()', 'updated_by = @UpdatedBy'];
    const updateReq = pool.request()
      .input('TagNo', sql.NVarChar(50), tagNo)
      .input('UpdatedBy', sql.NVarChar(50), personNo);

    let paramIndex = 0;
    for (const [key, config] of Object.entries(EDITABLE_FIELD_MAP)) {
      if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
      const rawValue = payload[key];
      const paramName = `P${paramIndex}`;
      paramIndex += 1;

      let value;
      if (config.numeric) {
        value = parseOptionalNumber(rawValue);
      } else {
        value = rawValue === '' || rawValue === null || rawValue === undefined ? null : String(rawValue);
      }

      updateReq.input(paramName, config.type, value);
      setParts.push(`${config.column} = @${paramName}`);
    }

    if (req.file) {
      const imageUrl = await saveEquipmentImage(req.file, extRow.eqno, tagNo, extRow.image_url);
      updateReq.input('ImageUrl', sql.NVarChar(500), imageUrl);
      setParts.push('image_url = @ImageUrl');
    }

    if (setParts.length <= 2 && !req.file) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    await updateReq.query(`
      UPDATE dbo.IgxEQExtension
      SET ${setParts.join(', ')}
      WHERE tag_no = @TagNo
    `);

    const refreshedRow = await fetchEquipmentExtRow(pool, tagNo);
    const historyLimit = Math.min(100, Math.max(1, parseInt(req.query.historyLimit, 10) || 5));
    const data = await buildEquipmentDetailData(pool, refreshedRow, historyLimit);

    res.json({
      success: true,
      data,
      message: 'Equipment updated successfully',
    });
  } catch (error) {
    console.error('EMS updateEquipment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update equipment', error: error.message });
  }
};
