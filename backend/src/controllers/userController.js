
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
      const userId = req.user.id;
      const { firstName, lastName, department, shift, lineId } = req.body;

      const pool = await sql.connect(dbConfig);
      const request = pool.request()
        .input('userID', sql.Int, userId)
        .input('firstName', sql.NVarChar, firstName)
        .input('lastName', sql.NVarChar, lastName)
        .input('department', sql.NVarChar, department)
        .input('shift', sql.NVarChar, shift)
        .input('lineId', sql.NVarChar, lineId || null);

      await request.query(`
        UPDATE Users
        SET FirstName = @firstName,
            LastName = @lastName,
            Department = @department,
            Shift = @shift,
            LineID = @lineId,
            UpdatedAt = GETDATE()
        WHERE UserID = @userID AND IsActive = 1
      `);

      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
    }
  },

  // Upload avatar for current user; stores path in Users.AvatarUrl
  uploadAvatar: async (req, res) => {
    try {
      const userId = req.user.id;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No avatar file uploaded' });
      }
      const relativePath = `/uploads/avatars/${userId}/${req.file.filename}`;

      const pool = await sql.connect(dbConfig);
      await pool.request()
        .input('userID', sql.Int, userId)
        .input('avatarUrl', sql.NVarChar(500), relativePath)
        .query(`
          UPDATE Users SET AvatarUrl = @avatarUrl, UpdatedAt = GETDATE() WHERE UserID = @userID
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
        role: req.user.role,
        permissionLevel: req.user.permissionLevel
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
        .input('userID', sql.Int, req.user.id)
        .query('SELECT LineID, FirstName FROM Users WHERE UserID = @userID');
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
  }
};

module.exports = userController;
