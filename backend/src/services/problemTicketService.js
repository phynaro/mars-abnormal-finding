const sql = require('mssql');
const { classifyTitle, getMatchBucket } = require('./problemClassifyService');

async function loadPhrases(pool) {
  const result = await pool.request().query(`
    SELECT phrase, kind, code
    FROM dbo.IgxProblemPhrase
  `);
  return result.recordset || [];
}

async function upsertTicketProblem(pool, ticketId, title, phrases, failureModeCode = null) {
  const classified = classifyTitle(title, phrases, { failureModeCode });

  await pool.request()
    .input('ticket_id', sql.Int, ticketId)
    .input('part_code', sql.NVarChar(50), classified.part)
    .input('symptom_code', sql.NVarChar(50), classified.symptom)
    .input('symptom_source', sql.NVarChar(20), classified.symptomSource)
    .input('side', sql.NVarChar(10), classified.side)
    .input('station', sql.NVarChar(20), classified.station)
    .query(`
      IF EXISTS (SELECT 1 FROM dbo.IgxTicketProblem WHERE ticket_id = @ticket_id)
      BEGIN
        UPDATE dbo.IgxTicketProblem
        SET part_code = @part_code,
            symptom_code = @symptom_code,
            symptom_source = @symptom_source,
            side = @side,
            station = @station,
            classified_at = GETDATE()
        WHERE ticket_id = @ticket_id;
      END
      ELSE
      BEGIN
        INSERT INTO dbo.IgxTicketProblem
          (ticket_id, part_code, symptom_code, symptom_source, side, station, classified_at)
        VALUES
          (@ticket_id, @part_code, @symptom_code, @symptom_source, @side, @station, GETDATE());
      END
    `);

  return classified;
}

async function classifyTicketById(pool, ticketId) {
  const ticketResult = await pool.request()
    .input('id', sql.Int, ticketId)
    .query(`
      SELECT t.id, t.title, fm.FailureModeCode AS failure_mode_code
      FROM dbo.IgxTickets t
      LEFT JOIN dbo.FailureModes fm
        ON t.failure_mode_id = fm.FailureModeNo AND fm.FlagDel != 'Y'
      WHERE t.id = @id
    `);

  const ticket = ticketResult.recordset[0];
  if (!ticket) return null;

  const phrases = await loadPhrases(pool);
  return upsertTicketProblem(
    pool,
    ticket.id,
    ticket.title,
    phrases,
    ticket.failure_mode_code,
  );
}

async function classifyAllTickets(pool) {
  const phrases = await loadPhrases(pool);
  const tickets = await pool.request().query(`
    SELECT t.id, t.title, fm.FailureModeCode AS failure_mode_code
    FROM dbo.IgxTickets t
    LEFT JOIN dbo.FailureModes fm
      ON t.failure_mode_id = fm.FailureModeNo AND fm.FlagDel != 'Y'
  `);
  const rows = tickets.recordset || [];

  const counts = { full: 0, part_only: 0, symptom_only: 0, none: 0, total: rows.length };

  for (const ticket of rows) {
    const classified = await upsertTicketProblem(
      pool,
      ticket.id,
      ticket.title,
      phrases,
      ticket.failure_mode_code,
    );
    counts[getMatchBucket(classified)] += 1;
  }

  return counts;
}

async function getBucketCounts(pool) {
  const result = await pool.request().query(`
    SELECT
      SUM(CASE WHEN part_code IS NOT NULL AND symptom_code IS NOT NULL THEN 1 ELSE 0 END) AS full_match,
      SUM(CASE WHEN part_code IS NOT NULL AND symptom_code IS NULL THEN 1 ELSE 0 END) AS part_only,
      SUM(CASE WHEN part_code IS NULL AND symptom_code IS NOT NULL THEN 1 ELSE 0 END) AS symptom_only,
      SUM(CASE WHEN part_code IS NULL AND symptom_code IS NULL THEN 1 ELSE 0 END) AS no_match,
      COUNT(*) AS classified
    FROM dbo.IgxTicketProblem
  `);
  const row = result.recordset[0] || {};
  return {
    full: row.full_match || 0,
    part_only: row.part_only || 0,
    symptom_only: row.symptom_only || 0,
    none: row.no_match || 0,
    classified: row.classified || 0,
  };
}

module.exports = {
  loadPhrases,
  upsertTicketProblem,
  classifyTicketById,
  classifyAllTickets,
  getBucketCounts,
};
