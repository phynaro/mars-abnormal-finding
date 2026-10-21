const express = require('express');
const { authenticateToken, requireInternalUser } = require('../middleware/auth');
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
router.put('/profile/line-id', userController.updateLineId);
router.post('/line/test', userController.sendLineTest);
router.delete('/profile/line-account', userController.unlinkLineAccount);
router.get('/profile/line-profile', userController.getLineProfile);
router.get('/stats', requireInternalUser, userController.getUserStats);
router.get('/role', userController.getRole);
router.get('/all-basic', requireInternalUser, userController.getAllUsers);

// User management stays internal. Profile routes above remain available to external users.
router.get('/all', requireInternalUser, userManagementController.getAllUsers);
router.get('/groups', requireInternalUser, userManagementController.getAvailableGroups);
router.get('/departments', userManagementController.getDepartments);
router.get('/:userId', requireInternalUser, userManagementController.getUserById);
router.post('/', requireInternalUser, userManagementController.createUser);
router.put('/:userId', requireInternalUser, userManagementController.updateUser);
router.delete('/:userId', requireInternalUser, userManagementController.deleteUser);
router.put('/:userId/password', requireInternalUser, userManagementController.resetUserPassword);

module.exports = router;
