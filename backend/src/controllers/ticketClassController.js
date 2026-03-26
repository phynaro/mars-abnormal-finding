const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

const pickFirstColumn = (columns, candidates) => {
  const normalized = new Map(
    columns.map((column) => [column.toLowerCase(), column])
  );

  for (const candidate of candidates) {
    const match = normalized.get(candidate.toLowerCase());
    if (match) {
      return match;
    }
  }

  return null;
};

/**
 * Get all ticket classes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with ticket classes
 */
const getTicketClasses = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    const columnsResult = await pool.request().query(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME IN ('TicketClass', 'IgxTicketClass')
      ORDER BY
        CASE WHEN TABLE_NAME = 'TicketClass' THEN 0 ELSE 1 END,
        ORDINAL_POSITION ASC
    `);

    const tableColumns = columnsResult.recordset.reduce((acc, row) => {
      if (!acc[row.TABLE_NAME]) {
        acc[row.TABLE_NAME] = [];
      }
      acc[row.TABLE_NAME].push(row.COLUMN_NAME);
      return acc;
    }, {});

    const sourceTable = tableColumns.TicketClass?.length
      ? 'TicketClass'
      : tableColumns.IgxTicketClass?.length
        ? 'IgxTicketClass'
        : null;

    if (!sourceTable) {
      return res.status(404).json({
        success: false,
        message: 'Ticket class source table not found'
      });
    }

    const sourceColumns = tableColumns[sourceTable];
    const idColumn = pickFirstColumn(sourceColumns, ['id', 'TicketClassNo', 'ticketClassNo']);
    const englishColumn = pickFirstColumn(sourceColumns, ['name_en', 'description_en', 'TicketClassDescEN', 'ticketClassDescEn']);
    const thaiColumn = pickFirstColumn(sourceColumns, ['name_th', 'description_th', 'TicketClassDescTH', 'ticketClassDescTh']);
    const descriptionColumn = pickFirstColumn(sourceColumns, ['description', 'TicketClassDesc', 'ticketClassDesc', 'name', 'Name']);

    if (!idColumn || (!englishColumn && !thaiColumn && !descriptionColumn)) {
      return res.status(500).json({
        success: false,
        message: `Ticket class table '${sourceTable}' does not contain the expected columns`
      });
    }

    const fallbackColumn = descriptionColumn || englishColumn || thaiColumn;
    const nameEnExpression = `[${englishColumn || fallbackColumn}]`;
    const nameThExpression = `[${thaiColumn || fallbackColumn}]`;

    const result = await pool.request().query(`
      SELECT
        [${idColumn}] AS id,
        ${nameEnExpression} AS name_en,
        ${nameThExpression} AS name_th
      FROM [dbo].[${sourceTable}]
      ORDER BY [${idColumn}] ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error fetching ticket classes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket classes',
      error: error.message
    });
  }
};

module.exports = {
  getTicketClasses
};

