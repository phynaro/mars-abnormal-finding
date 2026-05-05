const sql = require('mssql');
const { PM_CAL_PLANTS } = require('./pmCalibrationScheduleQuery');

const USER_EVENT_CATEGORIES = ['shutdown', 'cleaning', 'inspection', 'holiday', 'other'];
const USER_EVENT_PLANT_CODES = PM_CAL_PLANTS.map((p) => p.code);

function normalizePlantCode(value) {
  if (value == null) return null;
  const code = String(value).trim().toUpperCase();
  return code || null;
}

function normalizeCategory(value) {
  if (value == null) return null;
  const category = String(value).trim().toLowerCase();
  return category || null;
}

function isValidPlantCode(value) {
  if (value == null || value === '') return true;
  return USER_EVENT_PLANT_CODES.includes(normalizePlantCode(value));
}

function isValidCategory(value) {
  if (value == null || value === '') return false;
  return USER_EVENT_CATEGORIES.includes(normalizeCategory(value));
}

function isValidColorHex(value) {
  if (value == null || value === '') return true;
  return /^#[0-9A-Fa-f]{6}$/.test(String(value).trim());
}

function parseNullableInt(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = parseInt(String(value).trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBooleanFlag(value, fallback = null) {
  if (value == null || String(value).trim() === '') return fallback;
  const raw = String(value).trim().toLowerCase();
  if (['1', 'true', 't', 'yes', 'y'].includes(raw)) return true;
  if (['0', 'false', 'f', 'no', 'n'].includes(raw)) return false;
  return fallback;
}

function parseCsvIntList(value) {
  if (value == null || String(value).trim() === '') return [];
  return String(value)
    .split(',')
    .map((v) => parseInt(v.trim(), 10))
    .filter((v) => !Number.isNaN(v));
}

function validateUserEventPayload(payload) {
  const errors = [];
  const title = String(payload.title || '').trim();
  if (!title) errors.push('title is required');

  const category = normalizeCategory(payload.category);
  if (!isValidCategory(category)) {
    errors.push(`category must be one of: ${USER_EVENT_CATEGORIES.join(', ')}`);
  }

  const startAt = payload.start_at || payload.startAt;
  const endAt = payload.end_at || payload.endAt;
  if (!startAt || !endAt) {
    errors.push('start_at and end_at are required');
  } else if (Number.isNaN(Date.parse(startAt)) || Number.isNaN(Date.parse(endAt))) {
    errors.push('start_at and end_at must be valid datetimes');
  } else if (new Date(startAt) > new Date(endAt)) {
    errors.push('end_at must be greater than or equal to start_at');
  }

  const plantCode = normalizePlantCode(payload.plant_code ?? payload.plantCode);
  if (!isValidPlantCode(plantCode)) {
    errors.push(`plant_code must be one of: ${USER_EVENT_PLANT_CODES.join(', ')}`);
  }

  const colorHex = payload.color_hex ?? payload.colorHex;
  if (!isValidColorHex(colorHex)) {
    errors.push('color_hex must be in #RRGGBB format');
  }

  return errors;
}

function normalizedUserEventInput(payload, userId, { includeCreateMeta = false } = {}) {
  const title = String(payload.title || '').trim();
  const descriptionRaw = payload.description == null ? '' : String(payload.description);
  const category = normalizeCategory(payload.category);
  const plantCode = normalizePlantCode(payload.plant_code ?? payload.plantCode);
  const colorHexRaw = payload.color_hex ?? payload.colorHex;

  const normalized = {
    title,
    description: descriptionRaw.trim() ? descriptionRaw.trim() : null,
    category,
    start_at: payload.start_at || payload.startAt,
    end_at: payload.end_at || payload.endAt,
    is_all_day: parseBooleanFlag(payload.is_all_day ?? payload.isAllDay, true),
    plant_code: plantCode,
    dept_no: parseNullableInt(payload.dept_no ?? payload.deptNo),
    assignee_id: parseNullableInt(payload.assignee_id ?? payload.assigneeId),
    color_hex: colorHexRaw == null || String(colorHexRaw).trim() === '' ? null : String(colorHexRaw).trim(),
    is_active: parseBooleanFlag(payload.is_active ?? payload.isActive, true),
    updated_by: userId,
  };

  if (includeCreateMeta) {
    normalized.created_by = userId;
  }

  return normalized;
}

function bindUserEventWriteInputs(request, data, { includeCreateMeta = false } = {}) {
  request.input('Title', sql.NVarChar(200), data.title);
  request.input('Description', sql.NVarChar(sql.MAX), data.description);
  request.input('Category', sql.VarChar(30), data.category);
  request.input('StartAt', sql.DateTime2, data.start_at);
  request.input('EndAt', sql.DateTime2, data.end_at);
  request.input('IsAllDay', sql.Bit, data.is_all_day);
  request.input('PlantCode', sql.VarChar(2), data.plant_code);
  request.input('DeptNo', sql.Int, data.dept_no);
  request.input('AssigneeId', sql.Int, data.assignee_id);
  request.input('ColorHex', sql.VarChar(7), data.color_hex);
  request.input('IsActive', sql.Bit, data.is_active);
  request.input('UpdatedBy', sql.Int, data.updated_by);
  if (includeCreateMeta) {
    request.input('CreatedBy', sql.Int, data.created_by);
  }
}

function buildUserEventScopeFilters(request, query) {
  const parts = ['e.deleted_at IS NULL'];

  const plantParam = query.plant;
  if (plantParam != null && String(plantParam).trim() !== '') {
    const codes = String(plantParam)
      .split(',')
      .map((s) => normalizePlantCode(s))
      .filter((c) => c && USER_EVENT_PLANT_CODES.includes(c));
    if (codes.length > 0) {
      codes.forEach((code, idx) => request.input(`EventPlant${idx}`, sql.VarChar(2), code));
      parts.push(`(e.plant_code IS NULL OR e.plant_code IN (${codes.map((_, idx) => `@EventPlant${idx}`).join(', ')}))`);
    }
  }

  const deptParam = query.dept;
  if (deptParam != null && String(deptParam).trim() !== '') {
    const deptNos = parseCsvIntList(deptParam);
    if (deptNos.length > 0) {
      deptNos.forEach((deptNo, idx) => request.input(`EventDept${idx}`, sql.Int, deptNo));
      parts.push(`(e.dept_no IS NULL OR e.dept_no IN (${deptNos.map((_, idx) => `@EventDept${idx}`).join(', ')}))`);
    }
  }

  const assigneeRaw = query.assigneeIds != null ? query.assigneeIds : query.assignee_id;
  if (assigneeRaw != null && String(assigneeRaw).trim() !== '') {
    const ids = parseCsvIntList(assigneeRaw);
    if (ids.length > 0) {
      ids.forEach((id, idx) => request.input(`EventAssignee${idx}`, sql.Int, id));
      parts.push(`(e.assignee_id IS NULL OR e.assignee_id IN (${ids.map((_, idx) => `@EventAssignee${idx}`).join(', ')}))`);
    }
  }

  const category = normalizeCategory(query.category);
  if (category && USER_EVENT_CATEGORIES.includes(category)) {
    request.input('EventCategory', sql.VarChar(30), category);
    parts.push('e.category = @EventCategory');
  }

  const activeFlag = parseBooleanFlag(query.isActive, null);
  if (activeFlag != null) {
    request.input('EventIsActive', sql.Bit, activeFlag);
    parts.push('e.is_active = @EventIsActive');
  }

  const search = query.search != null ? String(query.search).trim() : '';
  if (search) {
    request.input('EventSearch', sql.NVarChar(220), `%${search}%`);
    parts.push('(e.title LIKE @EventSearch OR e.description LIKE @EventSearch)');
  }

  return parts;
}

module.exports = {
  USER_EVENT_CATEGORIES,
  USER_EVENT_PLANT_CODES,
  normalizePlantCode,
  normalizeCategory,
  isValidPlantCode,
  isValidCategory,
  isValidColorHex,
  parseNullableInt,
  parseBooleanFlag,
  parseCsvIntList,
  validateUserEventPayload,
  normalizedUserEventInput,
  bindUserEventWriteInputs,
  buildUserEventScopeFilters,
};
