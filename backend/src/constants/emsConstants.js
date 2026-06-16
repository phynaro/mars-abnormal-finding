/** EMS-specific role values stored in IgxEmsUserRole.ems_role */
const EMS_ROLES = Object.freeze({
  CALIBRATOR: 'calibrator',
  AM: 'am',
  PLANT_MANAGER: 'plant_manager',
});

const EMS_ROLE_VALUES = Object.freeze(Object.values(EMS_ROLES));

/** Equipment calibration status labels (Phase 1 spec §4). */
const EMS_EQUIPMENT_STATUS = Object.freeze({
  NO_WO: 'NO WO',
  OVERDUE: 'OVERDUE',
  DUE_SOON: 'DUE SOON',
  OK: 'OK',
});

/** Cedar WO status: completed / history */
const EMS_WO_STATUS_FINISHED = Object.freeze([7, 9]);

/** Days-until-due thresholds (spec §5). */
const EMS_DUE_THIS_WEEK_MAX_DAYS = 7;
const EMS_DUE_SOON_MAX_DAYS = 14;

/** EMS notification rules (Phase 08). */
const EMS_NOTIFICATION_RULES = Object.freeze({
  PRE_DUE_30: 'pre_due_30',
  OVERDUE_DAILY: 'overdue_daily',
  ESCALATION_14: 'escalation_14',
});

const EMS_PRE_DUE_DAYS = 30;
const EMS_ESCALATION_OVERDUE_DAYS = 14;

module.exports = {
  EMS_ROLES,
  EMS_ROLE_VALUES,
  EMS_EQUIPMENT_STATUS,
  EMS_WO_STATUS_FINISHED,
  EMS_DUE_THIS_WEEK_MAX_DAYS,
  EMS_DUE_SOON_MAX_DAYS,
  EMS_NOTIFICATION_RULES,
  EMS_PRE_DUE_DAYS,
  EMS_ESCALATION_OVERDUE_DAYS,
};
