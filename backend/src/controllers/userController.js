
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
        const secUserRequest = pool.request()
          .input('userID', sql.VarChar(50), userId) // Max 50 chars
          .input('lineId', sql.NVarChar(500), lineId || null) // Match the database field type nvarchar(500)
          .input('updateDate', sql.NVarChar(8), new Date().toISOString().slice(0, 10).replace(/-/g, ''));

        await secUserRequest.query(`
          UPDATE _secUsers
          SET LineID = @lineId,
              UpdateDate = @updateDate
          WHERE UserID = @userID
        `);
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
      await pool.request()
        .input('userID', sql.VarChar, userId)
        .input('avatarUrl', sql.NVarChar(500), relativePath)
        .query(`
          UPDATE _secUsers SET AvatarUrl = @avatarUrl, UpdatedAt = GETDATE() WHERE UserID = @userID
        `);

      res.status(201).json({ success: true, message: 'Avatar updated', data: { avatarUrl: relativePath } });
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

  // Get all users (admin only - placeholder)
  getAllUsers: async (req, res) => {
    res.json({
      success: true,
      message: 'User management functionality coming soon',
      users: []
    });
  },

  // Send test LINE notification to current user's LineID
  sendLineTest: async (req, res) => {
    try {
      const lineService = require('../services/lineService');
      const pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .input('userID', sql.VarChar(50), req.user.userId)
        .query('SELECT LineID FROM _secUsers WHERE UserID = @userID');
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const row = result.recordset[0];
      if (!row.LineID) {
        return res.status(400).json({ success: false, message: 'No LineID set for user' });
      }
      const msg = `Test from CMMS: Hello ${req.user.firstName || ''}!`;
      const r = await lineService.pushToUser(row.LineID, msg);
      if (r.success || r.skipped) {
        return res.json({ success: true, message: 'Test notification sent' });
      }
      return res.status(500).json({ success: false, message: 'Failed to send', error: r.error });
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
            SUM(CASE WHEN reported_by = @personNo AND status = 'completed' THEN 1 ELSE 0 END) as completedTickets
          FROM Tickets 
          WHERE reported_by = @personNo OR assigned_to = @personNo
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
          WHERE reported_by = @personNo
          
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
          completedTickets: stats.completedTickets || 0,
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
