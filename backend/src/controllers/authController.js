const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const dbConfig = require('../config/dbConfig');
const emailService = require('../services/emailService');

// JWT secret key (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

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

// Helper function to hash password using MD5
function hashPasswordMD5(password) {
  return CryptoJS.MD5(password).toString();
}

// Helper function to get user permissions
async function getUserPermissions(userId, groupNo) {
  const pool = await getConnection();
  
  // Get group privileges
  const groupPrivileges = await pool.request()
    .input('groupNo', sql.Int, groupNo)
    .query(`
      SELECT FormID, HaveView, HaveSave, HaveDelete
      FROM _secUserGroupPrivileges 
      WHERE GroupNo = @groupNo
    `);

  // Get individual user permissions
  const userPermissions = await pool.request()
    .input('userId', sql.VarChar, userId)
    .query(`
      SELECT FormID, ObjFieldName, ReadOnly_Flag, ShowData_Flag
      FROM _secUserPermissions 
      WHERE UserID = @userId
    `);

  return {
    groupPrivileges: groupPrivileges.recordset,
    userPermissions: userPermissions.recordset
  };
}

// Helper function to check if user has permission for a specific form
async function hasPermission(userId, groupNo, formId, action = 'view') {
  const permissions = await getUserPermissions(userId, groupNo);
  
  // Check group privileges first
  const groupPriv = permissions.groupPrivileges.find(p => p.FormID === formId);
  if (groupPriv) {
    switch (action.toLowerCase()) {
      case 'view':
        return groupPriv.HaveView === 'T';
      case 'save':
        return groupPriv.HaveSave === 'T';
      case 'delete':
        return groupPriv.HaveDelete === 'T';
      default:
        return false;
    }
  }
  
  return false;
}

// User Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    const pool = await getConnection();

    // Get user with group and person information
    const userResult = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT 
          u.PersonNo,
          u.UserID,
          u.GroupNo,
          u.Passwd,
          u.LevelReport,
          u.StoreRoom,
          u.DBNo,
          u.StartDate,
          u.LastDate,
          u.ExpireDate,
          u.NeverExpireFlag,
          u.EmailVerified,
          u.LastLogin,
          u.CreatedAt,
          u.UpdatedAt,
          u.LineID,
          u.AvatarUrl,
          u.IsActive,
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
        LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
        LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
        LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
        LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo
        WHERE u.UserID = @username AND (u.IsActive = 1 OR u.IsActive IS NULL)
      `);

    if (userResult.recordset.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = userResult.recordset[0];
    console.log(user);
    // Check if account is expired
    if (user.NeverExpireFlag !== 'Y' && user.ExpireDate) {
      const expireDate = new Date(
        user.ExpireDate.substring(0, 4) + '-' + 
        user.ExpireDate.substring(4, 6) + '-' + 
        user.ExpireDate.substring(6, 8)
      );
      if (expireDate < new Date()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Account has expired' 
        });
      }
    }

    // Verify password using MD5
    const hashedPassword = hashPasswordMD5(password);
    if (hashedPassword !== user.Passwd) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if email is verified (if email verification is required)
    if (user.EmailVerified === 'N') {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email address before logging in.',
        requiresEmailVerification: true
      });
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.UserID, user.GroupNo);

    // Generate JWT token (without full permissions to keep token size manageable)
    const token = jwt.sign(
      { 
        userId: user.UserID, 
        personNo: user.PersonNo,
        username: user.UserID, 
        groupNo: user.GroupNo,
        groupCode: user.UserGCode,
        groupName: user.UserGName
        // Removed permissions from JWT to reduce token size
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last login
    await pool.request()
      .input('userID', sql.VarChar, user.UserID)
      .query('UPDATE _secUsers SET LastLogin = GETDATE() WHERE UserID = @userID');

    // Remove sensitive data
    delete user.Passwd;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
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
        storeRoom: user.StoreRoom,
        dbNo: user.DBNo,
        lineId: user.LineID,
        avatarUrl: user.AvatarUrl,
        lastLogin: user.LastLogin,
        createdAt: user.CreatedAt
        // Permissions removed to reduce response size
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Check if it's a database connection error
    if (error.message === 'Database connection failed' || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ConnectionError') ||
        error.message.includes('Connection is closed')) {
      res.status(503).json({ 
        success: false, 
        message: 'Service temporarily unavailable. Please try again in a few moments.',
        errorType: 'database_connection'
      });
    } else if (error.message.includes('timeout')) {
      res.status(504).json({ 
        success: false, 
        message: 'Request timeout. Please check your connection and try again.',
        errorType: 'timeout'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Unable to process login request. Please try again later.',
        errorType: 'server_error'
      });
    }
  }
};

// User Logout
const logout = async (req, res) => {
  try {
    // For this implementation, we'll just return success
    // The JWT token will be invalidated on the client side
    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Password validation configuration
const PASSWORD_VALIDATION_ENABLED = false; // Set to true to enable password criteria validation
const MIN_PASSWORD_LENGTH = 6;

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId; // From JWT middleware

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    // Password validation (can be enabled/disabled)
    if (PASSWORD_VALIDATION_ENABLED) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ 
          success: false, 
          message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long` 
        });
      }
      // Add more password criteria here if needed
      // Example: check for uppercase, lowercase, numbers, special characters, etc.
    }

    const pool = await getConnection();

    // Get current user
    const userResult = await pool.request()
      .input('userID', sql.VarChar, userId)
      .query('SELECT Passwd FROM _secUsers WHERE UserID = @userID AND (IsActive = 1 OR IsActive IS NULL)');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.recordset[0];

    // Verify current password using MD5
    const currentHashedPassword = hashPasswordMD5(currentPassword);
    if (currentHashedPassword !== user.Passwd) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password using MD5
    const newHashedPassword = hashPasswordMD5(newPassword);

    // Update password
    await pool.request()
      .input('userID', sql.VarChar, userId)
      .input('newPassword', sql.NVarChar, newHashedPassword)
      .query('UPDATE _secUsers SET Passwd = @newPassword, UpdatedAt = GETDATE() WHERE UserID = @userID');

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get Current User Profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const pool = await getConnection();

    const userResult = await pool.request()
      .input('userID', sql.VarChar, userId)
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
          u.EmailVerified,
          u.LastLogin,
          u.CreatedAt,
          u.UpdatedAt,
          u.LineID,
          u.AvatarUrl,
          u.IsActive,
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
        LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
        LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
        LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
        LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo
        WHERE u.UserID = @userID AND (u.IsActive = 1 OR u.IsActive IS NULL)
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.recordset[0];

    // Get user permissions (fetch separately when needed)
    // const permissions = await getUserPermissions(user.UserID, user.GroupNo);

    res.json({
      success: true,
      user: {
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
        storeRoom: user.StoreRoom,
        dbNo: user.DBNo,
        lineId: user.LineID,
        avatarUrl: user.AvatarUrl,
        lastLogin: user.LastLogin,
        createdAt: user.CreatedAt
        // Permissions removed to reduce response size
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Validate Token (for middleware)
const validateToken = async (token) => {
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const pool = await getConnection();
    const userResult = await pool.request()
      .input('userID', sql.VarChar, decoded.userId)
      .query('SELECT UserID, IsActive FROM _secUsers WHERE UserID = @userID AND (IsActive = 1 OR IsActive IS NULL)');

    if (userResult.recordset.length === 0 || (userResult.recordset[0].IsActive !== null && !userResult.recordset[0].IsActive)) {
      return null;
    }

    return decoded;

  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
};

// Check Permission Middleware Helper
const checkPermission = (formId, action = 'view') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const groupNo = req.user.groupNo;
      
      const hasAccess = await hasPermission(userId, groupNo, formId, action);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: `Insufficient permissions for ${formId}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Permission check failed' 
      });
    }
  };
};

// Get User Permissions
const getUserPermissionsAPI = async (req, res) => {
  try {
    const userId = req.user.userId;
    const groupNo = req.user.groupNo;
    
    const permissions = await getUserPermissions(userId, groupNo);
    
    res.json({
      success: true,
      permissions: permissions
    });

  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Check Specific Permission
const checkSpecificPermission = async (req, res) => {
  try {
    const { formId, action = 'view' } = req.body;
    const userId = req.user.userId;
    const groupNo = req.user.groupNo;
    
    if (!formId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Form ID is required' 
      });
    }
    
    const hasAccess = await hasPermission(userId, groupNo, formId, action);
    
    res.json({
      success: true,
      hasPermission: hasAccess,
      formId: formId,
      action: action
    });

  } catch (error) {
    console.error('Check specific permission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  login,
  logout,
  changePassword,
  getProfile,
  validateToken,
  checkPermission,
  getUserPermissionsAPI,
  checkSpecificPermission,
  hasPermission,
  getUserPermissions
}; 
