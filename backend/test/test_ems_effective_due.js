/**
 * EMS effective due is PM.NEXTDUE_D only (no WO scheduled finish).
 * Run: node backend/test/test_ems_effective_due.js
 */
const assert = require('assert');
const {
  effectiveDueDateTimeExpr,
  dueDateSourceExpr,
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

test('effective due uses PM.NEXTDUE_D and never WO SCH_FINISH', () => {
  const sql = effectiveDueDateTimeExpr('s', 'pm', 'openWo');
  assert.match(sql, /pm\.NEXTDUE_D/);
  assert.doesNotMatch(sql, /SCH_FINISH/);
  assert.doesNotMatch(sql, /openWo\./);
  assert.doesNotMatch(sql, /s\.DUEDATE/);
});

test('due date source is pm_next_due only', () => {
  const sql = dueDateSourceExpr('s', 'pm', 'openWo');
  assert.match(sql, /pm_next_due/);
  assert.doesNotMatch(sql, /wo_target/);
  assert.doesNotMatch(sql, /SCH_FINISH/);
});
