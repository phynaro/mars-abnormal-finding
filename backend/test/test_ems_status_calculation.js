/**
 * EMS status calculation unit checks (no DB).
 * Run: node backend/test/test_ems_status_calculation.js
 */

const assert = require('assert');
const {
  parseDueDate,
  daysUntilDue,
  daysOverdue,
  isWoClosed,
  getKpiBucket,
  calculateEquipmentStatus,
  plantFromTagNo,
} = require('../src/services/ems/statusCalculationService');

const REF = new Date('2026-06-09T12:00:00');

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name, err.message);
    process.exitCode = 1;
  }
}

test('parseDueDate YYYYMMDD', () => {
  assert.ok(parseDueDate('20260615'));
  assert.strictEqual(daysUntilDue('20260615', REF), 6);
});

test('daysUntilDue future', () => {
  assert.strictEqual(daysUntilDue('20260615', REF), 6);
});

test('daysOverdue past', () => {
  assert.strictEqual(daysOverdue('20260601', REF), 8);
});

test('isWoClosed status 9', () => {
  assert.strictEqual(isWoClosed(null, 9), true);
  assert.strictEqual(isWoClosed(7, null), true);
  assert.strictEqual(isWoClosed(1, 1), false);
});

test('NO WO when no schedule', () => {
  assert.strictEqual(
    calculateEquipmentStatus({ hasOpenSchedule: false, woNo: 0 }, REF),
    'NO WO'
  );
  assert.strictEqual(getKpiBucket({ hasOpenSchedule: false, woNo: 0 }, REF), 'no_wo');
});

test('OVERDUE when past due and open', () => {
  const input = { dueDate: '20260601', woNo: 100, woStatusNo: 1, schedWoStatusNo: 1 };
  assert.strictEqual(calculateEquipmentStatus(input, REF), 'OVERDUE');
  assert.strictEqual(getKpiBucket(input, REF), 'overdue');
});

test('DUE SOON within 7 days', () => {
  const input = { dueDate: '20260612', woNo: 100, woStatusNo: 1 };
  assert.strictEqual(calculateEquipmentStatus(input, REF), 'DUE SOON');
  assert.strictEqual(getKpiBucket(input, REF), 'due_this_week');
});

test('DUE SOON within next 14 days after this week', () => {
  const input = { dueDate: '20260620', woNo: 100, woStatusNo: 1 };
  assert.strictEqual(calculateEquipmentStatus(input, REF), 'DUE SOON');
  assert.strictEqual(getKpiBucket(input, REF), 'due_soon');
});

test('OK when due beyond due-soon window', () => {
  const input = { dueDate: '20260701', woNo: 100, woStatusNo: 1 };
  assert.strictEqual(calculateEquipmentStatus(input, REF), 'OK');
  assert.strictEqual(getKpiBucket(input, REF), 'ok');
});

test('OK when WO closed', () => {
  const input = { dueDate: '20260601', woNo: 100, woStatusNo: 9 };
  assert.strictEqual(calculateEquipmentStatus(input, REF), 'OK');
});

test('plantFromTagNo', () => {
  assert.strictEqual(plantFromTagNo('DP-FOO-BAR'), 'DP');
  assert.strictEqual(plantFromTagNo('PIP-X'), 'PIP');
});

if (process.exitCode !== 1) {
  console.log('\nAll EMS status calculation tests passed.');
}
