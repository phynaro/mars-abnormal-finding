/**
 * EMS equipment calibration status calculation.
 * Spec §4 (status badge) and §5 (KPI buckets).
 */

const {
  EMS_EQUIPMENT_STATUS,
  EMS_WO_STATUS_FINISHED,
  EMS_DUE_THIS_WEEK_MAX_DAYS,
  EMS_DUE_SOON_MAX_DAYS,
} = require('../../constants/emsConstants');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Parse Cedar DUEDATE (YYYYMMDD, YYYY-MM-DD) or Date into local date or null.
 * @param {string|Date|null|undefined} value
 * @returns {Date|null}
 */
function parseDueDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{8}$/.test(raw)) {
    const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  }

  const head = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const d = new Date(head);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

/**
 * @param {string|Date|null|undefined} dueDate
 * @param {Date} [referenceDate]
 * @returns {number|null} negative = past due
 */
function daysUntilDue(dueDate, referenceDate = new Date()) {
  const due = parseDueDate(dueDate);
  if (!due) return null;
  const ref = startOfDay(referenceDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((due.getTime() - ref.getTime()) / msPerDay);
}

/**
 * @param {string|Date|null|undefined} dueDate
 * @param {Date} [referenceDate]
 * @returns {number|null} 0 on due date, positive when overdue
 */
function daysOverdue(dueDate, referenceDate = new Date()) {
  const until = daysUntilDue(dueDate, referenceDate);
  if (until == null) return null;
  return until < 0 ? Math.abs(until) : 0;
}

/**
 * @param {number|null|undefined} woStatusNo
 * @param {number|null|undefined} schedWoStatusNo
 * @returns {boolean}
 */
function isWoClosed(woStatusNo, schedWoStatusNo) {
  if (schedWoStatusNo != null && EMS_WO_STATUS_FINISHED.includes(Number(schedWoStatusNo))) {
    return true;
  }
  if (woStatusNo != null && EMS_WO_STATUS_FINISHED.includes(Number(woStatusNo))) {
    return true;
  }
  return false;
}

/**
 * Dashboard KPI bucket (spec §5): overdue | due_this_week | due_soon | ok | no_wo
 * @param {{ dueDate?: string|Date|null, woStatusNo?: number|null, schedWoStatusNo?: number|null, hasOpenSchedule?: boolean, woNo?: number|null }} input
 * @param {Date} [referenceDate]
 * @returns {'overdue'|'due_this_week'|'due_soon'|'ok'|'no_wo'}
 */
function getKpiBucket(input, referenceDate = new Date()) {
  const {
    dueDate,
    woStatusNo,
    schedWoStatusNo,
    hasOpenSchedule = false,
    woNo,
  } = input || {};

  const hasWo = (woNo != null && Number(woNo) > 0) || hasOpenSchedule;
  const due = parseDueDate(dueDate);

  if (!hasWo && !due) {
    return 'no_wo';
  }

  if (due && isWoClosed(woStatusNo, schedWoStatusNo)) {
    return 'ok';
  }

  const days = daysUntilDue(due, referenceDate);
  if (days == null) {
    return hasWo ? 'ok' : 'no_wo';
  }

  if (days < 0) return 'overdue';
  if (days <= EMS_DUE_THIS_WEEK_MAX_DAYS) return 'due_this_week';
  if (days <= EMS_DUE_SOON_MAX_DAYS) return 'due_soon';
  return 'ok';
}

/**
 * Equipment list status badge (spec §4): NO WO | OVERDUE | DUE SOON | OK
 * @param {{ dueDate?: string|Date|null, woStatusNo?: number|null, schedWoStatusNo?: number|null, hasOpenSchedule?: boolean, woNo?: number|null }} input
 * @param {Date} [referenceDate]
 * @returns {'NO WO'|'OVERDUE'|'DUE SOON'|'OK'}
 */
function calculateEquipmentStatus(input, referenceDate = new Date()) {
  const bucket = getKpiBucket(input, referenceDate);

  switch (bucket) {
    case 'no_wo':
      return EMS_EQUIPMENT_STATUS.NO_WO;
    case 'overdue':
      return EMS_EQUIPMENT_STATUS.OVERDUE;
    case 'due_this_week':
    case 'due_soon':
      return EMS_EQUIPMENT_STATUS.DUE_SOON;
    case 'ok':
    default:
      return EMS_EQUIPMENT_STATUS.OK;
  }
}

/** Extract plant code from tag (first segment before '-'). */
function plantFromTagNo(tagNo) {
  if (!tagNo) return '';
  const idx = String(tagNo).indexOf('-');
  return idx === -1 ? String(tagNo).trim() : String(tagNo).slice(0, idx).trim();
}

module.exports = {
  parseDueDate,
  daysUntilDue,
  daysOverdue,
  isWoClosed,
  getKpiBucket,
  calculateEquipmentStatus,
  plantFromTagNo,
};
