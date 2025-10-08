const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { uploadAvatar, compressAvatarMiddleware } = require('../middleware/upload');
const userController = require('../controllers/userController');
const userManagementController = require('../controllers/userManagementController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Basic user profile routes (existing)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile/avatar', uploadAvatar.single('avatar'), compressAvatarMiddleware, userController.uploadAvatar);
router.post('/line/test', userController.sendLineTest);
router.get('/stats', userController.getUserStats);
router.get('/role', userController.getRole);
router.get('/all-basic', userController.getAllUsers); // Get all users for filtering (basic info only)

// User management routes (Admin only)
router.get('/all', userManagementController.getAllUsers);
router.get('/groups', userManagementController.getAvailableGroups);
router.get('/:userId', userManagementController.getUserById);
router.post('/', userManagementController.createUser);
router.put('/:userId', userManagementController.updateUser);
router.delete('/:userId', userManagementController.deleteUser);

// Password management
router.put('/:userId/password', userManagementController.resetUserPassword);

module.exports = router;
