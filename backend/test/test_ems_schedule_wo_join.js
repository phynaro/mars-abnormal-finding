/**
 * EMS schedule open-WO join (no DB).
 * Run: node backend/test/test_ems_schedule_wo_join.js
 */
const assert = require('assert');
const { leftJoinOpenWoByPmno } = require('../src/helpers/pmCalibrationScheduleQuery');
const { EMS_SCHEDULE_OPEN_WO_CREATED_FROM } = require('../src/constants/emsConstants');

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name, err.message);
    process.exitCode = 1;
  }
}

test('default open-WO join does not filter by create year', () => {
  const sql = leftJoinOpenWoByPmno('openWo', 'pm');
  assert.match(sql, /LEFT JOIN dbo\.WO openWo ON openWo\.PMNO = pm\.PMNO/);
  assert.doesNotMatch(sql, /CREATEDATE/);
});

test('EMS schedule open-WO join keeps WOs created 2023 or later', () => {
  assert.strictEqual(EMS_SCHEDULE_OPEN_WO_CREATED_FROM, '20230101');
  const sql = leftJoinOpenWoByPmno('openWo', 'pm', {
    createdFrom: EMS_SCHEDULE_OPEN_WO_CREATED_FROM,
  });
  assert.match(sql, /openWo\.CREATEDATE >= '20230101'/);
  assert.match(sql, /WOSTATUSNO NOT IN \(7, 8, 9\)/);
});

test('equipment open-WO apply excludes canceled status 8', () => {
  const { openWoApplySql } = require('../src/helpers/emsQueryHelpers');
  const sql = openWoApplySql('openWo', 'pm');
  assert.match(sql, /WOSTATUSNO NOT IN \(7, 8, 9\)/);
});
