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
  mapDueFields,
  openWoApplySql,
  openCalNotFinishedWhere,
  effectiveDueDateTimeExpr,
  dueDateSourceExpr,
  woTargetDateTimeExpr,
  emsEquipmentCalPrepSql,
} = require('../../helpers/emsQueryHelpers');
const { calculateEquipmentStatus, plantFromTagNo } = require('../../services/ems/statusCalculationService');
const {
  computeEquipmentChanges,
  insertEquipmentChangeLog,
  fetchEquipmentChangeHistory,
} = require('../../services/ems/equipmentChangeLogService');

const DECORATED_SORT_COLUMNS = {
  tagNo: 'tagNo',
  description: 'description',
  area: 'area',
  equipmentType: 'equipment_type',
  nextDue: 'effectiveDueDate',
};

/** CCP-prefixed codes first, then other values, then blank/null — alphabetical within each tier. */
function decoratedSortOrderBy(query) {
  const sortBy = String(query.sortBy || 'ccpCode').trim();
  const sortOrder = String(query.sortOrder || 'ASC').trim().toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  if (sortBy === 'ccpCode' || !DECORATED_SORT_COLUMNS[sortBy]) {
    return `CASE
      WHEN ccp_code IS NULL OR LTRIM(RTRIM(ccp_code)) = '' THEN 2
      WHEN UPPER(LTRIM(RTRIM(ccp_code))) LIKE 'CCP%' THEN 0
      ELSE 1
    END ASC, ccp_code ${sortOrder}, tagNo ASC`;
  }
  return `${DECORATED_SORT_COLUMNS[sortBy]} ${sortOrder}, tagNo ASC`;
}

function applyEquipmentListIdentityFilters(request, query, search, equipmentType) {
  const whereParts = [...applyEmsPlantAreaFilters(request, query)];
  if (search) {
    request.input('Search', sql.NVarChar(200), `%${search}%`);
    whereParts.push(`(ext.tag_no LIKE @Search OR ext.description LIKE @Search)`);
  }
  if (equipmentType) {
    request.input('EqType', sql.NVarChar(100), equipmentType);
    whereParts.push(`ext.equipment_type = @EqType`);
  }
  return whereParts;
}

function mapEquipmentRow(row) {
  const due = mapDueFields(row);
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
    scheduleDueDate: due.scheduleDueDate,
    woTargetDate: due.woTargetDate,
    effectiveDueDate: due.effectiveDueDate,
    dueDateSource: due.dueDateSource,
    nextDue: due.effectiveDueDate,
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
  const effectiveExpr = effectiveDueDateTimeExpr('s', 'pm', 'openWo');
  const woTargetExpr = woTargetDateTimeExpr('openWo');
  const sourceExpr = dueDateSourceExpr('s', 'pm', 'openWo');

  const calResult = await pool.request()
    .input('EqNo', sql.Int, eqNo)
    .query(`
      SELECT TOP 1
        s.DUEDATE,
        ${woTargetExpr} AS woTargetDate,
        ${effectiveExpr} AS effectiveDueDate,
        ${sourceExpr} AS dueDateSource,
        openWo.WONO AS openWoNo,
        s.WOStatusNo AS schedWOStatusNo,
        openWo.WOSTATUSNO AS woStatusNo,
        openWo.WOCODE,
        pm.ASSIGN AS assigneeId,
        LTRIM(RTRIM(ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,''))) AS assigneeName
      FROM dbo.PM pm
      INNER JOIN dbo.PMSched s ON s.PMNO = pm.PMNO
      ${openWoApplySql('pm', 'openWo')}
      LEFT JOIN dbo.Person p ON p.PERSONNO = pm.ASSIGN
      WHERE pm.EQNO = @EqNo
        AND pm.PMCODE LIKE '%-CAL%'
        AND (pm.FREEZE IS NULL OR LTRIM(RTRIM(pm.FREEZE)) <> 'T')
        AND (pm.FLAGDEL IS NULL OR pm.FLAGDEL <> 'T')
        AND ${openCalNotFinishedWhere()}
      ORDER BY ${effectiveExpr} ASC
    `);

  const cal = calResult.recordset[0] || null;
  const due = cal ? mapDueFields(cal) : null;
  const status = calculateEquipmentStatus({
    dueDate: due?.effectiveDueDate ?? null,
    woStatusNo: cal?.woStatusNo,
    schedWoStatusNo: cal?.schedWOStatusNo,
    woNo: cal?.openWoNo,
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
        woNo: cal.openWoNo ?? null,
        woCode: cal.WOCODE,
        scheduleDueDate: due?.scheduleDueDate ?? cal.DUEDATE,
        woTargetDate: due?.woTargetDate ?? null,
        effectiveDueDate: due?.effectiveDueDate ?? null,
        dueDateSource: due?.dueDateSource ?? null,
        dueDate: due?.effectiveDueDate ?? null,
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
    const startedAt = Date.now();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const equipmentType = (req.query.equipmentType || '').trim();
    const kpiBucket = parseKpiBucketFilter(req.query);
    const statusFilters = kpiBucket ? [] : parseStatusFilter(req.query);
    const orderBy = decoratedSortOrderBy(req.query);

    const pool = await getCedarPool();
    const statusExpr = equipmentStatusCaseExpr('cal.effectiveDueDate');
    const bucketExpr = kpiBucketCaseExpr('cal.effectiveDueDate');

    const dataReq = pool.request();
    const identityParts = applyEquipmentListIdentityFilters(dataReq, req.query, search, equipmentType);
    const identityWhere = identityParts.length ? identityParts.join(' AND ') : '1=1';

    const decoratedFilters = [];
    if (kpiBucket === 'due_soon') {
      decoratedFilters.push(`${bucketExpr} IN ('due_this_week', 'due_soon')`);
    } else if (kpiBucket) {
      dataReq.input('KpiBucket', sql.NVarChar(20), kpiBucket);
      decoratedFilters.push(`${bucketExpr} = @KpiBucket`);
    } else if (statusFilters.length > 0) {
      statusFilters.forEach((s, i) => dataReq.input(`St${i}`, sql.NVarChar(20), s));
      decoratedFilters.push(`${statusExpr} IN (${statusFilters.map((_, i) => `@St${i}`).join(', ')})`);
    }
    const decoratedWhere = decoratedFilters.length ? decoratedFilters.join(' AND ') : '1=1';

    dataReq.input('Offset', sql.Int, offset);
    dataReq.input('Limit', sql.Int, limit);

    const dataSql = `
      ${emsEquipmentCalPrepSql(identityWhere)}

      SELECT
        e.tagNo, e.eqno, e.description, e.plant, e.area, e.manufacturer, e.model,
        e.equipment_type, e.cal_interval, e.ccp_code,
        ${statusExpr} AS status,
        cal.DUEDATE AS scheduleDueDateRaw,
        cal.woTargetDate,
        cal.effectiveDueDate,
        cal.dueDateSource,
        LTRIM(RTRIM(ISNULL(per.FIRSTNAME,'') + ' ' + ISNULL(per.LASTNAME,''))) AS assigneeName
      INTO #EmsDecorated
      FROM #EmsEq e
      LEFT JOIN #EmsCal cal ON cal.eqno = e.eqno
      LEFT JOIN dbo.Person per ON per.PERSONNO = cal.assigneeId
      WHERE ${decoratedWhere};

      SELECT COUNT(*) AS total FROM #EmsDecorated;

      SELECT
        tagNo, eqno, description, plant, area, manufacturer, model, equipment_type,
        cal_interval, ccp_code, status, scheduleDueDateRaw, woTargetDate,
        effectiveDueDate, dueDateSource, assigneeName
      FROM #EmsDecorated
      ORDER BY ${orderBy}
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `;

    const dataResult = await dataReq.query(dataSql);
    const recordsets = Array.isArray(dataResult.recordsets) ? dataResult.recordsets : [dataResult.recordset];
    const countRows = recordsets[recordsets.length - 2] || [];
    const pageRows = recordsets[recordsets.length - 1] || [];
    const total = countRows[0]?.total || 0;
    const items = (pageRows || []).map(mapEquipmentRow);

    console.log(`EMS listEquipment ${Date.now() - startedAt}ms total=${total} page=${page}`);

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
 * GET /api/ems/equipment/:tagNo/changes
 */
exports.getEquipmentChangeHistory = async (req, res) => {
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

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const data = await fetchEquipmentChangeHistory(pool, tagNo, page, limit);

    res.json({
      success: true,
      data,
      message: 'Equipment change history',
    });
  } catch (error) {
    console.error('EMS getEquipmentChangeHistory error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch change history', error: error.message });
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

    let newImageUrl = null;
    if (req.file) {
      newImageUrl = await saveEquipmentImage(req.file, extRow.eqno, tagNo, extRow.image_url);
    }

    const changes = computeEquipmentChanges(extRow, payload, { newImageUrl });

    if (!changes.length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const setParts = ['updated_at = GETDATE()', 'updated_by = @UpdatedBy'];
    let paramIndex = 0;
    for (const change of changes) {
      const paramName = `P${paramIndex}`;
      paramIndex += 1;
      setParts.push(`${change.config.column} = @${paramName}`);
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const txReq = new sql.Request(transaction);
      txReq.input('TagNo', sql.NVarChar(50), tagNo);
      txReq.input('UpdatedBy', sql.NVarChar(50), personNo);

      let txParamIndex = 0;
      for (const change of changes) {
        const paramName = `P${txParamIndex}`;
        txParamIndex += 1;
        txReq.input(paramName, change.config.type, change.dbValue);
      }

      await txReq.query(`
        UPDATE dbo.IgxEQExtension
        SET ${setParts.join(', ')}
        WHERE tag_no = @TagNo
      `);

      await insertEquipmentChangeLog(transaction, {
        tagNo,
        eqNo: extRow.eqno,
        changedBy: personNo,
        changes,
      });

      await transaction.commit();
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

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
