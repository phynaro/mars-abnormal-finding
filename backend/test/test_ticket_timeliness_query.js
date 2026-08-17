/**
 * Run: node backend/test/test_ticket_timeliness_query.js
 */
const assert = require('assert');
const {
  timelinessSql,
  EQUIPMENT_DISPLAY_SQL,
  machineFilterSql,
  unknownAreaFilterSql,
  ontimePopulationSql,
  ontimeCountSql,
  lateCountSql,
} = require('../src/helpers/ticketTimelinessQuery');

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name, err.message);
    process.exitCode = 1;
  }
}

test('invalid or missing timeliness returns empty', () => {
  assert.strictEqual(timelinessSql(undefined), '');
  assert.strictEqual(timelinessSql(''), '');
  assert.strictEqual(timelinessSql('overdue'), '');
  assert.strictEqual(timelinessSql('ONTIME'), '');
});

test('ontime includes exact due time and requires closed + both dates', () => {
  const sql = timelinessSql('ontime');
  assert.match(sql, /t\.status = 'closed'/);
  assert.match(sql, /t\.schedule_finish IS NOT NULL/);
  assert.match(sql, /t\.actual_finish_at IS NOT NULL/);
  assert.match(sql, /t\.actual_finish_at <= t\.schedule_finish/);
  assert.doesNotMatch(sql, /finished_at IS NOT NULL/);
});

test('late is after schedule finish only', () => {
  const sql = timelinessSql('late');
  assert.match(sql, /t\.actual_finish_at > t\.schedule_finish/);
  assert.doesNotMatch(sql, /t\.actual_finish_at >=/);
});

test('equipment CASE prefers machine then line', () => {
  assert.match(EQUIPMENT_DISPLAY_SQL, /pe\.machine IS NOT NULL THEN pe\.machine/);
  assert.match(EQUIPMENT_DISPLAY_SQL, /pe\.line IS NOT NULL THEN pe\.line/);
  assert.match(EQUIPMENT_DISPLAY_SQL, /Unknown Equipment/);
});

test('machine filter binds @machine to the CASE', () => {
  assert.strictEqual(
    machineFilterSql(),
    ` AND ${EQUIPMENT_DISPLAY_SQL} = @machine`
  );
});

test('unknown area is NULL area, not the literal string', () => {
  assert.strictEqual(unknownAreaFilterSql(), ' AND pe.area IS NULL');
});

test('chart population matches ticket-list timeliness population', () => {
  const pop = ontimePopulationSql();
  assert.match(pop, /t\.status = 'closed'/);
  assert.match(pop, /t\.schedule_finish IS NOT NULL/);
  assert.match(pop, /t\.actual_finish_at IS NOT NULL/);
  assert.doesNotMatch(pop, /finished_at IS NOT NULL/);
});

test('count expressions split ontime vs late', () => {
  assert.strictEqual(
    ontimeCountSql(),
    'COUNT(CASE WHEN t.actual_finish_at <= t.schedule_finish THEN 1 END)'
  );
  assert.strictEqual(
    lateCountSql(),
    'COUNT(CASE WHEN t.actual_finish_at > t.schedule_finish THEN 1 END)'
  );
});
