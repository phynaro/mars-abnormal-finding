/**
 * EMS role assignment and manager area configuration.
 * Tables: IgxEmsUserRole, IgxEmsManagerArea (Cedar6_Mars / dbConfig).
 */

const sql = require('mssql');
const dbConfig = require('../../config/dbConfig');
const { EMS_ROLE_VALUES } = require('../../constants/emsConstants');

function formatPersonName(row) {
  const name = `${row.FIRSTNAME || ''} ${row.LASTNAME || ''}`.trim();
  return name || row.PERSONCODE || String(row.person_no);
}

/**
 * GET /api/ems/roles
 */
exports.listRoleAssignments = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT
        r.id,
        r.person_no,
        r.ems_role,
        r.created_at,
        p.FIRSTNAME,
        p.LASTNAME,
        p.PERSONCODE
      FROM dbo.IgxEmsUserRole r
      LEFT JOIN dbo.Person p ON CAST(p.PERSONNO AS NVARCHAR(50)) = r.person_no
      ORDER BY p.FIRSTNAME, p.LASTNAME, r.ems_role
    `);

    const items = (result.recordset || []).map((row) => ({
      id: row.id,
      personNo: row.person_no,
      personName: formatPersonName(row),
      emsRole: row.ems_role,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: { items }, message: 'EMS role assignments' });
  } catch (error) {
    console.error('EMS listRoleAssignments error:', error);
    res.status(500).json({ success: false, message: 'Failed to list EMS roles', error: error.message });
  }
};

/**
 * POST /api/ems/roles  { personNo, emsRole }
 */
exports.assignRole = async (req, res) => {
  try {
    const { personNo, emsRole } = req.body || {};
    const role = String(emsRole || '').trim().toLowerCase();
    const person = String(personNo ?? '').trim();

    if (!person || !role) {
      return res.status(400).json({ success: false, message: 'personNo and emsRole are required' });
    }
    if (!EMS_ROLE_VALUES.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid emsRole. Allowed: ${EMS_ROLE_VALUES.join(', ')}` });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('personNo', sql.NVarChar(50), person)
      .input('emsRole', sql.NVarChar(30), role)
      .query(`
        INSERT INTO dbo.IgxEmsUserRole (person_no, ems_role)
        OUTPUT INSERTED.id, INSERTED.person_no, INSERTED.ems_role, INSERTED.created_at
        VALUES (@personNo, @emsRole)
      `);

    const row = result.recordset[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        personNo: row.person_no,
        emsRole: row.ems_role,
        createdAt: row.created_at,
      },
      message: 'EMS role assigned',
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ success: false, message: 'Role already assigned for this person' });
    }
    console.error('EMS assignRole error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign EMS role', error: error.message });
  }
};

/**
 * DELETE /api/ems/roles/:id
 */
exports.removeRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid role id' });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.IgxEmsUserRole WHERE id = @id; SELECT @@ROWCOUNT AS affected');

    if (!result.recordset[0]?.affected) {
      return res.status(404).json({ success: false, message: 'Role assignment not found' });
    }

    res.json({ success: true, message: 'EMS role removed' });
  } catch (error) {
    console.error('EMS removeRole error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove EMS role', error: error.message });
  }
};

/**
 * GET /api/ems/manager-areas
 */
exports.listManagerAreas = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT
        m.id,
        m.person_no,
        m.plant,
        m.area,
        m.created_at,
        p.FIRSTNAME,
        p.LASTNAME,
        p.PERSONCODE
      FROM dbo.IgxEmsManagerArea m
      LEFT JOIN dbo.Person p ON CAST(p.PERSONNO AS NVARCHAR(50)) = m.person_no
      ORDER BY m.plant, m.area, p.FIRSTNAME
    `);

    const items = (result.recordset || []).map((row) => ({
      id: row.id,
      personNo: row.person_no,
      personName: formatPersonName(row),
      plant: row.plant,
      area: row.area,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: { items }, message: 'EMS manager area mappings' });
  } catch (error) {
    console.error('EMS listManagerAreas error:', error);
    res.status(500).json({ success: false, message: 'Failed to list manager areas', error: error.message });
  }
};

/**
 * POST /api/ems/manager-areas  { personNo, plant, area? }
 */
exports.createManagerArea = async (req, res) => {
  try {
    const { personNo, plant, area } = req.body || {};
    const person = String(personNo ?? '').trim();
    const plantCode = plant != null ? String(plant).trim().toUpperCase() : null;
    const areaVal = area != null && String(area).trim() !== '' ? String(area).trim() : null;

    if (!person) {
      return res.status(400).json({ success: false, message: 'personNo is required' });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('personNo', sql.NVarChar(50), person)
      .input('plant', sql.NVarChar(20), plantCode)
      .input('area', sql.NVarChar(100), areaVal)
      .query(`
        INSERT INTO dbo.IgxEmsManagerArea (person_no, plant, area)
        OUTPUT INSERTED.id, INSERTED.person_no, INSERTED.plant, INSERTED.area, INSERTED.created_at
        VALUES (@personNo, @plant, @area)
      `);

    const row = result.recordset[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        personNo: row.person_no,
        plant: row.plant,
        area: row.area,
        createdAt: row.created_at,
      },
      message: 'Manager area mapping created',
    });
  } catch (error) {
    console.error('EMS createManagerArea error:', error);
    res.status(500).json({ success: false, message: 'Failed to create manager area', error: error.message });
  }
};

/**
 * DELETE /api/ems/manager-areas/:id
 */
exports.deleteManagerArea = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid mapping id' });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.IgxEmsManagerArea WHERE id = @id; SELECT @@ROWCOUNT AS affected');

    if (!result.recordset[0]?.affected) {
      return res.status(404).json({ success: false, message: 'Manager area mapping not found' });
    }

    res.json({ success: true, message: 'Manager area mapping removed' });
  } catch (error) {
    console.error('EMS deleteManagerArea error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete manager area', error: error.message });
  }
};
