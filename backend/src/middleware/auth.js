const crypto = require('crypto');
const { validateToken } = require('../controllers/authController');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Service API tokens (for 3rd-party integrations) carry this prefix so we can
// distinguish them from user JWTs on the same Authorization: Bearer header.
const API_TOKEN_PREFIX = 'eden_sk_';

// Only these HTTP methods are allowed for read-only service tokens.
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hashApiToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

// Validate a service API token and attach a synthetic, read-only user to req.
async function authenticateApiToken(req, res, next, token) {
  // Read-only scope: block any state-changing method regardless of route.
  if (!READ_ONLY_METHODS.has(req.method)) {
    return res.status(403).json({
      success: false,
      message: 'This API token is read-only',
      code: 'API_TOKEN_READ_ONLY'
    });
  }

  try {
    const pool = await getConnection();
    const tokenHash = hashApiToken(token);
    const result = await pool.request()
      .input('tokenHash', sql.VarChar, tokenHash)
      .query(`
        SELECT id, name, scope, is_active, expires_at, revoked_at
        FROM IgxApiTokens
        WHERE token_hash = @tokenHash
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API token',
        code: 'API_TOKEN_INVALID'
      });
    }

    const apiToken = result.recordset[0];

    if (!apiToken.is_active || apiToken.revoked_at) {
      return res.status(401).json({
        success: false,
        message: 'API token has been revoked',
        code: 'API_TOKEN_REVOKED'
      });
    }

    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'API token has expired',
        code: 'API_TOKEN_EXPIRED'
      });
    }

    // Fire-and-forget last-used update; never block the request on it.
    pool.request()
      .input('id', sql.Int, apiToken.id)
      .query('UPDATE IgxApiTokens SET last_used_at = GETDATE() WHERE id = @id')
      .catch((e) => console.error('Failed to update API token last_used_at:', e.message));

    // Synthetic identity: read-only, high level so requirePermissionLevel passes,
    // and an isApiToken flag that read-permission guards honor.
    req.apiToken = { id: apiToken.id, name: apiToken.name, scope: apiToken.scope };
    req.user = {
      isApiToken: true,
      readonly: true,
      userId: `apitoken:${apiToken.id}`,
      username: apiToken.name,
      groupCode: 'API',
      levelReport: 3,
      permissionLevel: 3
    };

    return next();
  } catch (dbError) {
    console.error('API token validation error:', dbError);
    return res.status(500).json({
      success: false,
      message: 'Error during API token authentication'
    });
  }
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token is required' 
      });
    }

    // Service API tokens (3rd-party integrations) take a separate, read-only path.
    if (token.startsWith(API_TOKEN_PREFIX)) {
      return authenticateApiToken(req, res, next, token);
    }

    // Validate token and get user info
    const { decoded: decodedToken, error: tokenError } = await validateToken(token);
    
    if (!decodedToken) {
      // Check if token is malformed - return 401 to trigger login redirect
      if (tokenError && tokenError.type === 'MALFORMED') {
        return res.status(401).json({ 
          success: false, 
          message: tokenError.message || 'JWT malformed',
          code: 'JWT_MALFORMED',
          requireLogin: true
        });
      }
      
      // For expired or invalid tokens, also return 401
      if (tokenError && (tokenError.type === 'EXPIRED' || tokenError.type === 'INVALID')) {
        return res.status(401).json({ 
          success: false, 
          message: tokenError.message || 'Invalid or expired token',
          code: tokenError.type,
          requireLogin: true
        });
      }
      
      // For other errors, return 403
      return res.status(403).json({ 
        success: false, 
        message: tokenError?.message || 'Invalid or expired token' 
      });
    }

    // Fetch full user data from database
    try {
      const pool = await getConnection();
      const userResult = await pool.request()
        .input('userID', sql.VarChar, decodedToken.userId)
        .query(`
          SELECT
            u.PersonNo,
            u.UserID,
            u.GroupNo,
            u.LevelReport,
            u.ExpireDate,
            u.NeverExpireFlag,
            ue.EmailVerified,
            ue.LastLogin,
            ue.CreatedAt,
            ue.LineID,
            ue.AvatarUrl,
            ue.IsActive,
            g.UserGCode,
            g.UserGName,
            p.PERSONCODE,
            p.FIRSTNAME,
            p.LASTNAME,
            p.EMAIL,
            p.DEPTNO,
            d.DEPTCODE,
            d.DEPTNAME
          FROM _secUsers u
          LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
          LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
          LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
          LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
          WHERE u.UserID = @userID AND (ue.IsActive = 1 OR ue.IsActive IS NULL)
        `);

      if (userResult.recordset.length === 0 || (userResult.recordset[0].IsActive !== null && !userResult.recordset[0].IsActive)) {
        return res.status(403).json({ 
          success: false, 
          message: 'User not found or inactive' 
        });
      }

      const user = userResult.recordset[0];
      
      // Add full user info to request object
      req.user = {
        id: user.PersonNo,
        userId: user.UserID,
        username: user.UserID,
        personCode: user.PERSONCODE,
        firstName: user.FIRSTNAME,
        lastName: user.LASTNAME,
        email: user.EMAIL,
        department: user.DEPTNO,
        departmentCode: user.DEPTCODE,
        departmentName: user.DEPTNAME,
        groupNo: user.GroupNo,
        groupCode: user.UserGCode,
        groupName: user.UserGName,
        levelReport: user.LevelReport,
        permissionLevel: user.LevelReport,
        lineId: user.LineID,
        avatarUrl: user.AvatarUrl,
        lastLogin: user.LastLogin,
        createdAt: user.CreatedAt
      };
      
      next();
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error during authentication' 
      });
    }

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Token validation failed' 
    });
  }
};

// Group-based access control middleware
const requireGroup = (allowedGroups) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Read-only service tokens are allowed to perform read requests.
    if (req.user.isApiToken && READ_ONLY_METHODS.has(req.method)) {
      return next();
    }

    // Check if user's group is in the allowed groups
    if (!allowedGroups.includes(req.user.groupCode)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Permission level middleware (based on LevelReport)
const requirePermissionLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if user's permission level meets the minimum requirement
    if (req.user.levelReport < minLevel) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permission level' 
      });
    }

    next();
  };
};

// Specific group middleware functions
const requireAdmin = requireGroup(['ADMIN']);
const requireMaintenancePlanner = requireGroup(['MP']);
const requireMaintenanceManager = requireGroup(['MM']);
const requireMaintenanceTechnician = requireGroup(['MT']);
const requireMaintenanceEngineer = requireGroup(['ME']);
const requirePlantMaintenanceAdmin = requireGroup(['MA']);
const requireOperation = requireGroup(['OP']);
const requireOperationSupervisor = requireGroup(['OS']);
const requireStore = requireGroup(['ST']);
const requireSupplier = requireGroup(['SP']);

// Form-based permission middleware
const requireFormPermission = (formId, action = 'view') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Read-only service tokens may view (read) any form.
    if (req.user.isApiToken && READ_ONLY_METHODS.has(req.method)) {
      if (action.toLowerCase() === 'view') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'This API token is read-only',
        code: 'API_TOKEN_READ_ONLY'
      });
    }

    try {
      const { hasPermission } = require('../controllers/authController');
      const hasAccess = await hasPermission(req.user.userId, req.user.groupNo, formId, action);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: `Insufficient permissions for ${formId}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Form permission check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Permission check failed' 
      });
    }
  };
};

// Delete ticket: allow if user has TKT delete permission OR is the ticket creator
const requireDeleteTicketPermission = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  try {
    const { hasPermission } = require('../controllers/authController');
    const hasDeletePermission = await hasPermission(req.user.userId, req.user.groupNo, 'TKT', 'delete');
    
    if (hasDeletePermission) {
      return next();
    }

    // Check if user is the ticket creator
    const ticketId = req.params.id;
    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'Ticket ID required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, ticketId)
      .query('SELECT created_by FROM IgxTickets WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = result.recordset[0];
    if (Number(ticket.created_by) === Number(req.user.id)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Insufficient permissions to delete this ticket' 
    });
  } catch (error) {
    console.error('Delete ticket permission check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Permission check failed' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireGroup,
  requirePermissionLevel,
  requireAdmin,
  requireMaintenancePlanner,
  requireMaintenanceManager,
  requireMaintenanceTechnician,
  requireMaintenanceEngineer,
  requirePlantMaintenanceAdmin,
  requireOperation,
  requireOperationSupervisor,
  requireStore,
  requireSupplier,
  requireFormPermission,
  requirePermissionLevel,
  requireDeleteTicketPermission
}; 
