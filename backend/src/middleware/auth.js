const { validateToken } = require('../controllers/authController');
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
            u.StoreRoom,
            u.DBNo,
            u.StartDate,
            u.LastDate,
            u.ExpireDate,
            u.NeverExpireFlag,
            ue.EmailVerified,
            ue.EmailVerificationToken,
            ue.EmailVerificationExpires,
            ue.LastLogin,
            ue.CreatedAt,
            ue.UpdatedAt,
            ue.LineID,
            ue.AvatarUrl,
            ue.IsActive,
            g.UserGCode,
            g.UserGName,
            p.PERSONCODE,
            p.FIRSTNAME,
            p.LASTNAME,
            p.EMAIL,
            p.PHONE,
            p.TITLE,
            p.DEPTNO,
            p.CRAFTNO,
            p.CREWNO,
            p.PERSON_NAME,
            p.SiteNo,
            p.PINCODE,
            d.DEPTCODE,
            d.DEPTNAME,
            s.SiteCode,
            s.SiteName
          FROM _secUsers u
          LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
          LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
          LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
          LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
          LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo
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
        fullName: user.PERSON_NAME,
        email: user.EMAIL,
        phone: user.PHONE,
        title: user.TITLE,
        department: user.DEPTNO,
        departmentCode: user.DEPTCODE,
        departmentName: user.DEPTNAME,
        craft: user.CRAFTNO,
        crew: user.CREWNO,
        siteNo: user.SiteNo,
        siteCode: user.SiteCode,
        siteName: user.SiteName,
        groupNo: user.GroupNo,
        groupCode: user.UserGCode,
        groupName: user.UserGName,
        levelReport: user.LevelReport,
        permissionLevel: user.LevelReport,
        storeRoom: user.StoreRoom,
        dbNo: user.DBNo,
        lineId: user.LineID,
        avatarUrl: user.AvatarUrl,
        lastLogin: user.LastLogin,
        createdAt: user.CreatedAt
        // Permissions will be fetched separately when needed
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
