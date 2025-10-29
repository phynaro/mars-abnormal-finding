const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

/**
 * Get all ticket classes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with ticket classes
 */
const getTicketClasses = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Always return both name_en and name_th - let frontend select based on context
    const result = await pool.request().query(`
      SELECT 
        id,
        name_en,
        name_th
      FROM IgxTicketClass
      ORDER BY id ASC
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

