const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Get all targets with optional filtering
const getTargets = async (req, res) => {
  try {
    const { plant, area, year, type } = req.query;
    
    let query = `
      SELECT 
        t.id,
        t.type,
        t.period,
        t.year,
        t.target_value,
        t.unit,
        t.plant,
        t.area,
        t.created_at,
        t.updated_at,
        t.created_by,
        t.updated_by,
        pe_plant.pudescription as plant_name,
        pe_area.pudescription as area_name
      FROM dbo.IgxTarget t
      LEFT JOIN IgxPUExtension pe_plant ON t.plant = pe_plant.plant 
        AND pe_plant.digit_count = 1 
        AND pe_plant.area IS NULL
      LEFT JOIN IgxPUExtension pe_area ON t.area = pe_area.area 
        AND pe_area.digit_count = 2 
        AND pe_area.line IS NULL 
        AND pe_area.machine IS NULL
        AND (t.plant IS NULL OR t.plant = pe_area.plant)
      WHERE 1=1
    `;
    
    const params = [];
    
    if (plant && plant !== 'all') {
      query += ` AND t.plant = @plant`;
      params.push({ name: 'plant', value: plant });
    }
    
    if (area && area !== 'all') {
      query += ` AND t.area = @area`;
      params.push({ name: 'area', value: area });
    }
    
    if (year) {
      query += ` AND t.year = @year`;
      params.push({ name: 'year', value: parseInt(year) });
    }
    
    if (type) {
      query += ` AND t.type = @type`;
      params.push({ name: 'type', value: type });
    }
    
    query += ` ORDER BY t.year DESC, t.type, t.plant, t.area, t.period`;
    
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
    console.error('Error fetching targets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch targets',
      error: error.message
    });
  }
};

// Get target by ID
const getTargetById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        t.id,
        t.type,
        t.period,
        t.year,
        t.target_value,
        t.unit,
        t.area,
        t.created_at,
        t.updated_at,
        t.created_by,
        t.updated_by,
        a.name as area_name
      FROM dbo.IgxTarget t
      LEFT JOIN dbo.Area a ON t.area = a.code
      WHERE t.id = @id
    `;
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'IgxTarget not found'
      });
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('Error fetching target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch target',
      error: error.message
    });
  }
};

// Create new target
const createTarget = async (req, res) => {
  try {
    const { type, year, target_value, unit, plant, area, created_by } = req.body;
    
    // Validate required fields
    if (!type || !year || !target_value || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, year, target_value, and unit are required'
      });
    }
    
    // Validate that at least one location dimension is provided
    if (!plant && !area) {
      return res.status(400).json({
        success: false,
        message: 'At least one location dimension (plant or area) must be provided'
      });
    }
    
    // Validate type
    if (!['open case', 'close case'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "open case" or "close case"'
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
      SELECT COUNT(*) as count FROM dbo.IgxTarget 
      WHERE type = @type AND year = @year 
      AND (plant = @plant OR (plant IS NULL AND @plant IS NULL))
      AND (area = @area OR (area IS NULL AND @area IS NULL))
    `;
    
    const existingIgxTargets = await pool.request()
      .input('type', sql.NVarChar, type)
      .input('year', sql.Int, year)
      .input('plant', sql.NVarChar, plant || null)
      .input('area', sql.NVarChar, area || null)
      .query(checkQuery);
    
    if (existingIgxTargets.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'IgxTargets already exist for this type, year, and location combination. Please delete existing targets first or choose a different combination.'
      });
    }
    
    // Insert target for all periods
    const periods = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','P13'];
    
    for (const period of periods) {
      const insertQuery = `
        INSERT INTO dbo.IgxTarget (type, period, year, target_value, unit, plant, area, created_by)
        VALUES (@type, @period, @year, @target_value, @unit, @plant, @area, @created_by)
      `;
      
      await pool.request()
        .input('type', sql.NVarChar, type)
        .input('period', sql.NVarChar, period)
        .input('year', sql.Int, year)
        .input('target_value', sql.Decimal(18,2), target_value)
        .input('unit', sql.NVarChar, unit)
        .input('plant', sql.NVarChar, plant || null)
        .input('area', sql.NVarChar, area || null)
        .input('created_by', sql.NVarChar, created_by || 'system')
        .query(insertQuery);
    }
    
    res.status(201).json({
      success: true,
      message: 'IgxTarget created successfully for all periods'
    });
  } catch (error) {
    console.error('Error creating target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create target',
      error: error.message
    });
  }
};

// Create multiple targets (bulk)
const createTargetsBulk = async (req, res) => {
  try {
    const { targets } = req.body;
    console.log('targets', targets);
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IgxTargets array is required and must not be empty'
      });
    }

    // Validate all targets
    for (const target of targets) {
      const { type, year, target_value, unit, plant, area, period, created_by } = target;
      
      if (!type || !year || !target_value || !unit || !period) {
        console.log('Missing required fields: type, year, target_value, unit, and period are required');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: type, year, target_value, unit, and period are required'
        });
      }
      
      // Validate that at least one location dimension is provided
      // if (!plant && !area) {
      //   console.log('At least one location dimension (plant or area) must be provided');
      //   return res.status(400).json({ 
      //     success: false,
      //     message: 'At least one location dimension (plant or area) must be provided'
      //   });
      // }
      
      if (!['open case', 'close case'].includes(type)) {
        console.log('Invalid type. Must be "open case" or "close case"');
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Must be "open case" or "close case"'
        });
      }
      
      if (!['case', 'THB', 'percent'].includes(unit)) {
        console.log('Invalid unit. Must be "case", "THB", or "percent"');
        return res.status(400).json({
          success: false,
          message: 'Invalid unit. Must be "case", "THB", or "percent"'
        });
      }
    }

    const pool = await sql.connect(dbConfig);
    
    // Check if any targets already exist for this combination
    const firstIgxTarget = targets[0];
    const checkQuery = `
      SELECT COUNT(*) as count FROM dbo.IgxTarget 
      WHERE type = @type AND year = @year 
      AND (plant = @plant OR (plant IS NULL AND @plant IS NULL))
      AND (area = @area OR (area IS NULL AND @area IS NULL))
    `;
    
    const existingIgxTargets = await pool.request()
      .input('type', sql.NVarChar, firstIgxTarget.type)
      .input('year', sql.Int, firstIgxTarget.year)
      .input('plant', sql.NVarChar, firstIgxTarget.plant || null)
      .input('area', sql.NVarChar, firstIgxTarget.area || null)
      .query(checkQuery);
    
    if (existingIgxTargets.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'IgxTargets already exist for this type, year, and location combination. Please delete existing targets first or choose a different combination.'
      });
    }
    
    // Insert all targets
    for (const target of targets) {
      const insertQuery = `
        INSERT INTO dbo.IgxTarget (type, period, year, target_value, unit, plant, area, created_by)
        VALUES (@type, @period, @year, @target_value, @unit, @plant, @area, @created_by)
      `;
      
      await pool.request()
        .input('type', sql.NVarChar, target.type)
        .input('period', sql.NVarChar, target.period)
        .input('year', sql.Int, target.year)
        .input('target_value', sql.Decimal(18,2), target.target_value)
        .input('unit', sql.NVarChar, target.unit)
        .input('plant', sql.NVarChar, target.plant || null)
        .input('area', sql.NVarChar, target.area || null)
        .input('created_by', sql.NVarChar, target.created_by || 'system')
        .query(insertQuery);
    }
    
    res.status(201).json({
      success: true,
      message: `IgxTargets created successfully for ${targets.length} periods`
    });
  } catch (error) {
    console.error('Error creating targets bulk:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create targets',
      error: error.message
    });
  }
};

// Update target
const updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { target_value, unit, updated_by } = req.body;
    
    if (!target_value && !unit) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided for update'
      });
    }
    
    const pool = await sql.connect(dbConfig);
    
    let updateQuery = 'UPDATE dbo.IgxTarget SET updated_at = GETDATE()';
    const request = pool.request();
    
    if (target_value !== undefined) {
      updateQuery += ', target_value = @target_value';
      request.input('target_value', sql.Decimal(18,2), target_value);
    }
    
    if (unit) {
      updateQuery += ', unit = @unit';
      request.input('unit', sql.NVarChar, unit);
    }
    
    if (updated_by) {
      updateQuery += ', updated_by = @updated_by';
      request.input('updated_by', sql.NVarChar, updated_by);
    }
    
    updateQuery += ' WHERE id = @id';
    request.input('id', sql.Int, id);
    
    const result = await request.query(updateQuery);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'IgxTarget not found'
      });
    }
    
    res.json({
      success: true,
      message: 'IgxTarget updated successfully'
    });
  } catch (error) {
    console.error('Error updating target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update target',
      error: error.message
    });
  }
};

// Delete target (deletes all periods for a type/year/area combination)
const deleteTarget = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await sql.connect(dbConfig);
    
    // First get the target details to delete all related records
    const getQuery = `
      SELECT type, year, plant, area FROM dbo.IgxTarget WHERE id = @id
    `;
    
    const targetDetails = await pool.request()
      .input('id', sql.Int, id)
      .query(getQuery);
   
    if (targetDetails.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'IgxTarget not found'
      });
    }
    
    const { type, year, plant, area } = targetDetails.recordset[0];
    
    // Delete all periods for this type/year/area combination
    const deleteQuery = `
      DELETE FROM dbo.IgxTarget 
      WHERE type = @type AND year = @year AND (plant = @plant OR (plant IS NULL AND @plant IS NULL)) AND (area = @area OR (area IS NULL AND @area IS NULL))
    `;
   
    await pool.request()
      .input('type', sql.NVarChar, type)
      .input('year', sql.Int, year)
      .input('area', sql.NVarChar, area || null)
      .input('plant', sql.NVarChar, plant || null)
      .query(deleteQuery);
    
    res.json({
      success: true,
      message: 'IgxTarget deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete target',
      error: error.message
    });
  }
};

// Copy P1 target to all periods
const copyP1ToAllPeriods = async (req, res) => {
  try {
    const { type, year, area, updated_by } = req.body;
    
    if (!type || !year || !area) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, year, area'
      });
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Get P1 target value
    const getP1Query = `
      SELECT target_value, unit FROM dbo.IgxTarget 
      WHERE type = @type AND year = @year AND area = @area AND period = 'P1'
    `;
    
    const p1IgxTarget = await pool.request()
      .input('type', sql.NVarChar, type)
      .input('year', sql.Int, year)
      .input('area', sql.NVarChar, area)
      .query(getP1Query);
    
    if (p1IgxTarget.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'P1 target not found for this combination'
      });
    }
    
    const { target_value, unit } = p1IgxTarget.recordset[0];
    
    // Update all periods with P1 value
    const periods = ['P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','P13'];
    
    for (const period of periods) {
      const updateQuery = `
        UPDATE dbo.IgxTarget 
        SET target_value = @target_value, 
            unit = @unit, 
            updated_at = GETDATE(),
            updated_by = @updated_by
        WHERE type = @type AND year = @year AND area = @area AND period = @period
      `;
      
      await pool.request()
        .input('type', sql.NVarChar, type)
        .input('year', sql.Int, year)
        .input('area', sql.NVarChar, area)
        .input('period', sql.NVarChar, period)
        .input('target_value', sql.Decimal(18,2), target_value)
        .input('unit', sql.NVarChar, unit)
        .input('updated_by', sql.NVarChar, updated_by || 'system')
        .query(updateQuery);
    }
    
    res.json({
      success: true,
      message: 'P1 target copied to all periods successfully'
    });
  } catch (error) {
    console.error('Error copying P1 target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy P1 target',
      error: error.message
    });
  }
};

// Get available years
const getAvailableYears = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT year 
      FROM dbo.IgxTarget 
      ORDER BY year DESC
    `;
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);
    
    res.json({
      success: true,
      data: result.recordset.map(row => row.year)
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
  getTargets,
  getTargetById,
  createTarget,
  createTargetsBulk,
  updateTarget,
  deleteTarget,
  copyP1ToAllPeriods,
  getAvailableYears
};
