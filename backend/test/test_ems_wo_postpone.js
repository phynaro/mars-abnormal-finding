/**
 * EMS WO postpone (SCH_START_D <> PMDUE_D) counts.
 * Run: node backend/test/test_ems_wo_postpone.js
 */
const assert = require('assert');
const {
  woPostponeCaseExpr,
  woPostponeOnJoinedWoCaseExpr,
  emptyEmsKpiCounts,
  emptyPlantMatrixItem,
  emptyWoPeriodStatusEntry,
  applyWoPeriodStatusCount,
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

test('postpone SQL compares parsed SCH_START_D to PMDUE_D', () => {
  const sql = woPostponeCaseExpr('wo');
  assert.match(sql, /wo\.SCH_START_D/);
  assert.match(sql, /wo\.PMDUE_D/);
  assert.match(sql, /<> /);
  assert.doesNotMatch(sql, /SCH_FINISH_D/);
});

test('KPI empty counts do not include wo_postpone', () => {
  const counts = emptyEmsKpiCounts();
  assert.strictEqual(counts.wo_postpone, undefined);
  assert.ok(!Object.prototype.hasOwnProperty.call(counts, 'wo_postpone'));
});

test('plant matrix empty item includes wo_postpone at 0', () => {
  const item = emptyPlantMatrixItem('DP', 'Dry Plant');
  assert.strictEqual(item.plant, 'DP');
  assert.strictEqual(item.wo_postpone, 0);
  assert.strictEqual(item.total, 0);
});

test('plant matrix postpone SQL checks joined WO aliases', () => {
  const sql = woPostponeOnJoinedWoCaseExpr();
  assert.match(sql, /wof\.SCH_START_D/);
  assert.match(sql, /wo\.SCH_START_D/);
  assert.match(sql, /openWo\.SCH_START_D/);
  assert.match(sql, /PMDUE_D/);
});

test('period status empty entry includes wo_postpone at 0', () => {
  const entry = emptyWoPeriodStatusEntry(3);
  assert.strictEqual(entry.period, 3);
  assert.strictEqual(entry.wo_postpone, 0);
  assert.strictEqual(entry.total, 0);
});

test('period status postpone is independent of ontime/late/not_finish total', () => {
  const entry = emptyWoPeriodStatusEntry(1);
  applyWoPeriodStatusCount(entry, 'ontime', 10, 4);
  applyWoPeriodStatusCount(entry, 'late', 2, 1);
  applyWoPeriodStatusCount(entry, 'not_finish', 3, 0);
  assert.strictEqual(entry.ontime, 10);
  assert.strictEqual(entry.late, 2);
  assert.strictEqual(entry.notFinish, 3);
  assert.strictEqual(entry.total, 15);
  assert.strictEqual(entry.wo_postpone, 5);
});

if (process.exitCode !== 1) {
  console.log('\nAll EMS WO postpone tests passed.');
}
