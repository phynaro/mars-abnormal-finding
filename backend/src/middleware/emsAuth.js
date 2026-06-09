/**
 * EMS module auth — roles in IgxEmsUserRole (Cedar6_Mars / dbConfig).
 * Access: EMS role OR levelReport >= 2
 * Admin:  levelReport >= 3 OR plant_manager EMS role
 */

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const { EMS_ROLES, EMS_ROLE_VALUES } = require('../constants/emsConstants');

const MIN_EMS_LEVEL_REPORT = 2;
const ADMIN_LEVEL_REPORT = 3;

/**
 * @param {string|number} personNo
 * @returns {Promise<string[]>}
 */
async function getEmsRoles(personNo) {
  if (personNo == null || personNo === '') return [];

  const pool = await sql.connect(dbConfig);
  const result = await pool.request()
    .input('personNo', sql.NVarChar(50), String(personNo))
    .query(`
      SELECT ems_role
      FROM dbo.IgxEmsUserRole
      WHERE person_no = @personNo
      ORDER BY ems_role
    `);
  return (result.recordset || [])
    .map((row) => String(row.ems_role || '').trim())
    .filter((role) => EMS_ROLE_VALUES.includes(role));
}

/**
 * Load EMS roles onto req.user. Call after authenticateToken.
 */
const attachEmsRoles = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  try {
    const emsRoles = await getEmsRoles(req.user.id);
    req.user.emsRoles = emsRoles;
    req.user.canEmsAdmin =
      Number(req.user.levelReport) >= ADMIN_LEVEL_REPORT
      || emsRoles.includes(EMS_ROLES.PLANT_MANAGER);
    next();
  } catch (error) {
    console.error('attachEmsRoles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load EMS roles',
    });
  }
};

const requireEmsAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const level = Number(req.user.levelReport) || 0;
  const roles = req.user.emsRoles || [];

  if (level >= MIN_EMS_LEVEL_REPORT || roles.length > 0) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'EMS access requires engineer level (L2+) or an EMS role',
  });
};

const requireEmsAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.canEmsAdmin) {
    return next();
  }

  const level = Number(req.user.levelReport) || 0;
  const roles = req.user.emsRoles || [];
  const isAdmin =
    level >= ADMIN_LEVEL_REPORT
    || roles.includes(EMS_ROLES.PLANT_MANAGER);

  if (isAdmin) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'EMS admin access required (L3 or Plant Manager role)',
  });
};

/** Requires at least one EMS role (calibrator, am, plant_manager). */
const requireEmsEditor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const roles = req.user.emsRoles || [];
  if (roles.length > 0) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'EMS editor access requires an EMS role (calibrator, AM, or plant manager)',
  });
};

module.exports = {
  getEmsRoles,
  attachEmsRoles,
  requireEmsAccess,
  requireEmsAdmin,
  requireEmsEditor,
  MIN_EMS_LEVEL_REPORT,
  ADMIN_LEVEL_REPORT,
};
