/**
 * Run EMS SQL migrations against CEDAR (dbConfigNew — IgxEQExtension).
 * Usage: node backend/script/ems/run-cedar-ems-migrations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const dbConfigNew = require('../../src/config/dbConfigNew');

const MIGRATION_FILES = [
  '004-alter-igx-eq-extension-cedar.sql',
  '005-create-igx-ems-equipment-change-log.sql',
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
  console.log('CEDAR EMS migrations →', dbConfigNew.database, 'on', dbConfigNew.server);
  const pool = await new sql.ConnectionPool(dbConfigNew).connect();
  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(__dirname, file);
      console.log('Running', file, '...');
      await runBatch(pool, filePath);
      console.log('OK', file);
    }
    console.log('All CEDAR EMS migrations completed.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('CEDAR EMS migration failed:', err.message);
  process.exit(1);
});
