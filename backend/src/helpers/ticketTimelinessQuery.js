const EQUIPMENT_DISPLAY_SQL = `CASE
          WHEN pe.machine IS NOT NULL THEN pe.machine
          WHEN pe.line IS NOT NULL THEN pe.line
          ELSE 'Unknown Equipment'
        END`;

function timelinessSql(timeliness) {
  if (timeliness !== 'ontime' && timeliness !== 'late') {
    return '';
  }
  const cmp = timeliness === 'ontime' ? '<=' : '>';
  return ` AND t.status = 'closed'
      AND t.schedule_finish IS NOT NULL
      AND t.actual_finish_at IS NOT NULL
      AND t.actual_finish_at ${cmp} t.schedule_finish`;
}

function machineFilterSql() {
  return ` AND ${EQUIPMENT_DISPLAY_SQL} = @machine`;
}

function unknownAreaFilterSql() {
  return ' AND pe.area IS NULL';
}

function ontimePopulationSql() {
  return `t.status = 'closed'
          AND t.schedule_finish IS NOT NULL
          AND t.actual_finish_at IS NOT NULL`;
}

function ontimeCountSql() {
  return 'COUNT(CASE WHEN t.actual_finish_at <= t.schedule_finish THEN 1 END)';
}

function lateCountSql() {
  return 'COUNT(CASE WHEN t.actual_finish_at > t.schedule_finish THEN 1 END)';
}

module.exports = {
  EQUIPMENT_DISPLAY_SQL,
  timelinessSql,
  machineFilterSql,
  unknownAreaFilterSql,
  ontimePopulationSql,
  ontimeCountSql,
  lateCountSql,
};
