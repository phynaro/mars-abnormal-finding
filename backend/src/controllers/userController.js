
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
// Simple user controller for testing - uses the auth controller's getProfile method
const { getProfile } = require('./authController');
const path = require('path');

const userController = {
  // Get user profile (redirects to auth controller)
  getProfile: getProfile,

    // Update user profile (self only)
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.userId; // Use userId from JWT
      const { firstName, lastName, email, phone, title, lineId } = req.body;

      const pool = await sql.connect(dbConfig);
      
      // Update Person table (main user information)
      // Only update if at least one field is provided
      if (firstName !== undefined || lastName !== undefined || email !== undefined || phone !== undefined || title !== undefined) {
        const personRequest = pool.request()
          .input('personNo', sql.Int, req.user.id) // PersonNo from JWT
          .input('firstName', sql.NVarChar(30), firstName !== undefined ? firstName : null) // Max 30 chars
          .input('lastName', sql.NVarChar(30), lastName !== undefined ? lastName : null) // Max 30 chars
          .input('email', sql.NVarChar(200), email !== undefined ? email : null) // Max 200 chars
          .input('phone', sql.NVarChar(30), phone !== undefined ? phone : null) // Max 30 chars
          .input('title', sql.NVarChar(200), title !== undefined ? title : null); // Max 200 chars

        await personRequest.query(`
          UPDATE Person
          SET FIRSTNAME = COALESCE(@firstName, FIRSTNAME),
              LASTNAME = COALESCE(@lastName, LASTNAME),
              EMAIL = COALESCE(@email, EMAIL),
              PHONE = COALESCE(@phone, PHONE),
              TITLE = COALESCE(@title, TITLE),
              PERSON_NAME = COALESCE(@firstName, FIRSTNAME) + ' ' + COALESCE(@lastName, LASTNAME),
              UPDATEDATE = CONVERT(NVARCHAR(8), GETDATE(), 112),
              UPDATEUSER = @personNo
          WHERE PERSONNO = @personNo
        `);
      }

            // Update _secUsers table (security/user settings)
      // Always update LineID if it's provided in the request (even if empty)
      if (lineId !== undefined) {
        // Check if UserExtension record exists
        const checkResult = await pool.request()
          .input('userID', sql.VarChar(50), userId)
          .query('SELECT UserID FROM UserExtension WHERE UserID = @userID');
        
        if (checkResult.recordset.length === 0) {
          // Create UserExtension record if it doesn't exist
          await pool.request()
            .input('userID', sql.VarChar(50), userId)
            .input('lineId', sql.NVarChar(500), lineId || null)
            .query(`
              INSERT INTO UserExtension (UserID, EmailVerified, EmailVerificationToken, EmailVerificationExpires, LastLogin, CreatedAt, UpdatedAt, LineID, AvatarUrl, IsActive)
              VALUES (@userID, 'Y', NULL, NULL, NULL, GETDATE(), GETDATE(), @lineId, NULL, 1)
            `);
        } else {
          // Update existing UserExtension record
          await pool.request()
            .input('userID', sql.VarChar(50), userId)
            .input('lineId', sql.NVarChar(500), lineId || null)
            .query(`
              UPDATE UserExtension
              SET LineID = @lineId,
                  UpdatedAt = GETDATE()
              WHERE UserID = @userID
            `);
        }
      }

      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
    }
  },

  // Upload avatar for current user; stores path in _secUsers.AvatarUrl
  uploadAvatar: async (req, res) => {
    try {
      const userId = req.user.userId; // Use userId from JWT
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No avatar file uploaded' });
      }
      const relativePath = `/uploads/avatars/${req.user.id}/${req.file.filename}`;

      const pool = await sql.connect(dbConfig);
      
      // Check if UserExtension record exists
      const checkResult = await pool.request()
        .input('userID', sql.VarChar, userId)
        .query('SELECT UserID FROM UserExtension WHERE UserID = @userID');
      
      if (checkResult.recordset.length === 0) {
        // Create UserExtension record if it doesn't exist
        await pool.request()
          .input('userID', sql.VarChar, userId)
          .input('avatarUrl', sql.NVarChar(500), relativePath)
          .query(`
            INSERT INTO UserExtension (UserID, EmailVerified, EmailVerificationToken, EmailVerificationExpires, LastLogin, CreatedAt, UpdatedAt, LineID, AvatarUrl, IsActive)
            VALUES (@userID, 'Y', NULL, NULL, NULL, GETDATE(), GETDATE(), NULL, @avatarUrl, 1)
          `);
      } else {
        // Update existing UserExtension record
        await pool.request()
          .input('userID', sql.VarChar, userId)
          .input('avatarUrl', sql.NVarChar(500), relativePath)
          .query(`
            UPDATE UserExtension SET AvatarUrl = @avatarUrl, UpdatedAt = GETDATE() WHERE UserID = @userID
          `);
      }

      const compressionInfo = req.compressionInfo ? {
        originalSizeKB: req.compressionInfo.originalSizeKB,
        compressedSizeKB: req.compressionInfo.compressedSizeKB,
        reductionPercentage: req.compressionInfo.reductionPercentage
      } : null;

      res.status(201).json({ 
        success: true, 
        message: 'Avatar updated', 
        data: { 
          avatarUrl: relativePath,
          compression: compressionInfo
        } 
      });
    } catch (error) {
      console.error('Upload Avatar Error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload avatar', error: error.message });
    }
  },

  // Get user role
  getRole: async (req, res) => {
    try {
      res.json({
        success: true,
        groupCode: req.user.groupCode,
        groupName: req.user.groupName,
        groupNo: req.user.groupNo
      });
    } catch (error) {
      console.error('Get Role Error:', error);
      res.status(500).json({ error: 'Failed to get user role' });
    }
  },

  // Update user role (admin only - placeholder)
  updateUserRole: async (req, res) => {
    res.json({
      success: true,
      message: 'Role update functionality coming soon'
    });
  },

  // Get all users for filtering purposes (basic info only)
  getAllUsers: async (req, res) => {
    try {
      const pool = await sql.connect(dbConfig);
      
      // Get all active users with basic information for filtering
      const result = await pool.request()
        .query(`
          SELECT 
            p.PERSONNO as id,
            p.PERSON_NAME as name,
            p.FIRSTNAME,
            p.LASTNAME,
            p.EMAIL,
            p.PHONE,
            p.TITLE,
            u.IsActive
          FROM Person p
          INNER JOIN _secUsers u ON p.PERSONNO = u.PersonNo
          LEFT JOIN UserExtension ue ON u.UserID = ue.UserID
          WHERE p.FLAGDEL != 'Y' 
            AND (ue.IsActive = 1 OR ue.IsActive IS NULL)
          ORDER BY p.PERSON_NAME
        `);

      const users = result.recordset.map(user => ({
        id: user.id,
        name: user.name || `${user.FIRSTNAME || ''} ${user.LASTNAME || ''}`.trim(),
        email: user.EMAIL,
        phone: user.PHONE,
        title: user.TITLE
      }));

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  },

  // Send test LINE notification to current user's LineID or provided LineID
  sendLineTest: async (req, res) => {
    try {
      const lineService = require('../services/lineService');
      const { lineId } = req.body;
      
      let targetLineId = lineId;
      
      // If no lineId provided in body, get from user's saved LineID
      if (!targetLineId) {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
          .input('userID', sql.VarChar(50), req.user.userId)
          .query('SELECT LineID FROM UserExtension WHERE UserID = @userID');
        
        if (result.recordset.length === 0) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const row = result.recordset[0];
        if (!row.LineID) {
          return res.status(400).json({ 
            success: false, 
            message: 'No LineID set for user. Please set your LINE ID in profile first.' 
          });
        }
        
        targetLineId = row.LineID;
      }
      
      // Validate LINE ID format
      if (!lineService.isValidLineUserId(targetLineId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid LINE ID format. LINE ID should start with "U" followed by 32 characters.' 
        });
      }
      
      const msg = `Test from CMMS: Hello ${req.user.firstName || req.user.username || 'User'}!`;
      const r = await lineService.sendToUser(targetLineId, msg);
      
      if (r.success || r.skipped) {
        return res.json({ 
          success: true, 
          message: 'Test notification sent successfully',
          lineId: targetLineId,
          skipped: r.skipped 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send LINE notification', 
        error: r.error 
      });
    } catch (error) {
      console.error('Send LINE test error:', error);
      res.status(500).json({ success: false, message: 'Internal error' });
    }
  },

  // Get user statistics and recent activity
  getUserStats: async (req, res) => {
    try {
      const userId = req.user.userId;
      const personNo = req.user.id;

      const pool = await sql.connect(dbConfig);

      // Get ticket statistics
      const statsResult = await pool.request()
        .input('personNo', sql.Int, personNo)
        .query(`
          SELECT 
            COUNT(*) as totalTickets,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openTickets,
            SUM(CASE WHEN assigned_to = @personNo AND status IN ('open', 'in_progress') THEN 1 ELSE 0 END) as assignedTickets,
            SUM(CASE WHEN created_by = @personNo AND status = 'Finished' THEN 1 ELSE 0 END) as FinishedTickets
          FROM Tickets 
          WHERE created_by = @personNo OR assigned_to = @personNo
        `);

      const stats = statsResult.recordset[0];

      // Get recent activity (last 10 activities)
      const activityResult = await pool.request()
        .input('personNo', sql.Int, personNo)
        .query(`
          SELECT TOP 10
            'ticket_created' as type,
            title,
            'Ticket created: ' + title as description,
            created_at as timestamp,
            status
          FROM Tickets 
          WHERE created_by = @personNo
          
          UNION ALL
          
          SELECT TOP 10
            'ticket_assigned' as type,
            title,
            'Assigned to you: ' + title as description,
            created_at as timestamp,
            status
          FROM Tickets 
          WHERE assigned_to = @personNo
          
          ORDER BY timestamp DESC
        `);

      const recentActivity = activityResult.recordset.map((row, index) => ({
        id: `activity_${index}`,
        type: row.type,
        title: row.title,
        description: row.description,
        timestamp: row.timestamp,
        status: row.status
      }));

      res.json({
        success: true,
        data: {
          totalTickets: stats.totalTickets || 0,
          openTickets: stats.openTickets || 0,
          assignedTickets: stats.assignedTickets || 0,
          FinishedTickets: stats.FinishedTickets || 0,
          recentActivity: recentActivity
        }
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user statistics',
        error: error.message 
      });
    }
  }
};

module.exports = userController;
