/**
 * EMS schedule grain: one latest PMSched row per CAL PM.
 * Run: node backend/test/test_ems_schedule_grain.js
 */
const assert = require('assert');
const {
  getEmsScheduleFromJoin,
  latestPmSchedApplySql,
  EMS_SCHEDULE_HAS_ROW_SQL,
} = require('../src/helpers/emsQueryHelpers');

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name, err.message);
    process.exitCode = 1;
  }
}

test('EMS schedule FROM starts at PM, not PMSched', () => {
  const { fromJoinPm } = getEmsScheduleFromJoin();
  assert.match(fromJoinPm, /FROM dbo\.PM pm/i);
  assert.doesNotMatch(fromJoinPm, /FROM dbo\.PMSched s INNER JOIN dbo\.PM pm/);
});

test('latest PMSched is TOP 1 ordered by due date descending', () => {
  const sql = latestPmSchedApplySql('s', 'pm');
  assert.match(sql, /OUTER APPLY/i);
  assert.match(sql, /SELECT TOP 1/i);
  assert.match(sql, /FROM dbo\.PMSched sched/i);
  assert.match(sql, /ORDER BY[\s\S]*DESC/i);
  assert.doesNotMatch(sql, /LEFT JOIN dbo\.WO/);
});

test('EMS schedule join bundle includes EQ and 2023+ open WO', () => {
  const { leftJoinEq, leftJoinOpenWo } = getEmsScheduleFromJoin();
  assert.match(leftJoinEq, /LEFT JOIN dbo\.EQ eq/i);
  assert.match(leftJoinOpenWo, /CREATEDATE >= '20230101'/);
});

test('schedule row filter requires a PMSched slot', () => {
  assert.strictEqual(EMS_SCHEDULE_HAS_ROW_SQL, 's.DUEDATE IS NOT NULL');
});
