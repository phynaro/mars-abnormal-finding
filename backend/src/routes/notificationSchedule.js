const express = require('express');
const router = express.Router();
const notificationScheduleController = require('../controllers/notificationScheduleController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all notification schedules
router.get('/', notificationScheduleController.getNotificationSchedules);

// Get notification schedule by type
router.get('/type/:type', notificationScheduleController.getNotificationScheduleByType);

// Update notification schedule
router.put('/:id', notificationScheduleController.updateNotificationSchedule);

// Test notification (trigger manually)
router.post('/test', notificationScheduleController.testNotification);

module.exports = router;

