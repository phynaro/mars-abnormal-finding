/**
 * Run Problem Phrase SQL migrations and seed against Cedar6_Mars (dbConfig).
 * Usage: node backend/script/problem-phrase/run-problem-phrase-migrations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const dbConfig = require('../../src/config/dbConfig');
const { getSeedPhrases } = require('../../src/services/problemPhraseSeed');

const MIGRATION_FILES = [
  '001-create-igx-problem-phrase.sql',
  '002-create-igx-ticket-problem.sql',
  '003-add-symptom-source.sql',
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

async function seedPhrases(pool) {
  const phrases = getSeedPhrases();
  let inserted = 0;
  let skipped = 0;

  for (const row of phrases) {
    const result = await pool.request()
      .input('phrase', sql.NVarChar(200), row.phrase)
      .input('kind', sql.VarChar(20), row.kind)
      .input('code', sql.NVarChar(50), row.code)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.IgxProblemPhrase WHERE phrase = @phrase)
        BEGIN
          INSERT INTO dbo.IgxProblemPhrase (phrase, kind, code)
          VALUES (@phrase, @kind, @code);
          SELECT 1 AS inserted;
        END
        ELSE
        BEGIN
          SELECT 0 AS inserted;
        END
      `);
    if (result.recordset[0]?.inserted === 1) inserted += 1;
    else skipped += 1;
  }

  console.log(`Seed phrases: inserted=${inserted}, already_present=${skipped}, total=${phrases.length}`);
}

async function main() {
  console.log('Problem Phrase migrations →', dbConfig.database, 'on', dbConfig.server);
  const pool = await sql.connect(dbConfig);
  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(__dirname, file);
      console.log('Running', file, '...');
      await runBatch(pool, filePath);
      console.log('OK', file);
    }
    console.log('Seeding phrases...');
    await seedPhrases(pool);
    console.log('All Problem Phrase migrations completed.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('Problem Phrase migration failed:', err.message);
  process.exit(1);
});
