const express = require('express');
const router = express.Router();
const PersonnelController = require('../controllers/personnelController');

// Person endpoints
router.get('/persons', PersonnelController.getPersons);
router.get('/persons/:id', PersonnelController.getPersonById);
router.get('/persons/:id/groups', PersonnelController.getPersonUserGroups);

// Department endpoints
router.get('/departments/hierarchy', PersonnelController.getDepartmentHierarchy);
router.get('/departments', PersonnelController.getDepartments);
router.get('/departments/:id', PersonnelController.getDepartmentById);

// Title endpoints
router.get('/titles', PersonnelController.getTitles);
router.get('/titles/:id', PersonnelController.getTitleById);

// User Group endpoints
router.get('/usergroups', PersonnelController.getUserGroups);
router.get('/usergroups/:id', PersonnelController.getUserGroupById);
router.get('/usergroups/:id/members', PersonnelController.getUserGroupMembers);

// Organization statistics
router.get('/stats', PersonnelController.getOrganizationStats);

module.exports = router;
