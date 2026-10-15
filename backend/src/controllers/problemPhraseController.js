const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const problemTicketService = require('../services/problemTicketService');

const trimOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const getPhrases = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT id, phrase, kind, code, created_at, updated_at
      FROM dbo.IgxProblemPhrase
      ORDER BY kind ASC, LEN(phrase) DESC, phrase ASC
    `);

    return res.json({
      success: true,
      data: result.recordset,
      message: 'Phrases loaded',
    });
  } catch (error) {
    console.error('Error loading problem phrases:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load problem phrases',
      error: error.message,
    });
  }
};

const createPhrase = async (req, res) => {
  try {
    const phrase = trimOrNull(req.body?.phrase);
    const kind = trimOrNull(req.body?.kind);
    const code = trimOrNull(req.body?.code);

    if (!phrase || !kind || !code) {
      return res.status(400).json({
        success: false,
        message: 'phrase, kind, and code are required',
      });
    }

    if (kind !== 'part' && kind !== 'symptom') {
      return res.status(400).json({
        success: false,
        message: 'kind must be part or symptom',
      });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('phrase', sql.NVarChar(200), phrase)
      .input('kind', sql.VarChar(20), kind)
      .input('code', sql.NVarChar(50), code)
      .query(`
        INSERT INTO dbo.IgxProblemPhrase (phrase, kind, code)
        OUTPUT INSERTED.id, INSERTED.phrase, INSERTED.kind, INSERTED.code, INSERTED.created_at, INSERTED.updated_at
        VALUES (@phrase, @kind, @code)
      `);

    return res.status(201).json({
      success: true,
      data: result.recordset[0],
      message: 'Phrase created',
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        success: false,
        message: 'Phrase already exists',
      });
    }
    console.error('Error creating problem phrase:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create problem phrase',
      error: error.message,
    });
  }
};

const updatePhrase = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phrase id',
      });
    }

    const phrase = trimOrNull(req.body?.phrase);
    const kind = trimOrNull(req.body?.kind);
    const code = trimOrNull(req.body?.code);

    if (!phrase || !kind || !code) {
      return res.status(400).json({
        success: false,
        message: 'phrase, kind, and code are required',
      });
    }

    if (kind !== 'part' && kind !== 'symptom') {
      return res.status(400).json({
        success: false,
        message: 'kind must be part or symptom',
      });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('phrase', sql.NVarChar(200), phrase)
      .input('kind', sql.VarChar(20), kind)
      .input('code', sql.NVarChar(50), code)
      .query(`
        UPDATE dbo.IgxProblemPhrase
        SET phrase = @phrase,
            kind = @kind,
            code = @code,
            updated_at = GETDATE()
        WHERE id = @id;

        SELECT id, phrase, kind, code, created_at, updated_at
        FROM dbo.IgxProblemPhrase
        WHERE id = @id;
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({
        success: false,
        message: 'Phrase not found',
      });
    }

    return res.json({
      success: true,
      data: result.recordset[0],
      message: 'Phrase updated',
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        success: false,
        message: 'Phrase already exists',
      });
    }
    console.error('Error updating problem phrase:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update problem phrase',
      error: error.message,
    });
  }
};

const deletePhrase = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phrase id',
      });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM dbo.IgxProblemPhrase
        WHERE id = @id;
        SELECT @@ROWCOUNT AS deleted;
      `);

    if (!result.recordset[0]?.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Phrase not found',
      });
    }

    return res.json({
      success: true,
      message: 'Phrase deleted',
    });
  } catch (error) {
    console.error('Error deleting problem phrase:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete problem phrase',
      error: error.message,
    });
  }
};

const rerunClassification = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const counts = await problemTicketService.classifyAllTickets(pool);
    return res.json({
      success: true,
      data: counts,
      message: 'Classification completed',
    });
  } catch (error) {
    console.error('Error rerunning classification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to rerun classification',
      error: error.message,
    });
  }
};

const getBucketCounts = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const counts = await problemTicketService.getBucketCounts(pool);
    return res.json({
      success: true,
      data: counts,
      message: 'Bucket counts loaded',
    });
  } catch (error) {
    console.error('Error loading bucket counts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load bucket counts',
      error: error.message,
    });
  }
};

const getBucketTickets = async (req, res) => {
  try {
    const bucket = String(req.query.bucket || 'full').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    let bucketSql = 'tp.part_code IS NOT NULL AND tp.symptom_code IS NOT NULL';
    if (bucket === 'part_only') {
      bucketSql = 'tp.part_code IS NOT NULL AND tp.symptom_code IS NULL';
    } else if (bucket === 'symptom_only') {
      bucketSql = 'tp.part_code IS NULL AND tp.symptom_code IS NOT NULL';
    } else if (bucket === 'none') {
      bucketSql = 'tp.part_code IS NULL AND tp.symptom_code IS NULL';
    } else if (bucket !== 'full') {
      return res.status(400).json({
        success: false,
        message: 'bucket must be full, part_only, symptom_only, or none',
      });
    }

    const pool = await sql.connect(dbConfig);
    const countResult = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM dbo.IgxTicketProblem tp
      INNER JOIN dbo.IgxTickets t ON t.id = tp.ticket_id
      WHERE ${bucketSql}
    `);

    const dataResult = await pool.request()
      .input('startRow', sql.Int, offset + 1)
      .input('endRow', sql.Int, offset + limit)
      .query(`
        SELECT *
        FROM (
          SELECT
            t.id,
            t.ticket_number,
            t.title,
            t.created_at,
            t.puno,
            pu.PUCODE AS pucode,
            pe.plant,
            tp.part_code,
            tp.symptom_code,
            tp.symptom_source,
            tp.side,
            tp.station,
            tp.classified_at,
            ROW_NUMBER() OVER (ORDER BY t.created_at DESC, t.id DESC) AS row_num
          FROM dbo.IgxTicketProblem tp
          INNER JOIN dbo.IgxTickets t ON t.id = tp.ticket_id
          LEFT JOIN dbo.PU pu ON pu.PUNO = t.puno
          LEFT JOIN dbo.IgxPUExtension pe ON pe.puno = t.puno
          WHERE ${bucketSql}
        ) ranked
        WHERE ranked.row_num BETWEEN @startRow AND @endRow
        ORDER BY ranked.row_num
      `);

    return res.json({
      success: true,
      data: {
        rows: dataResult.recordset,
        total: countResult.recordset[0]?.total || 0,
        page,
        limit,
        bucket,
      },
      message: 'Bucket tickets loaded',
    });
  } catch (error) {
    console.error('Error loading bucket tickets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load bucket tickets',
      error: error.message,
    });
  }
};

module.exports = {
  getPhrases,
  createPhrase,
  updatePhrase,
  deletePhrase,
  rerunClassification,
  getBucketCounts,
  getBucketTickets,
};
