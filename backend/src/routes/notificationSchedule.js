const express = require('express');
const router = express.Router();
const notificationScheduleController = require('../controllers/notificationScheduleController');
const { authenticateToken, requirePermissionLevel, requireInternalUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireInternalUser);

// Get all notification schedules
router.get('/', notificationScheduleController.getNotificationSchedules);

// Get notification schedule by type
router.get('/type/:type', notificationScheduleController.getNotificationScheduleByType);

// Test notification (trigger manually)
router.post('/test', notificationScheduleController.testNotification);

// Runtime relay toggle/config — must be registered before /:id
router.get('/relay-config', requirePermissionLevel(3), notificationScheduleController.getRelayConfig);
router.put('/relay-config', requirePermissionLevel(3), notificationScheduleController.updateRelayConfig);

// Update notification schedule
router.put('/:id', notificationScheduleController.updateNotificationSchedule);

module.exports = router;

