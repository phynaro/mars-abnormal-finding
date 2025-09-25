const express = require('express');
const router = express.Router();
const personalTargetController = require('../controllers/personalTargetController');

// Get personal targets with optional filtering
router.get('/', personalTargetController.getPersonalTargets);

// Get personal target by ID
router.get('/:id', personalTargetController.getPersonalTargetById);

// Create personal targets for all periods
router.post('/', personalTargetController.createPersonalTargets);

// Update personal target
router.put('/:id', personalTargetController.updatePersonalTarget);

// Delete personal targets for a person, type, and year combination
router.delete('/', personalTargetController.deletePersonalTargets);

// Get available years
router.get('/years/available', personalTargetController.getPersonalTargetAvailableYears);

module.exports = router;
