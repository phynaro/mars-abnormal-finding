const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Get personal targets for a user with optional filtering
const getPersonalTargets = async (req, res) => {
  try {
    const { personno, year, type } = req.query;
    
    let query = `
      SELECT 
        pt.id,
        pt.PERSONNO,
        pt.type,
        pt.period,
        pt.year,
        pt.target_value,
        pt.unit,
        pt.created_at,
        pt.updated_at,
        pt.created_by,
        pt.updated_by,
        p.PERSON_NAME,
        p.PERSONCODE
      FROM dbo.TicketPersonTarget pt
      LEFT JOIN dbo.Person p ON pt.PERSONNO = p.PERSONNO
      WHERE 1=1
    `;
    
    const params = [];
    
    if (personno) {
      query += ` AND pt.PERSONNO = @personno`;
      params.push({ name: 'personno', value: parseInt(personno) });
    }
    
    if (year) {
      query += ` AND pt.year = @year`;
      params.push({ name: 'year', value: parseInt(year) });
    }
    
    if (type) {
      query += ` AND pt.type = @type`;
      params.push({ name: 'type', value: type });
    }
    
    query += ` ORDER BY pt.year DESC, pt.type, pt.period, pt.PERSONNO`;
    
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    
    params.forEach(param => {
      request.input(param.name, param.value);
    });
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error fetching personal targets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personal targets',
      error: error.message
    });
  }
};

// Get personal target by ID
const getPersonalTargetById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        pt.id,
        pt.PERSONNO,
        pt.type,
        pt.period,
        pt.year,
        pt.target_value,
        pt.unit,
        pt.created_at,
        pt.updated_at,
        pt.created_by,
        pt.updated_by,
        p.PERSON_NAME,
        p.PERSONCODE
      FROM dbo.TicketPersonTarget pt
      LEFT JOIN dbo.Person p ON pt.PERSONNO = p.PERSONNO
      WHERE pt.id = @id
    `;
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Personal target not found'
      });
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('Error fetching personal target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personal target',
      error: error.message
    });
  }
};

// Create personal targets for all periods
const createPersonalTargets = async (req, res) => {
  try {
    const { PERSONNO, type, year, target_values, unit, created_by } = req.body;
    
    // Validate required fields
    if (!PERSONNO || !type || !year || !target_values) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: PERSONNO, type, year, target_values'
      });
    }
    
    // Validate type
    if (!['report', 'fix'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "report" or "fix"'
      });
    }
    
    // Validate unit
    if (!['case', 'THB', 'percent'].includes(unit)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit. Must be "case", "THB", or "percent"'
      });
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Check if targets already exist for this combination (any period)
    const checkQuery = `
      SELECT COUNT(*) as count FROM dbo.TicketPersonTarget 
      WHERE PERSONNO = @PERSONNO AND type = @type AND year = @year
    `;
    
    const existingTargets = await pool.request()
      .input('PERSONNO', sql.Int, PERSONNO)
      .input('type', sql.NVarChar, type)
      .input('year', sql.Int, year)
      .query(checkQuery);
    
    if (existingTargets.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Personal targets already exist for this person, type, and year combination. Please delete existing targets first or choose a different combination.'
      });
    }
    
    // Insert targets for all periods
    const periods = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','P13'];
    
    for (const period of periods) {
      const targetValue = target_values[period] || 0;
      
      const insertQuery = `
        INSERT INTO dbo.TicketPersonTarget (PERSONNO, type, year, period, target_value, unit, created_by, updated_by)
        VALUES (@PERSONNO, @type, @year, @period, @target_value, @unit, @created_by, @updated_by)
      `;
      
      await pool.request()
        .input('PERSONNO', sql.Int, PERSONNO)
        .input('type', sql.NVarChar, type)
        .input('year', sql.Int, year)
        .input('period', sql.NVarChar, period)
        .input('target_value', sql.Decimal(10,2), targetValue)
        .input('unit', sql.NVarChar, unit)
        .input('created_by', sql.NVarChar, created_by || 'system')
        .input('updated_by', sql.NVarChar, created_by || 'system')
        .query(insertQuery);
    }
    
    res.json({
      success: true,
      message: 'Personal targets created successfully for all periods'
    });
  } catch (error) {
    console.error('Error creating personal targets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create personal targets',
      error: error.message
    });
  }
};

// Update personal target
const updatePersonalTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { target_value, unit, updated_by } = req.body;
    
    if (target_value === undefined && !unit) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (target_value or unit) must be provided'
      });
    }
    
    const pool = await sql.connect(dbConfig);
    
    let updateQuery = 'UPDATE dbo.TicketPersonTarget SET ';
    const updateFields = [];
    
    if (target_value !== undefined) {
      updateFields.push('target_value = @target_value');
    }
    
    if (unit) {
      updateFields.push('unit = @unit');
    }
    
    updateFields.push('updated_at = GETDATE()');
    updateFields.push('updated_by = @updated_by');
    
    updateQuery += updateFields.join(', ') + ' WHERE id = @id';
    
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('updated_by', sql.NVarChar, updated_by || 'system');
    
    if (target_value !== undefined) {
      request.input('target_value', sql.Decimal(10,2), target_value);
    }
    
    if (unit) {
      request.input('unit', sql.NVarChar, unit);
    }
    
    const result = await request.query(updateQuery);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Personal target not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Personal target updated successfully'
    });
  } catch (error) {
    console.error('Error updating personal target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update personal target',
      error: error.message
    });
  }
};

// Delete personal targets for a person, type, and year combination
const deletePersonalTargets = async (req, res) => {
  try {
    const { PERSONNO, type, year } = req.body;
    
    if (!PERSONNO || !type || !year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: PERSONNO, type, year'
      });
    }
    
    const pool = await sql.connect(dbConfig);
    
    const deleteQuery = `
      DELETE FROM dbo.TicketPersonTarget 
      WHERE PERSONNO = @PERSONNO AND type = @type AND year = @year
    `;
    
    const result = await pool.request()
      .input('PERSONNO', sql.Int, PERSONNO)
      .input('type', sql.NVarChar, type)
      .input('year', sql.Int, year)
      .query(deleteQuery);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'No personal targets found for the specified criteria'
      });
    }
    
    res.json({
      success: true,
      message: 'Personal targets deleted successfully',
      deletedCount: result.rowsAffected[0]
    });
  } catch (error) {
    console.error('Error deleting personal targets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete personal targets',
      error: error.message
    });
  }
};

// Get available years for personal targets
const getPersonalTargetAvailableYears = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT year 
      FROM dbo.TicketPersonTarget 
      ORDER BY year DESC
    `;
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);
    
    const years = result.recordset.map(row => row.year);
    
    res.json({
      success: true,
      data: years
    });
  } catch (error) {
    console.error('Error fetching available years:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available years',
      error: error.message
    });
  }
};

module.exports = {
  getPersonalTargets,
  getPersonalTargetById,
  createPersonalTargets,
  updatePersonalTarget,
  deletePersonalTargets,
  getPersonalTargetAvailableYears
};
