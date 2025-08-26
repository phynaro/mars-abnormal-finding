const express = require('express');
const authMiddleware = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get current user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Get user role
router.get('/role', userController.getRole);

// Update user role (admin only)
router.put('/role', userController.updateUserRole);

// Get all users (admin only)
router.get('/all', userController.getAllUsers);

module.exports = router;