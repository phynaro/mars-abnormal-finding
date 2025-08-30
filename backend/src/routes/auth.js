const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout, 
  changePassword, 
  getProfile,
  verifyEmail,
  resendVerificationEmail
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Protected routes (authentication required)
router.post('/logout', authenticateToken, logout);
router.post('/change-password', authenticateToken, changePassword);
router.get('/profile', authenticateToken, getProfile);

module.exports = router;