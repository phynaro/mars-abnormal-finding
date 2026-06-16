const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { attachEmsRoles, requireEmsAccess, requireEmsAdmin, requireEmsEditor } = require('../middleware/emsAuth');
const { uploadEquipmentMemory } = require('../middleware/upload');

const dashboardController = require('../controllers/ems/dashboardController');
const scheduleController = require('../controllers/ems/scheduleController');
const equipmentController = require('../controllers/ems/equipmentController');
const roleController = require('../controllers/ems/roleController');
const calibrationUserEventsController = require('../controllers/calibrationUserEventsController');

router.use(authenticateToken);

router.get('/me', attachEmsRoles, (req, res) => {
  const level = Number(req.user.levelReport) || 0;
  const emsRoles = req.user.emsRoles || [];
  const canAccess = level >= 2 || emsRoles.length > 0;
  res.json({
    success: true,
    data: {
      emsRoles,
      canAccess,
      canAdmin: Boolean(req.user.canEmsAdmin),
    },
    message: 'EMS access profile',
  });
});

router.use(attachEmsRoles);
router.use(requireEmsAccess);

router.get('/dashboard/kpi', dashboardController.getKpi);
router.get('/dashboard/plant-matrix', dashboardController.getPlantMatrix);
router.get('/dashboard/overdue', dashboardController.getOverdue);
router.get('/dashboard/due-this-week', dashboardController.getDueThisWeek);
router.get('/dashboard/due-soon', dashboardController.getDueSoon);

router.get('/schedule', scheduleController.getScheduleList);
router.get('/schedule/kpi', scheduleController.getScheduleKpi);
router.get('/schedule/calendar-range', scheduleController.getScheduleCalendarRange);
router.get('/schedule/assignees', scheduleController.getScheduleAssignees);

router.get('/user-events', calibrationUserEventsController.getCalibrationUserEvents);
router.get('/user-events/calendar-range', calibrationUserEventsController.getCalibrationUserEventsCalendarRange);
router.get('/user-events/:id', calibrationUserEventsController.getCalibrationUserEventById);
router.post('/user-events', calibrationUserEventsController.createCalibrationUserEvent);
router.put('/user-events/:id', calibrationUserEventsController.updateCalibrationUserEvent);
router.delete('/user-events/:id', calibrationUserEventsController.deleteCalibrationUserEvent);

router.get('/equipment/filters', equipmentController.getFilterOptions);
router.get('/equipment', equipmentController.listEquipment);
router.get('/equipment/:tagNo/changes', equipmentController.getEquipmentChangeHistory);
router.get('/equipment/:tagNo', equipmentController.getEquipmentDetail);
router.put(
  '/equipment/:tagNo',
  requireEmsEditor,
  uploadEquipmentMemory.single('image'),
  equipmentController.updateEquipment,
);

router.get('/roles', requireEmsAdmin, roleController.listRoleAssignments);
router.post('/roles', requireEmsAdmin, roleController.assignRole);
router.delete('/roles/:id', requireEmsAdmin, roleController.removeRole);
router.get('/manager-areas', requireEmsAdmin, roleController.listManagerAreas);
router.post('/manager-areas', requireEmsAdmin, roleController.createManagerArea);
router.delete('/manager-areas/:id', requireEmsAdmin, roleController.deleteManagerArea);

module.exports = router;
