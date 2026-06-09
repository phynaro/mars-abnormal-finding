/**
 * Run EMS Phase 1 SQL migrations against Cedar6_Mars (dbConfig).
 * Usage: node backend/script/ems/run-ems-migrations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const dbConfig = require('../../src/config/dbConfig');

const MIGRATION_FILES = [
  '001-create-ems-tables.sql',
  '002-insert-ems-notification-schedule.sql',
  '003-create-ems-notification-log.sql',
];

async function runBatch(pool, filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const batches = raw
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const batch of batches) {
    await pool.request().query(batch);
  }
}

async function main() {
  console.log('EMS migrations →', dbConfig.database, 'on', dbConfig.server);
  const pool = await sql.connect(dbConfig);
  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(__dirname, file);
      console.log('Running', file, '...');
      await runBatch(pool, filePath);
      console.log('OK', file);
    }
    console.log('All EMS migrations completed.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('EMS migration failed:', err.message);
  process.exit(1);
});
