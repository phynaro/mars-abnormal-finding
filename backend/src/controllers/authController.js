const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const crypto = require('crypto');
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

// User Registration
const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, employeeID, department, shift } = req.body;

    // Validation
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const pool = await getConnection();

    // Check if username or email already exists
    const existingUser = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .query('SELECT UserID FROM Users WHERE Username = @username OR Email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours from now

    // Default role is L1_Operator (RoleID = 1)
    const defaultRoleID = 1;

    // Insert new user with email verification fields
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('employeeID', sql.NVarChar, employeeID || null)
      .input('department', sql.NVarChar, department || null)
      .input('shift', sql.NVarChar, shift || null)
      .input('roleID', sql.Int, defaultRoleID)
      .input('verificationToken', sql.NVarChar, verificationToken)
      .input('verificationExpires', sql.DateTime2, verificationExpires)
      .query(`
        INSERT INTO Users (Username, Email, PasswordHash, FirstName, LastName, EmployeeID, Department, Shift, RoleID, EmailVerificationToken, EmailVerificationExpires)
        OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName, INSERTED.RoleID
        VALUES (@username, @email, @passwordHash, @firstName, @lastName, @employeeID, @department, @shift, @roleID, @verificationToken, @verificationExpires)
      `);

    const newUser = result.recordset[0];

    // Get role information
    const roleResult = await pool.request()
      .input('roleID', sql.Int, defaultRoleID)
      .query('SELECT RoleName, PermissionLevel FROM Roles WHERE RoleID = @roleID');

    const role = roleResult.recordset[0];

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, firstName, verificationToken);
      console.log(`Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, but log the error
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        ...newUser,
        role: role,
        emailVerified: false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

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

    // Get user with role information
    const userResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT u.*, r.RoleName, r.PermissionLevel
        FROM Users u
        JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.Username = @username AND u.IsActive = 1
      `);

    if (userResult.recordset.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = userResult.recordset[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if email is verified
    if (!user.EmailVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email address before logging in. Check your inbox for a verification email.',
        requiresEmailVerification: true
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.UserID, 
        username: user.Username, 
        role: user.RoleName,
        permissionLevel: user.PermissionLevel 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('JWT Token:', token);

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    await pool.request()
      .input('userID', sql.Int, user.UserID)
      .input('tokenHash', sql.NVarChar, token)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO UserSessions (UserID, TokenHash, ExpiresAt)
        VALUES (@userID, @tokenHash, @expiresAt)
      `);

    // Update last login
    await pool.request()
      .input('userID', sql.Int, user.UserID)
      .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @userID');

    // Remove sensitive data
    delete user.PasswordHash;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.UserID,
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
        avatarUrl: user.AvatarUrl
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// User Logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }

    const pool = await getConnection();

    // Deactivate session
    await pool.request()
      .input('tokenHash', sql.NVarChar, token)
      .query('UPDATE UserSessions SET IsActive = 0 WHERE TokenHash = @tokenHash');

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

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    const pool = await getConnection();

    // Get current user
    const userResult = await pool.request()
      .input('userID', sql.Int, userId)
      .query('SELECT PasswordHash FROM Users WHERE UserID = @userID AND IsActive = 1');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.recordset[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.PasswordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.request()
      .input('userID', sql.Int, userId)
      .input('newPasswordHash', sql.NVarChar, newPasswordHash)
      .query('UPDATE Users SET PasswordHash = @newPasswordHash, UpdatedAt = GETDATE() WHERE UserID = @userID');

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
      .input('userID', sql.Int, userId)
      .query(`
        SELECT u.*, r.RoleName, r.PermissionLevel
        FROM Users u
        JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.UserID = @userID AND u.IsActive = 1
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.recordset[0];
    delete user.PasswordHash;

    res.json({
      success: true,
      user: {
        id: user.UserID,
        username: user.Username,
        email: user.Email,
        firstName: user.FirstName,
        lastName: user.LastName,
        employeeID: user.EmployeeID,
        department: user.Department,
        shift: user.Shift,
        role: user.RoleName,
        permissionLevel: user.PermissionLevel,
        lastLogin: user.LastLogin,
        createdAt: user.CreatedAt,
        lineId: user.LineID,
        avatarUrl: user.AvatarUrl
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
    const pool = await getConnection();

    // Check if session exists and is active
    const sessionResult = await pool.request()
      .input('tokenHash', sql.NVarChar, token)
      .query('SELECT UserID, ExpiresAt FROM UserSessions WHERE TokenHash = @tokenHash AND IsActive = 1 AND ExpiresAt > GETDATE()');

    if (sessionResult.recordset.length === 0) {
      return null;
    }

    const session = sessionResult.recordset[0];

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.userId !== session.UserID) {
      return null;
    }

    return decoded;

  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
};

// Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification token is required' 
      });
    }

    const pool = await getConnection();

    // Find user with valid verification token
    const userResult = await pool.request()
      .input('token', sql.NVarChar, token)
      .query(`
        SELECT UserID, Email, FirstName, EmailVerificationExpires
        FROM Users 
        WHERE EmailVerificationToken = @token 
        AND EmailVerificationExpires > GETDATE()
        AND EmailVerified = 0
      `);

    if (userResult.recordset.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification token' 
      });
    }

    const user = userResult.recordset[0];

    // Update user as verified
    await pool.request()
      .input('userID', sql.Int, user.UserID)
      .query(`
        UPDATE Users 
        SET EmailVerified = 1, 
            EmailVerificationToken = NULL, 
            EmailVerificationExpires = NULL,
            UpdatedAt = GETDATE()
        WHERE UserID = @userID
      `);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.Email, user.FirstName);
      console.log(`Welcome email sent to ${user.Email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in to your account.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Resend Verification Email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email address is required' 
      });
    }

    const pool = await getConnection();

    // Find user with unverified email
    const userResult = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT UserID, Email, FirstName, EmailVerified, EmailVerificationExpires
        FROM Users 
        WHERE Email = @email AND IsActive = 1
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.recordset[0];

    if (user.EmailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already verified' 
      });
    }

    // Check if we can resend (not too frequent)
    if (user.EmailVerificationExpires && new Date(user.EmailVerificationExpires) > new Date()) {
      const timeLeft = Math.ceil((new Date(user.EmailVerificationExpires) - new Date()) / (1000 * 60));
      return res.status(429).json({ 
        success: false, 
        message: `Please wait ${timeLeft} minutes before requesting another verification email` 
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours from now

    // Update user with new token
    await pool.request()
      .input('userID', sql.Int, user.UserID)
      .input('verificationToken', sql.NVarChar, verificationToken)
      .input('verificationExpires', sql.DateTime2, verificationExpires)
      .query(`
        UPDATE Users 
        SET EmailVerificationToken = @verificationToken, 
            EmailVerificationExpires = @verificationExpires,
            UpdatedAt = GETDATE()
        WHERE UserID = @userID
      `);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.Email, user.FirstName, verificationToken);
      console.log(`Verification email resent to ${user.Email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please try again later.' 
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.'
    });

  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  changePassword,
  getProfile,
  validateToken,
  verifyEmail,
  resendVerificationEmail
}; 
