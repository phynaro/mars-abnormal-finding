const express = require('express');
const router = express.Router();
const { 
  login, 
  logout, 
  changePassword, 
  getProfile,
  getUserPermissionsAPI,
  checkSpecificPermission
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/login', login);

// Protected routes (authentication required)
router.post('/logout', authenticateToken, logout);
router.post('/change-password', authenticateToken, changePassword);
router.get('/profile', authenticateToken, getProfile);
router.get('/permissions', authenticateToken, getUserPermissionsAPI);
router.post('/check-permission', authenticateToken, checkSpecificPermission);

module.exports = router;