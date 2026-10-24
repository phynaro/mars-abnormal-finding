const RESCHEDULE_REASONS = Object.freeze([
  { code: 'waiting_part', en: 'Waiting Part', th: 'รออะไหล่' },
  { code: 'waiting_production_stop', en: 'Waiting Production Stop', th: 'รอโรงงานหยุด' },
  { code: 'waiting_budget', en: 'Waiting Budget', th: 'รองบประมาณ' },
  { code: 'resource_not_cover', en: 'Resource not cover', th: 'จำนวนคนไม่เพียงพอ' },
  { code: 'delivery_time_change', en: 'Delivery time change', th: 'เลื่อนระยะเวลาส่งของ' },
  { code: 'waiting_change_management', en: 'Waiting Change Management', th: 'รออนุมัติ Change Management' },
]);

const RESCHEDULE_REASON_BY_CODE = new Map(RESCHEDULE_REASONS.map((reason) => [reason.code, reason]));

const RESCHEDULE_STATUSES = Object.freeze(['planed', 'in_progress', 'reopened_in_progress']);

function isRescheduleReason(code) {
  return RESCHEDULE_REASON_BY_CODE.has(code);
}

function getRescheduleReasonLabel(code, language = 'en') {
  const reason = RESCHEDULE_REASON_BY_CODE.get(code);
  if (!reason) return code || '';
  return language === 'th' ? reason.th : reason.en;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function utcMinuteKey(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

function inputMinuteKey(value) {
  const match = String(value || '').trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : '';
}

function formatMinuteKey(key) {
  if (!key) return '-';
  const [date, time] = key.split('T');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} ${time}`;
}

function scheduleInputUnchanged(stored, input) {
  return utcMinuteKey(stored) === inputMinuteKey(input);
}

function formatStoredSchedule(value) {
  return formatMinuteKey(utcMinuteKey(value));
}

function formatInputSchedule(value) {
  return formatMinuteKey(inputMinuteKey(value));
}

function buildScheduleChangeComment({
  oldStart,
  oldFinish,
  newStartInput,
  newFinishInput,
  reasonCode,
  note,
}) {
  const reason = getRescheduleReasonLabel(reasonCode, 'en');
  let text = `Schedule changed. Start: ${formatStoredSchedule(oldStart)} -> ${formatInputSchedule(newStartInput)}. Finish: ${formatStoredSchedule(oldFinish)} -> ${formatInputSchedule(newFinishInput)}. Reason: ${reason}.`;
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  if (trimmedNote) {
    const prefix = `${text} Note: `;
    const room = 500 - prefix.length;
    text = room > 0 ? `${prefix}${trimmedNote.slice(0, room)}` : text.slice(0, 500);
  }
  return text.slice(0, 500);
}

module.exports = {
  RESCHEDULE_REASONS,
  RESCHEDULE_STATUSES,
  isRescheduleReason,
  getRescheduleReasonLabel,
  inputMinuteKey,
  scheduleInputUnchanged,
  formatStoredSchedule,
  formatInputSchedule,
  buildScheduleChangeComment,
};
