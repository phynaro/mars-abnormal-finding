const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Test endpoint to verify auth controller is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth controller is working',
    methods: Object.getOwnPropertyNames(Object.getPrototypeOf(authController))
  });
});

// Authenticate user from LIFF profile
router.post('/authenticate', authController.authenticateUser);

// Logout
router.post('/logout', authMiddleware, authController.logout);

// Verify JWT token
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;