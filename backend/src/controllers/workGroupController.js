const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseOptionalBit = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return defaultValue;
};

const trimOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * GET /api/work-groups — active groups for dropdowns
 */
const getWorkGroups = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT id, name_en, name_th, description_en, description_th, sort_order, is_active
      FROM dbo.IgxWorkGroup
      WHERE is_active = 1
      ORDER BY sort_order ASC, name_en ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error('Error fetching work groups:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work groups',
      error: error.message,
    });
  }
};

/**
 * GET /api/work-groups/all — all groups including inactive (admin)
 */
const getAllWorkGroups = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT id, name_en, name_th, description_en, description_th, sort_order, is_active, created_at, updated_at
      FROM dbo.IgxWorkGroup
      ORDER BY sort_order ASC, name_en ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error('Error fetching all work groups:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work groups',
      error: error.message,
    });
  }
};

/**
 * POST /api/work-groups — create work group (admin)
 */
const createWorkGroup = async (req, res) => {
  try {
    const name_en = trimOrNull(req.body.name_en);
    const name_th = trimOrNull(req.body.name_th);
    const description_en = trimOrNull(req.body.description_en);
    const description_th = trimOrNull(req.body.description_th);
    const sort_order = parseOptionalInt(req.body.sort_order) ?? 0;
    const is_active = parseOptionalBit(req.body.is_active, true);

    if (!name_en || !name_th) {
      return res.status(400).json({
        success: false,
        message: 'English and Thai names are required',
      });
    }

    const pool = await sql.connect(dbConfig);

    const duplicateCheck = await pool.request()
      .input('name_en', sql.NVarChar(100), name_en)
      .query('SELECT id FROM dbo.IgxWorkGroup WHERE name_en = @name_en');

    if (duplicateCheck.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A work group with this English name already exists',
      });
    }

    const result = await pool.request()
      .input('name_en', sql.NVarChar(100), name_en)
      .input('name_th', sql.NVarChar(100), name_th)
      .input('description_en', sql.NVarChar(500), description_en)
      .input('description_th', sql.NVarChar(500), description_th)
      .input('sort_order', sql.Int, sort_order)
      .input('is_active', sql.Bit, is_active)
      .query(`
        INSERT INTO dbo.IgxWorkGroup (name_en, name_th, description_en, description_th, sort_order, is_active)
        OUTPUT INSERTED.*
        VALUES (@name_en, @name_th, @description_en, @description_th, @sort_order, @is_active)
      `);

    return res.status(201).json({
      success: true,
      data: result.recordset[0],
      message: 'Work group created successfully',
    });
  } catch (error) {
    console.error('Error creating work group:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create work group',
      error: error.message,
    });
  }
};

/**
 * PUT /api/work-groups/:id — update work group (admin)
 */
const updateWorkGroup = async (req, res) => {
  try {
    const id = parseOptionalInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid work group ID',
      });
    }

    const name_en = trimOrNull(req.body.name_en);
    const name_th = trimOrNull(req.body.name_th);
    const description_en = req.body.description_en !== undefined ? trimOrNull(req.body.description_en) : undefined;
    const description_th = req.body.description_th !== undefined ? trimOrNull(req.body.description_th) : undefined;
    const sort_order = req.body.sort_order !== undefined ? parseOptionalInt(req.body.sort_order) : undefined;
    const is_active = req.body.is_active !== undefined ? parseOptionalBit(req.body.is_active) : undefined;

    if (name_en !== null && name_en === '') {
      return res.status(400).json({
        success: false,
        message: 'English name cannot be empty',
      });
    }

    if (name_th !== null && name_th === '') {
      return res.status(400).json({
        success: false,
        message: 'Thai name cannot be empty',
      });
    }

    const pool = await sql.connect(dbConfig);

    const existing = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM dbo.IgxWorkGroup WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work group not found',
      });
    }

    if (name_en) {
      const duplicateCheck = await pool.request()
        .input('name_en', sql.NVarChar(100), name_en)
        .input('id', sql.Int, id)
        .query('SELECT id FROM dbo.IgxWorkGroup WHERE name_en = @name_en AND id != @id');

      if (duplicateCheck.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A work group with this English name already exists',
        });
      }
    }

    const updates = [];
    const request = pool.request().input('id', sql.Int, id);

    if (name_en) {
      updates.push('name_en = @name_en');
      request.input('name_en', sql.NVarChar(100), name_en);
    }
    if (name_th) {
      updates.push('name_th = @name_th');
      request.input('name_th', sql.NVarChar(100), name_th);
    }
    if (description_en !== undefined) {
      updates.push('description_en = @description_en');
      request.input('description_en', sql.NVarChar(500), description_en);
    }
    if (description_th !== undefined) {
      updates.push('description_th = @description_th');
      request.input('description_th', sql.NVarChar(500), description_th);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = @sort_order');
      request.input('sort_order', sql.Int, sort_order ?? 0);
    }
    if (is_active !== undefined) {
      updates.push('is_active = @is_active');
      request.input('is_active', sql.Bit, is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = GETDATE()');

    const result = await request.query(`
      UPDATE dbo.IgxWorkGroup
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    return res.status(200).json({
      success: true,
      data: result.recordset[0],
      message: 'Work group updated successfully',
    });
  } catch (error) {
    console.error('Error updating work group:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update work group',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/work-groups/:id — delete if no tickets reference it (admin)
 */
const deleteWorkGroup = async (req, res) => {
  try {
    const id = parseOptionalInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid work group ID',
      });
    }

    const pool = await sql.connect(dbConfig);

    const usageCheck = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) AS ticket_count FROM dbo.IgxTickets WHERE work_group_id = @id');

    const ticketCount = usageCheck.recordset[0]?.ticket_count ?? 0;
    if (ticketCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete work group: ${ticketCount} ticket(s) reference it. Deactivate it instead.`,
        data: { ticket_count: ticketCount },
      });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.IgxWorkGroup WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work group not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Work group deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting work group:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete work group',
      error: error.message,
    });
  }
};

module.exports = {
  getWorkGroups,
  getAllWorkGroups,
  createWorkGroup,
  updateWorkGroup,
  deleteWorkGroup,
};
