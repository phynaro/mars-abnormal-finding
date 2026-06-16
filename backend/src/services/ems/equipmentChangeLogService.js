/**
 * EMS equipment edit change log — diff, persist, and fetch field-level audit history.
 */

const crypto = require('crypto');
const sql = require('mssql');
const { paginationMeta } = require('../../helpers/emsQueryHelpers');

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

function normalizeValue(rawValue, config) {
  if (config.numeric) {
    return parseOptionalNumber(rawValue);
  }
  if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
  const trimmed = String(rawValue).trim();
  return trimmed === '' ? null : trimmed;
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  return false;
}

function formatDisplayValue(value) {
  if (value == null) return null;
  return String(value);
}

function getCurrentApiValue(extRow, config) {
  return extRow[config.column] ?? null;
}

/**
 * Compare payload against current extension row; return list of actual changes.
 * @returns {Array<{ fieldKey: string, oldValue: *, newValue: *, config: object }>}
 */
function computeEquipmentChanges(extRow, payload, { newImageUrl } = {}) {
  const changes = [];

  for (const [fieldKey, config] of Object.entries(EDITABLE_FIELD_MAP)) {
    if (!Object.prototype.hasOwnProperty.call(payload, fieldKey)) continue;

    const oldValue = getCurrentApiValue(extRow, config);
    const newValue = normalizeValue(payload[fieldKey], config);

    if (!valuesEqual(oldValue, newValue)) {
      changes.push({
        fieldKey,
        oldValue: formatDisplayValue(oldValue),
        newValue: formatDisplayValue(newValue),
        config,
        dbValue: newValue,
      });
    }
  }

  if (newImageUrl != null) {
    const oldImage = extRow.image_url || null;
    if (!valuesEqual(oldImage, newImageUrl)) {
      changes.push({
        fieldKey: 'imageUrl',
        oldValue: oldImage ? '(previous image)' : null,
        newValue: '(updated)',
        config: { column: 'image_url', type: sql.NVarChar(500) },
        dbValue: newImageUrl,
      });
    }
  }

  return changes;
}

async function insertEquipmentChangeLog(transaction, {
  tagNo,
  eqNo,
  changedBy,
  changes,
}) {
  if (!changes.length) return;

  const changeGroup = crypto.randomUUID();

  for (const change of changes) {
    await new sql.Request(transaction)
      .input('TagNo', sql.NVarChar(50), tagNo)
      .input('EqNo', sql.Int, eqNo)
      .input('ChangeGroup', sql.UniqueIdentifier, changeGroup)
      .input('FieldKey', sql.NVarChar(50), change.fieldKey)
      .input('OldValue', sql.NVarChar(sql.MAX), change.oldValue)
      .input('NewValue', sql.NVarChar(sql.MAX), change.newValue)
      .input('ChangedBy', sql.NVarChar(50), changedBy)
      .query(`
        INSERT INTO dbo.IgxEmsEquipmentChangeLog (
          tag_no, eqno, change_group, field_key, old_value, new_value, changed_by
        ) VALUES (
          @TagNo, @EqNo, @ChangeGroup, @FieldKey, @OldValue, @NewValue, @ChangedBy
        )
      `);
  }
}

async function fetchEquipmentChangeHistory(pool, tagNo, page = 1, limit = 10) {
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const countResult = await pool.request()
    .input('TagNo', sql.NVarChar(50), tagNo)
    .query(`
      SELECT COUNT(DISTINCT change_group) AS total
      FROM dbo.IgxEmsEquipmentChangeLog
      WHERE tag_no = @TagNo
    `);

  const total = countResult.recordset[0]?.total || 0;

  if (total === 0) {
    return { items: [], pagination: paginationMeta(safePage, safeLimit, 0) };
  }

  const groupsResult = await pool.request()
    .input('TagNo', sql.NVarChar(50), tagNo)
    .input('Offset', sql.Int, offset)
    .input('Limit', sql.Int, safeLimit)
    .query(`
      WITH Groups AS (
        SELECT
          change_group,
          MAX(changed_at) AS changed_at,
          MAX(changed_by) AS changed_by
        FROM dbo.IgxEmsEquipmentChangeLog
        WHERE tag_no = @TagNo
        GROUP BY change_group
      )
      SELECT
        g.change_group AS changeGroup,
        g.changed_at AS changedAt,
        g.changed_by AS changedBy,
        LTRIM(RTRIM(ISNULL(p.FIRSTNAME, '') + ' ' + ISNULL(p.LASTNAME, ''))) AS changedByName
      FROM Groups g
      LEFT JOIN dbo.Person p ON p.PERSONNO = g.changed_by
      ORDER BY g.changed_at DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
    `);

  const groups = groupsResult.recordset || [];
  if (!groups.length) {
    return { items: [], pagination: paginationMeta(safePage, safeLimit, total) };
  }

  const groupIds = groups.map((g) => g.changeGroup);
  const placeholders = groupIds.map((_, i) => `@G${i}`).join(', ');
  const detailReq = pool.request().input('TagNo', sql.NVarChar(50), tagNo);
  groupIds.forEach((id, i) => {
    detailReq.input(`G${i}`, sql.UniqueIdentifier, id);
  });

  const detailsResult = await detailReq.query(`
    SELECT change_group AS changeGroup, field_key AS fieldKey, old_value AS oldValue, new_value AS newValue
    FROM dbo.IgxEmsEquipmentChangeLog
    WHERE tag_no = @TagNo AND change_group IN (${placeholders})
    ORDER BY id ASC
  `);

  const detailsByGroup = new Map();
  for (const row of detailsResult.recordset || []) {
    if (!detailsByGroup.has(row.changeGroup)) {
      detailsByGroup.set(row.changeGroup, []);
    }
    detailsByGroup.get(row.changeGroup).push({
      fieldKey: row.fieldKey,
      oldValue: row.oldValue,
      newValue: row.newValue,
    });
  }

  const items = groups.map((g) => ({
    changeGroup: g.changeGroup,
    changedAt: g.changedAt,
    changedBy: g.changedBy,
    changedByName: g.changedByName?.trim() || null,
    changes: detailsByGroup.get(g.changeGroup) || [],
  }));

  return {
    items,
    pagination: paginationMeta(safePage, safeLimit, total),
  };
}

module.exports = {
  EDITABLE_FIELD_MAP,
  parseOptionalNumber,
  computeEquipmentChanges,
  insertEquipmentChangeLog,
  fetchEquipmentChangeHistory,
};
