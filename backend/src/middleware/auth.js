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
    const decodedToken = await validateToken(token);
    
    if (!decodedToken) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    // Fetch full user data from database
    try {
      const pool = await getConnection();
      const userResult = await pool.request()
        .input('userID', sql.Int, decodedToken.userId)
        .query(`
          SELECT u.*, r.RoleName, r.PermissionLevel
          FROM Users u
          JOIN Roles r ON u.RoleID = r.RoleID
          WHERE u.UserID = @userID AND u.IsActive = 1
        `);

      if (userResult.recordset.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'User not found or inactive' 
        });
      }

      const user = userResult.recordset[0];
      
      // Add full user info to request object
      req.user = {
        id: user.UserID,
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        firstName: user.FirstName,
        lastName: user.LastName,
        employeeID: user.EmployeeID,
        department: user.Department,
        shift: user.Shift,
        role: user.RoleName,
        permissionLevel: user.PermissionLevel,
        lineId: user.LineID,
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

// Role-based access control middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Permission level middleware
const requirePermissionLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if user's permission level meets the minimum requirement
    if (req.user.permissionLevel < minLevel) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permission level' 
      });
    }

    next();
  };
};

// Specific role middleware functions
const requireL1Operator = requireRole(['L1_Operator', 'L2_Engineer', 'L3_Manager']);
const requireL2Engineer = requireRole(['L2_Engineer', 'L3_Manager']);
const requireL3Manager = requireRole(['L3_Manager']);

module.exports = {
  authenticateToken,
  requireRole,
  requirePermissionLevel,
  requireL1Operator,
  requireL2Engineer,
  requireL3Manager
}; 
