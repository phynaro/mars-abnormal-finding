/**
 * Add IgxUserExtension.UserKind (internal | external).
 * Usage: node backend/script/userkind/run-user-kind-migration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const dbConfig = require('../../src/config/dbConfig');

const MIGRATION_FILES = [
  '001-add-user-kind.sql',
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
  console.log('User-kind migration →', dbConfig.database, 'on', dbConfig.server);
  const pool = await sql.connect(dbConfig);
  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(__dirname, file);
      console.log('Running', file, '...');
      await runBatch(pool, filePath);
      console.log('OK', file);
    }
    console.log('User-kind migration completed.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
