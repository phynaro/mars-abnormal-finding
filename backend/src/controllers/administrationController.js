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

// Get all ticket approvals (distinct user and level combinations)
const getTicketApprovals = async (req, res) => {
  try {
    const { plant_code, personno, search, is_active } = req.query;
    const pool = await getConnection();
    
    let whereClause = '';
    const request = pool.request();
    
    if (plant_code) {
      whereClause = 'WHERE ta.plant_code = @plant_code';
      request.input('plant_code', sql.NVarChar, plant_code);
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
      SELECT 
             ta.personno, 
             ta.approval_level, 
             CAST(MAX(CAST(ta.is_active AS INT)) AS BIT) as is_active, 
             MIN(ta.created_at) as created_at, 
             MAX(ta.updated_at) as updated_at,
             per.PERSON_NAME as person_name, 
             per.FIRSTNAME, 
             per.LASTNAME, 
             per.PERSONCODE,
             CASE 
               WHEN ta.approval_level = 1 THEN 'L1 - Create/Review/Reopen'
               WHEN ta.approval_level = 2 THEN 'L2 - Accept/Reject/Escalate/Complete'
               WHEN ta.approval_level = 3 THEN 'L3 - Reassign/Reject Final'
               WHEN ta.approval_level = 4 THEN 'L4 - Approve Close'
               ELSE 'Unknown Level'
             END as approval_level_name,
             COUNT(*) as total_approvals
      FROM TicketApproval ta
      LEFT JOIN Person per ON ta.personno = per.PERSONNO
      ${whereClause}
      GROUP BY ta.personno, ta.approval_level, per.PERSON_NAME, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE
      ORDER BY per.PERSON_NAME, ta.approval_level
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

// Get all approvals for a specific person and level (for editing)
const getTicketApprovalsByPersonAndLevel = async (req, res) => {
  try {
    const { personno, approval_level } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('personno', sql.Int, personno)
      .input('approval_level', sql.Int, approval_level)
      .query(`
        SELECT ta.id, ta.personno, ta.plant_code, ta.area_code, ta.line_code, ta.machine_code, 
               ta.approval_level, ta.is_active, ta.created_at, ta.updated_at,
               per.PERSON_NAME as person_name, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE,
               CASE 
                 WHEN ta.machine_code IS NOT NULL THEN 'Machine: ' + ta.machine_code
                 WHEN ta.line_code IS NOT NULL THEN 'Line: ' + ta.line_code
                 WHEN ta.area_code IS NOT NULL THEN 'Area: ' + ta.area_code
                 ELSE 'Plant: ' + ta.plant_code
               END as location_scope,
               CASE 
                 WHEN ta.approval_level = 1 THEN 'L1 - Create/Review/Reopen'
                 WHEN ta.approval_level = 2 THEN 'L2 - Accept/Reject/Escalate/Complete'
                 WHEN ta.approval_level = 3 THEN 'L3 - Reassign/Reject Final'
                 WHEN ta.approval_level = 4 THEN 'L4 - Approve Close'
                 ELSE 'Unknown Level'
               END as approval_level_name
        FROM TicketApproval ta
        LEFT JOIN Person per ON ta.personno = per.PERSONNO
        WHERE ta.personno = @personno AND ta.approval_level = @approval_level
        ORDER BY ta.plant_code, ta.area_code, ta.line_code, ta.machine_code
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No approvals found for this person and level'
      });
    }

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get ticket approvals by person and level error:', error);
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
        SELECT ta.id, ta.personno, ta.plant_code, ta.area_code, ta.line_code, ta.machine_code, 
               ta.approval_level, ta.is_active, ta.created_at, ta.updated_at,
               per.PERSON_NAME as person_name, per.FIRSTNAME, per.LASTNAME, per.PERSONCODE,
               CASE 
                 WHEN ta.machine_code IS NOT NULL THEN 'Machine: ' + ta.machine_code
                 WHEN ta.line_code IS NOT NULL THEN 'Line: ' + ta.line_code
                 WHEN ta.area_code IS NOT NULL THEN 'Area: ' + ta.area_code
                 ELSE 'Plant: ' + ta.plant_code
               END as location_scope,
               CASE 
                 WHEN ta.approval_level = 1 THEN 'L1 - Create/Review/Reopen'
                 WHEN ta.approval_level = 2 THEN 'L2 - Accept/Reject/Escalate/Complete'
                 WHEN ta.approval_level = 3 THEN 'L3 - Reassign/Reject Final'
                 WHEN ta.approval_level = 4 THEN 'L4 - Approve Close'
                 ELSE 'Unknown Level'
               END as approval_level_name
        FROM TicketApproval ta
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
    const { personno, plant_code, area_code, line_code, machine_code, approval_level, is_active = true } = req.body;
    const pool = await getConnection();

    // Validate required fields
    if (!personno || !plant_code || !approval_level) {
      return res.status(400).json({
        success: false,
        message: 'Person number, plant code, and approval level are required'
      });
    }

    // Validate approval level (1-4 only)
    if (![1, 2, 3, 4].includes(parseInt(approval_level))) {
      return res.status(400).json({
        success: false,
        message: 'Approval level must be 1, 2, 3, or 4'
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
    
    // Check if plant exists
    const plantCheck = await pool.request()
      .input('plant_code', sql.NVarChar, plant_code)
      .query('SELECT id FROM Plant WHERE code = @plant_code');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if person already has approval for this location and level
    const existingApproval = await pool.request()
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code)
      .input('line_code', sql.NVarChar, line_code)
      .input('machine_code', sql.NVarChar, machine_code)
      .input('approval_level', sql.Int, approval_level)
      .query(`
        SELECT id FROM TicketApproval 
        WHERE personno = @personno 
        AND plant_code = @plant_code 
        AND ISNULL(area_code, '') = ISNULL(@area_code, '')
        AND ISNULL(line_code, '') = ISNULL(@line_code, '')
        AND ISNULL(machine_code, '') = ISNULL(@machine_code, '')
        AND approval_level = @approval_level
      `);
    
    if (existingApproval.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Person already has approval for this location and level'
      });
    }

    const result = await pool.request()
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code)
      .input('line_code', sql.NVarChar, line_code)
      .input('machine_code', sql.NVarChar, machine_code)
      .input('approval_level', sql.Int, approval_level)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO TicketApproval 
        (personno, plant_code, area_code, line_code, machine_code, approval_level, is_active, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@personno, @plant_code, @area_code, @line_code, @machine_code, @approval_level, @is_active, GETDATE(), GETDATE())
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

// Create multiple ticket approvals (bulk create)
const createMultipleTicketApprovals = async (req, res) => {
  let transaction = null;
  
  try {
    console.log('=== BULK CREATE APPROVALS START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { approvals } = req.body; // Array of approval objects
    
    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      console.log('Validation failed: approvals array is empty or invalid');
      return res.status(400).json({
        success: false,
        message: 'Approvals array is required and must not be empty'
      });
    }
    
    console.log('Approvals count:', approvals.length);

    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Validate all approvals first
    const validationErrors = [];
    const personnos = [...new Set(approvals.map(a => a.personno))];
    const plantCodes = [...new Set(approvals.map(a => a.plant_code).filter(Boolean))];

    // Check if all persons exist
    if (personnos.length > 0) {
      const personnosStr = personnos.join(',');
      const personCheck = await transaction.request()
        .query(`SELECT PERSONNO FROM Person WHERE PERSONNO IN (${personnosStr})`);
      
      const existingPersonnos = personCheck.recordset.map(r => r.PERSONNO);
      const missingPersonnos = personnos.filter(p => !existingPersonnos.includes(p));
      
      if (missingPersonnos.length > 0) {
        validationErrors.push(`Persons not found: ${missingPersonnos.join(', ')}`);
      }
    }

    // Check if all plants exist
    if (plantCodes.length > 0) {
      const plantCodesStr = plantCodes.map(code => `'${code}'`).join(',');
      const plantCheck = await transaction.request()
        .query(`SELECT code FROM Plant WHERE code IN (${plantCodesStr})`);
      
      const existingPlantCodes = plantCheck.recordset.map(r => r.code);
      const missingPlantCodes = plantCodes.filter(p => !existingPlantCodes.includes(p));
      
      if (missingPlantCodes.length > 0) {
        validationErrors.push(`Plants not found: ${missingPlantCodes.join(', ')}`);
      }
    }

    // Check for existing approvals to avoid duplicates
    console.log('Checking for existing approvals...');
    console.log('Approvals to check:', JSON.stringify(approvals, null, 2));
    
    // Build individual WHERE conditions for each approval to avoid complex IN clause
    const existingApprovalsConditions = approvals.map(a => {
      const areaCode = a.area_code || '';
      const lineCode = a.line_code || '';
      const machineCode = a.machine_code || '';
      
      return `(personno = ${a.personno} AND plant_code = '${a.plant_code}' AND ISNULL(area_code, '') = '${areaCode}' AND ISNULL(line_code, '') = '${lineCode}' AND ISNULL(machine_code, '') = '${machineCode}' AND approval_level = ${a.approval_level})`;
    }).join(' OR ');
    
    const existingApprovalsQuery = `
      SELECT personno, plant_code, area_code, line_code, machine_code, approval_level
      FROM TicketApproval
      WHERE ${existingApprovalsConditions}
    `;
    
    console.log('Existing approvals query:', existingApprovalsQuery);
    
    const existingApprovals = await transaction.request()
      .query(existingApprovalsQuery);

    if (existingApprovals.recordset.length > 0) {
      const duplicates = existingApprovals.recordset.map(r => 
        `Person ${r.personno} - ${r.plant_code}${r.area_code ? '-' + r.area_code : ''}${r.line_code ? '-' + r.line_code : ''}${r.machine_code ? '-' + r.machine_code : ''} (L${r.approval_level})`
      );
      validationErrors.push(`Duplicate approvals found: ${duplicates.join(', ')}`);
    }

    if (validationErrors.length > 0) {
      if (transaction) {
        await transaction.rollback();
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Create all approvals in bulk
    const createdIds = [];
    const errors = [];

    for (const approval of approvals) {
      try {
        // Validate individual approval
        if (!approval.personno || !approval.plant_code || !approval.approval_level) {
          errors.push({ 
            approval, 
            error: 'Missing required fields: personno, plant_code, approval_level' 
          });
          continue;
        }

        if (![1, 2, 3, 4].includes(parseInt(approval.approval_level))) {
          errors.push({ 
            approval, 
            error: 'Approval level must be 1, 2, 3, or 4' 
          });
          continue;
        }

        console.log('Creating approval:', JSON.stringify(approval, null, 2));
        
        const insertQuery = `
          INSERT INTO TicketApproval 
          (personno, plant_code, area_code, line_code, machine_code, approval_level, is_active, created_at, updated_at)
          OUTPUT INSERTED.id
          VALUES (@personno, @plant_code, @area_code, @line_code, @machine_code, @approval_level, @is_active, GETDATE(), GETDATE())
        `;
        
        console.log('Insert query:', insertQuery);
        console.log('Parameters:', {
          personno: approval.personno,
          plant_code: approval.plant_code,
          area_code: approval.area_code || null,
          line_code: approval.line_code || null,
          machine_code: approval.machine_code || null,
          approval_level: approval.approval_level,
          is_active: approval.is_active !== false
        });
        
        const result = await transaction.request()
          .input('personno', sql.Int, approval.personno)
          .input('plant_code', sql.NVarChar, approval.plant_code)
          .input('area_code', sql.NVarChar, approval.area_code || null)
          .input('line_code', sql.NVarChar, approval.line_code || null)
          .input('machine_code', sql.NVarChar, approval.machine_code || null)
          .input('approval_level', sql.Int, approval.approval_level)
          .input('is_active', sql.Bit, approval.is_active !== false)
          .query(insertQuery);
        
        createdIds.push(result.recordset[0].id);
      } catch (error) {
        console.error(`Error creating approval:`, error);
        errors.push({ 
          approval, 
          error: error.message 
        });
      }
    }

    if (errors.length > 0) {
      if (transaction) {
        await transaction.rollback();
      }
      return res.status(500).json({
        success: false,
        message: 'Some approvals failed to create',
        data: {
          created: createdIds,
          errors: errors
        }
      });
    }

    if (transaction) {
      await transaction.commit();
    }

    console.log('=== BULK CREATE APPROVALS SUCCESS ===');
    console.log('Created IDs:', createdIds);
    console.log('Total created:', createdIds.length);

    res.status(201).json({
      success: true,
      data: { 
        ids: createdIds,
        count: createdIds.length
      },
      message: `Successfully created ${createdIds.length} ticket approvals`
    });

  } catch (error) {
    console.log('=== BULK CREATE APPROVALS ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error number:', error.number);
    
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('Transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create ticket approvals',
      error: error.message,
      code: error.code,
      number: error.number
    });
  }
};

// Update ticket approval
const updateTicketApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { personno, plant_code, area_code, line_code, machine_code, approval_level, is_active } = req.body;
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

    // Check if plant exists
    const plantCheck = await pool.request()
      .input('plant_code', sql.NVarChar, plant_code)
      .query('SELECT id FROM Plant WHERE code = @plant_code');
    
    if (plantCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Check if person already has approval for this location and level (excluding current record)
    const duplicateCheck = await pool.request()
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code || null)
      .input('line_code', sql.NVarChar, line_code || null)
      .input('machine_code', sql.NVarChar, machine_code || null)
      .input('approval_level', sql.Int, approval_level)
      .input('id', sql.Int, id)
      .query(`
        SELECT id FROM TicketApproval 
        WHERE personno = @personno AND plant_code = @plant_code 
        AND ISNULL(area_code, '') = ISNULL(@area_code, '')
        AND ISNULL(line_code, '') = ISNULL(@line_code, '')
        AND ISNULL(machine_code, '') = ISNULL(@machine_code, '')
        AND approval_level = @approval_level AND id != @id
      `);
    
    if (duplicateCheck.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Person already has approval for this location and level'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('personno', sql.Int, personno)
      .input('plant_code', sql.NVarChar, plant_code)
      .input('area_code', sql.NVarChar, area_code || null)
      .input('line_code', sql.NVarChar, line_code || null)
      .input('machine_code', sql.NVarChar, machine_code || null)
      .input('approval_level', sql.Int, approval_level)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE TicketApproval 
        SET personno = @personno, plant_code = @plant_code, area_code = @area_code, 
            line_code = @line_code, machine_code = @machine_code, approval_level = @approval_level, 
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

// Delete all ticket approvals for a person and level
const deleteTicketApprovalsByPersonAndLevel = async (req, res) => {
  try {
    const { personno, approval_level } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('personno', sql.Int, personno)
      .input('approval_level', sql.Int, approval_level)
      .query('DELETE FROM TicketApproval WHERE personno = @personno AND approval_level = @approval_level');

    res.json({
      success: true,
      message: `Successfully deleted ${result.rowsAffected[0]} ticket approval(s)`,
      count: result.rowsAffected[0]
    });

  } catch (error) {
    console.error('Delete ticket approvals by person and level error:', error);
    
    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ticket approvals because they have associated records. Please check for any related data first.'
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

    // Query hierarchy from PUExtension table
    const [plantsResult, areasResult, linesResult] = await Promise.all([
      // Get distinct plants (digit_count = 1)
      pool.request().query(`
        SELECT DISTINCT 
          puno as id,
          puname as name,
          plant as code
        FROM PUExtension 
        WHERE digit_count = 1 AND plant IS NOT NULL
        ORDER BY plant
      `),
      // Get distinct areas (digit_count >= 2) - ensure uniqueness by plant+area combination
      pool.request().query(`
        WITH UniqueAreas AS (
          SELECT DISTINCT plant, area, COUNT(*) as puno_count
          FROM PUExtension 
          WHERE digit_count >= 2 AND area IS NOT NULL
          GROUP BY plant, area
        )
        SELECT 
          ROW_NUMBER() OVER (ORDER BY u.plant, u.area) as id,
          u.area as name,
          u.area as code,
          u.plant as plant_code,
          (SELECT TOP 1 puno FROM PUExtension p WHERE p.plant = u.plant AND p.digit_count = 1) as plant_id,
          u.plant as plant_name
        FROM UniqueAreas u
        ORDER BY u.plant, u.area
      `),
      // Get distinct lines (digit_count >= 3) - ensure uniqueness by plant+area+line combination  
      pool.request().query(`
        WITH UniqueAreas AS (
          SELECT DISTINCT plant, area, ROW_NUMBER() OVER (ORDER BY plant, area) as area_id
          FROM PUExtension 
          WHERE digit_count >= 2 AND area IS NOT NULL
          GROUP BY plant, area
        ),
        UniqueLines AS (
          SELECT DISTINCT plant, area, line, COUNT(*) as puno_count
          FROM PUExtension 
          WHERE digit_count >= 3 AND line IS NOT NULL
          GROUP BY plant, area, line
        )
        SELECT 
          ROW_NUMBER() OVER (ORDER BY ul.plant, ul.area, ul.line) as id,
          ul.line as name,
          ul.line as code,
          ul.plant as plant_code,
          ul.area as area_code,
          (SELECT TOP 1 puno FROM PUExtension p WHERE p.plant = ul.plant AND p.digit_count = 1) as plant_id,
          ua.area_id as area_id,
          ul.plant as plant_name,
          ul.area as area_name
        FROM UniqueLines ul
        JOIN UniqueAreas ua ON ul.plant = ua.plant AND ul.area = ua.area
        ORDER BY ul.plant, ul.area, ul.line
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
  getTicketApprovalsByPersonAndLevel,
  createTicketApproval,
  createMultipleTicketApprovals,
  updateTicketApproval,
  deleteTicketApproval,
  deleteTicketApprovalsByPersonAndLevel,
  
  // Lookup data
  getLookupData,
  // Person search
  searchPersons
};
