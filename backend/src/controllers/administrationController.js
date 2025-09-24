const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Helper function to get database connection
async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Database connection failed');
  }
}

// ==================== PLANT CRUD OPERATIONS ====================

// Get all plants
const getPlants = async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .query(`
        SELECT id, name, description, code, is_active, created_at, updated_at
        FROM Plant 
        ORDER BY name
      `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get plants error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get plant by ID
const getPlantById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT id, name, description, code, is_active, created_at, updated_at
        FROM Plant 
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Get plant by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create new plant
const createPlant = async (req, res) => {
  try {
    const { name, description, code, is_active = true } = req.body;
    const pool = await getConnection();
    
    // Check if code already exists
    const existingPlant = await pool.request()
      .input('code', sql.VarChar, code)
      .query('SELECT id FROM Plant WHERE code = @code');
    
    if (existingPlant.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant code already exists'
      });
    }

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO Plant (name, description, code, is_active, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@name, @description, @code, @is_active, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: 'Plant created successfully'
    });

  } catch (error) {
    console.error('Create plant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update plant
const updatePlant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, code, is_active } = req.body;
    const pool = await getConnection();
    
    // Check if plant exists
    const existingPlant = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM Plant WHERE id = @id');
    
    if (existingPlant.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if code already exists for other plants
    const codeCheck = await pool.request()
      .input('code', sql.VarChar, code)
      .input('id', sql.Int, id)
      .query('SELECT id FROM Plant WHERE code = @code AND id != @id');
    
    if (codeCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant code already exists'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE Plant 
        SET name = @name, description = @description, code = @code, 
            is_active = @is_active, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Plant updated successfully'
    });

  } catch (error) {
    console.error('Update plant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete plant
const deletePlant = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if plant has areas
    const areasCheck = await pool.request()
      .input('plant_id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Area WHERE plant_id = @plant_id');
    
    if (areasCheck.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plant with existing areas'
      });
    }

    // Check if plant has lines
    const linesCheck = await pool.request()
      .input('plant_id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Line WHERE plant_id = @plant_id');
    
    if (linesCheck.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plant with existing lines'
      });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Plant WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    res.json({
      success: true,
      message: 'Plant deleted successfully'
    });

  } catch (error) {
    console.error('Delete plant error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plant because it has associated areas. Please delete all areas first.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ==================== AREA CRUD OPERATIONS ====================

// Get all areas
const getAreas = async (req, res) => {
  try {
    const { plant_id } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (plant_id) {
      whereClause = 'WHERE a.plant_id = @plant_id';
      request.input('plant_id', sql.Int, plant_id);
    }

    const result = await request.query(`
      SELECT a.id, a.plant_id, a.name, a.description, a.code, a.is_active, 
             a.created_at, a.updated_at, p.name as plant_name
      FROM Area a
      LEFT JOIN Plant p ON a.plant_id = p.id
      ${whereClause}
      ORDER BY p.name, a.name
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get area by ID
const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT a.id, a.plant_id, a.name, a.description, a.code, a.is_active, 
               a.created_at, a.updated_at, p.name as plant_name
        FROM Area a
        LEFT JOIN Plant p ON a.plant_id = p.id
        WHERE a.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Get area by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create new area
const createArea = async (req, res) => {
  try {
    const { plant_id, name, description, code, is_active = true } = req.body;
    const pool = await getConnection();
    
    // Check if plant exists
    const plantCheck = await pool.request()
      .input('plant_id', sql.Int, plant_id)
      .query('SELECT id FROM Plant WHERE id = @plant_id');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if code already exists
    const existingArea = await pool.request()
      .input('code', sql.VarChar, code)
      .query('SELECT id FROM Area WHERE code = @code');
    
    if (existingArea.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Area code already exists'
      });
    }

    const result = await pool.request()
      .input('plant_id', sql.Int, plant_id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO Area (plant_id, name, description, code, is_active, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@plant_id, @name, @description, @code, @is_active, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: 'Area created successfully'
    });

  } catch (error) {
    console.error('Create area error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update area
const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { plant_id, name, description, code, is_active } = req.body;
    const pool = await getConnection();
    
    // Check if area exists
    const existingArea = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM Area WHERE id = @id');
    
    if (existingArea.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if plant exists
    const plantCheck = await pool.request()
      .input('plant_id', sql.Int, plant_id)
      .query('SELECT id FROM Plant WHERE id = @plant_id');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if code already exists for other areas
    const codeCheck = await pool.request()
      .input('code', sql.VarChar, code)
      .input('id', sql.Int, id)
      .query('SELECT id FROM Area WHERE code = @code AND id != @id');
    
    if (codeCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Area code already exists'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('plant_id', sql.Int, plant_id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE Area 
        SET plant_id = @plant_id, name = @name, description = @description, 
            code = @code, is_active = @is_active, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Area updated successfully'
    });

  } catch (error) {
    console.error('Update area error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete area
const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if area has lines
    const linesCheck = await pool.request()
      .input('area_id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Line WHERE area_id = @area_id');
    
    if (linesCheck.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete area with existing lines'
      });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Area WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    res.json({
      success: true,
      message: 'Area deleted successfully'
    });

  } catch (error) {
    console.error('Delete area error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete area because it has associated lines. Please delete all lines first.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ==================== LINE CRUD OPERATIONS ====================

// Get all lines
const getLines = async (req, res) => {
  try {
    const { plant_id, area_id } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (plant_id) {
      whereClause = 'WHERE l.plant_id = @plant_id';
      request.input('plant_id', sql.Int, plant_id);
    }
    
    if (area_id) {
      whereClause = whereClause ? `${whereClause} AND l.area_id = @area_id` : 'WHERE l.area_id = @area_id';
      request.input('area_id', sql.Int, area_id);
    }

    const result = await request.query(`
      SELECT l.id, l.plant_id, l.area_id, l.name, l.description, l.code, l.is_active, 
             l.created_at, l.updated_at, p.name as plant_name, a.name as area_name
      FROM Line l
      LEFT JOIN Plant p ON l.plant_id = p.id
      LEFT JOIN Area a ON l.area_id = a.id
      ${whereClause}
      ORDER BY p.name, a.name, l.name
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get lines error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get line by ID
const getLineById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT l.id, l.plant_id, l.area_id, l.name, l.description, l.code, l.is_active, 
               l.created_at, l.updated_at, p.name as plant_name, a.name as area_name
        FROM Line l
        LEFT JOIN Plant p ON l.plant_id = p.id
        LEFT JOIN Area a ON l.area_id = a.id
        WHERE l.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Line not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Get line by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create new line
const createLine = async (req, res) => {
  try {
    const { plant_id, area_id, name, description, code, is_active = true } = req.body;
    const pool = await getConnection();
    
    // Check if plant exists
    const plantCheck = await pool.request()
      .input('plant_id', sql.Int, plant_id)
      .query('SELECT id FROM Plant WHERE id = @plant_id');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if area exists
    const areaCheck = await pool.request()
      .input('area_id', sql.Int, area_id)
      .query('SELECT id FROM Area WHERE id = @area_id');
    
    if (areaCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if code already exists
    const existingLine = await pool.request()
      .input('code', sql.VarChar, code)
      .query('SELECT id FROM Line WHERE code = @code');
    
    if (existingLine.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Line code already exists'
      });
    }

    const result = await pool.request()
      .input('plant_id', sql.Int, plant_id)
      .input('area_id', sql.Int, area_id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO Line (plant_id, area_id, name, description, code, is_active, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@plant_id, @area_id, @name, @description, @code, @is_active, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: 'Line created successfully'
    });

  } catch (error) {
    console.error('Create line error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update line
const updateLine = async (req, res) => {
  try {
    const { id } = req.params;
    const { plant_id, area_id, name, description, code, is_active } = req.body;
    const pool = await getConnection();
    
    // Check if line exists
    const existingLine = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM Line WHERE id = @id');
    
    if (existingLine.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Line not found'
      });
    }

    // Check if plant exists
    const plantCheck = await pool.request()
      .input('plant_id', sql.Int, plant_id)
      .query('SELECT id FROM Plant WHERE id = @plant_id');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if area exists
    const areaCheck = await pool.request()
      .input('area_id', sql.Int, area_id)
      .query('SELECT id FROM Area WHERE id = @area_id');
    
    if (areaCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if code already exists for other lines
    const codeCheck = await pool.request()
      .input('code', sql.VarChar, code)
      .input('id', sql.Int, id)
      .query('SELECT id FROM Line WHERE code = @code AND id != @id');
    
    if (codeCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Line code already exists'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('plant_id', sql.Int, plant_id)
      .input('area_id', sql.Int, area_id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE Line 
        SET plant_id = @plant_id, area_id = @area_id, name = @name, 
            description = @description, code = @code, is_active = @is_active, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Line updated successfully'
    });

  } catch (error) {
    console.error('Update line error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete line
const deleteLine = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if line has machines
    const machinesCheck = await pool.request()
      .input('line_id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Machine WHERE line_id = @line_id');
    
    if (machinesCheck.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete line with existing machines'
      });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Line WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Line not found'
      });
    }

    res.json({
      success: true,
      message: 'Line deleted successfully'
    });

  } catch (error) {
    console.error('Delete line error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete line because it has associated machines. Please delete all machines first.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ==================== MACHINE CRUD OPERATIONS ====================

// Get all machines
const getMachines = async (req, res) => {
  try {
    const { line_id, plant_id, area_id } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (line_id) {
      whereClause = 'WHERE m.line_id = @line_id';
      request.input('line_id', sql.Int, line_id);
    } else if (area_id) {
      whereClause = 'WHERE l.area_id = @area_id';
      request.input('area_id', sql.Int, area_id);
    } else if (plant_id) {
      whereClause = 'WHERE l.plant_id = @plant_id';
      request.input('plant_id', sql.Int, plant_id);
    }

    const result = await request.query(`
      SELECT m.id, m.line_id, m.name, m.description, m.code, m.machine_number, m.is_active, 
             m.created_at, m.updated_at, l.name as line_name, a.name as area_name, p.name as plant_name
      FROM Machine m
      LEFT JOIN Line l ON m.line_id = l.id
      LEFT JOIN Area a ON l.area_id = a.id
      LEFT JOIN Plant p ON l.plant_id = p.id
      ${whereClause}
      ORDER BY p.name, a.name, l.name, m.machine_number
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get machines error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get machine by ID
const getMachineById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT m.id, m.line_id, m.name, m.description, m.code, m.machine_number, m.is_active, 
               m.created_at, m.updated_at, l.name as line_name, a.name as area_name, p.name as plant_name
        FROM Machine m
        LEFT JOIN Line l ON m.line_id = l.id
        LEFT JOIN Area a ON l.area_id = a.id
        LEFT JOIN Plant p ON l.plant_id = p.id
        WHERE m.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Get machine by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create new machine
const createMachine = async (req, res) => {
  try {
    const { line_id, name, description, code, machine_number, is_active = true } = req.body;
    const pool = await getConnection();
    
    // Check if line exists
    const lineCheck = await pool.request()
      .input('line_id', sql.Int, line_id)
      .query('SELECT id FROM Line WHERE id = @line_id');
    
    if (lineCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Line not found'
      });
    }

    // Check if code already exists
    const existingMachine = await pool.request()
      .input('code', sql.VarChar, code)
      .query('SELECT id FROM Machine WHERE code = @code');
    
    if (existingMachine.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Machine code already exists'
      });
    }

    const result = await pool.request()
      .input('line_id', sql.Int, line_id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('machine_number', sql.Int, machine_number)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO Machine (line_id, name, description, code, machine_number, is_active, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@line_id, @name, @description, @code, @machine_number, @is_active, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: 'Machine created successfully'
    });

  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update machine
const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { line_id, name, description, code, machine_number, is_active } = req.body;
    const pool = await getConnection();
    
    // Check if machine exists
    const existingMachine = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM Machine WHERE id = @id');
    
    if (existingMachine.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    // Check if line exists
    const lineCheck = await pool.request()
      .input('line_id', sql.Int, line_id)
      .query('SELECT id FROM Line WHERE id = @line_id');
    
    if (lineCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Line not found'
      });
    }

    // Check if code already exists for other machines
    const codeCheck = await pool.request()
      .input('code', sql.VarChar, code)
      .input('id', sql.Int, id)
      .query('SELECT id FROM Machine WHERE code = @code AND id != @id');
    
    if (codeCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Machine code already exists'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('line_id', sql.Int, line_id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('code', sql.VarChar, code)
      .input('machine_number', sql.Int, machine_number)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE Machine 
        SET line_id = @line_id, name = @name, description = @description, 
            code = @code, machine_number = @machine_number, is_active = @is_active, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Machine updated successfully'
    });

  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete machine
const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Machine WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.json({
      success: true,
      message: 'Machine deleted successfully'
    });

  } catch (error) {
    console.error('Delete machine error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete machine because it has associated records. Please check for any related data first.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ==================== TICKET APPROVAL CRUD OPERATIONS ====================

// Get all ticket approvals
const getTicketApprovals = async (req, res) => {
  try {
    const { area_id, personno, search, is_active } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (area_id) {
      whereClause = 'WHERE ta.area_id = @area_id';
      request.input('area_id', sql.Int, area_id);
    }
    
    if (personno) {
      whereClause = whereClause ? `${whereClause} AND ta.personno = @personno` : 'WHERE ta.personno = @personno';
      request.input('personno', sql.Int, personno);
    }

    if (search) {
      const searchCondition = `(ta.personno LIKE @search OR per.PERSON_NAME LIKE @search OR per.FIRSTNAME LIKE @search OR per.LASTNAME LIKE @search OR per.PERSONCODE LIKE @search)`;
      whereClause = whereClause ? `${whereClause} AND ${searchCondition}` : `WHERE ${searchCondition}`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (is_active !== undefined) {
      const activeCondition = 'ta.is_active = @is_active';
      whereClause = whereClause ? `${whereClause} AND ${activeCondition}` : `WHERE ${activeCondition}`;
      request.input('is_active', sql.Bit, is_active === 'true' ? 1 : 0);
    }

    const result = await request.query(`
      SELECT ta.id, ta.personno, ta.area_id, ta.approval_level, ta.is_active, 
             ta.created_at, ta.updated_at, a.name as area_name, p.name as plant_name,
             per.PERSON_NAME as person_name, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE
      FROM TicketApproval ta
      LEFT JOIN Area a ON ta.area_id = a.id
      LEFT JOIN Plant p ON a.plant_id = p.id
      LEFT JOIN Person per ON ta.personno = per.PERSONNO
      ${whereClause}
      ORDER BY p.name, a.name, ta.approval_level
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get ticket approvals error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get ticket approval by ID
const getTicketApprovalById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT ta.id, ta.personno, ta.area_id, ta.approval_level, ta.is_active, 
               ta.created_at, ta.updated_at, a.name as area_name, p.name as plant_name,
               per.PERSON_NAME as person_name, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE
        FROM TicketApproval ta
        LEFT JOIN Area a ON ta.area_id = a.id
        LEFT JOIN Plant p ON a.plant_id = p.id
        LEFT JOIN Person per ON ta.personno = per.PERSONNO
        WHERE ta.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket approval not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Get ticket approval by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create new ticket approval
const createTicketApproval = async (req, res) => {
  try {
    const { personno, area_id, approval_level, is_active = true } = req.body;
    const pool = await getConnection();

    // Validate required fields
    if (!personno || !area_id || !approval_level) {
      return res.status(400).json({
        success: false,
        message: 'Person number, area ID, and approval level are required'
      });
    }

    // Validate approval level (1-3 only)
    if (![1, 2, 3].includes(parseInt(approval_level))) {
      return res.status(400).json({
        success: false,
        message: 'Approval level must be 1, 2, or 3'
      });
    }

    // Check if person exists
    const personCheck = await pool.request()
      .input('personno', sql.Int, personno)
      .query('SELECT PERSONNO FROM Person WHERE PERSONNO = @personno');
    
    if (personCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Person not found'
      });
    }
    
    // Check if area exists
    const areaCheck = await pool.request()
      .input('area_id', sql.Int, area_id)
      .query('SELECT id FROM Area WHERE id = @area_id');
    
    if (areaCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if person already has approval for this area and level
    const existingApproval = await pool.request()
      .input('personno', sql.Int, personno)
      .input('area_id', sql.Int, area_id)
      .input('approval_level', sql.Int, approval_level)
      .query('SELECT id FROM TicketApproval WHERE personno = @personno AND area_id = @area_id AND approval_level = @approval_level');
    
    if (existingApproval.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Person already has approval for this area and level'
      });
    }

    const result = await pool.request()
      .input('personno', sql.Int, personno)
      .input('area_id', sql.Int, area_id)
      .input('approval_level', sql.Int, approval_level)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO TicketApproval (personno, area_id, approval_level, is_active, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@personno, @area_id, @approval_level, @is_active, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: 'Ticket approval created successfully'
    });

  } catch (error) {
    console.error('Create ticket approval error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update ticket approval
const updateTicketApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { personno, area_id, approval_level, is_active } = req.body;
    const pool = await getConnection();
    
    // Check if ticket approval exists
    const existingApproval = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM TicketApproval WHERE id = @id');
    
    if (existingApproval.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket approval not found'
      });
    }

    // Check if area exists
    const areaCheck = await pool.request()
      .input('area_id', sql.Int, area_id)
      .query('SELECT id FROM Area WHERE id = @area_id');
    
    if (areaCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if person already has approval for this area and level (excluding current record)
    const duplicateCheck = await pool.request()
      .input('personno', sql.Int, personno)
      .input('area_id', sql.Int, area_id)
      .input('approval_level', sql.Int, approval_level)
      .input('id', sql.Int, id)
      .query('SELECT id FROM TicketApproval WHERE personno = @personno AND area_id = @area_id AND approval_level = @approval_level AND id != @id');
    
    if (duplicateCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Person already has approval for this area and level'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('personno', sql.Int, personno)
      .input('area_id', sql.Int, area_id)
      .input('approval_level', sql.Int, approval_level)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE TicketApproval 
        SET personno = @personno, area_id = @area_id, approval_level = @approval_level, 
            is_active = @is_active, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Ticket approval updated successfully'
    });

  } catch (error) {
    console.error('Update ticket approval error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Delete ticket approval
const deleteTicketApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM TicketApproval WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket approval not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket approval deleted successfully'
    });

  } catch (error) {
    console.error('Delete ticket approval error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ticket approval because it has associated records. Please check for any related data first.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ==================== LOOKUP DATA ====================

// Get lookup data for dropdowns
const getLookupData = async (req, res) => {
  try {
    const pool = await getConnection();

    const [plantsResult, areasResult, linesResult] = await Promise.all([
      pool.request().query('SELECT id, name, code FROM Plant WHERE is_active = 1 ORDER BY name'),
      pool.request().query(`
        SELECT a.id, a.name, a.code, a.plant_id, p.name as plant_name 
        FROM Area a 
        LEFT JOIN Plant p ON a.plant_id = p.id 
        WHERE a.is_active = 1 
        ORDER BY p.name, a.name
      `),
      pool.request().query(`
        SELECT l.id, l.name, l.code, l.plant_id, l.area_id, 
               p.name as plant_name, a.name as area_name
        FROM Line l 
        LEFT JOIN Plant p ON l.plant_id = p.id 
        LEFT JOIN Area a ON l.area_id = a.id 
        WHERE l.is_active = 1 
        ORDER BY p.name, a.name, l.name
      `)
    ]);

    res.json({
      success: true,
      data: {
        plants: plantsResult.recordset,
        areas: areasResult.recordset,
        lines: linesResult.recordset
      }
    });

  } catch (error) {
    console.error('Get lookup data error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Search persons
const searchPersons = async (req, res) => {
  try {
    const { search, limit = 20 } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (search) {
      whereClause = `WHERE (PERSONNO LIKE @search OR PERSON_NAME LIKE @search OR FIRSTNAME LIKE @search OR LASTNAME LIKE @search OR PERSONCODE LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    
    const result = await request.query(`
      SELECT TOP ${limit} PERSONNO, PERSON_NAME, FIRSTNAME, LASTNAME, PERSONCODE, EMAIL, PHONE
      FROM Person
      ${whereClause}
      ORDER BY PERSON_NAME
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Search persons error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  // Plant operations
  getPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  
  // Area operations
  getAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea,
  
  // Line operations
  getLines,
  getLineById,
  createLine,
  updateLine,
  deleteLine,
  
  // Machine operations
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  
  // Ticket approval operations
  getTicketApprovals,
  getTicketApprovalById,
  createTicketApproval,
  updateTicketApproval,
  deleteTicketApproval,
  
  // Lookup data
  getLookupData,
  // Person search
  searchPersons
};
