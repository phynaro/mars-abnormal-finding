/**
 * One-shot backfill: classify every IgxTickets title into IgxTicketProblem.
 * Usage: node backend/script/problem-phrase/run-classify-all.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const sql = require('mssql');
const dbConfig = require('../../src/config/dbConfig');
const { classifyAllTickets } = require('../../src/services/problemTicketService');

async function main() {
  console.log('Classify all tickets →', dbConfig.database, 'on', dbConfig.server);
  const pool = await sql.connect(dbConfig);
  try {
    const counts = await classifyAllTickets(pool);
    console.log(JSON.stringify(counts, null, 2));
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('Classify all failed:', err.message);
  process.exit(1);
});
