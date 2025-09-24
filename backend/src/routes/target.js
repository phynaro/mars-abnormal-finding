const express = require('express');
const router = express.Router();
const targetController = require('../controllers/targetController');

// Get all targets with optional filtering
router.get('/', targetController.getTargets);

// Get target by ID
router.get('/:id', targetController.getTargetById);

// Create new target (for all periods)
router.post('/', targetController.createTarget);

// Create multiple targets (bulk)
router.post('/bulk', targetController.createTargetsBulk);

// Update target
router.put('/:id', targetController.updateTarget);

// Delete target (deletes all periods for a type/year/area combination)
router.delete('/:id', targetController.deleteTarget);

// Copy P1 target to all periods
router.post('/copy-p1', targetController.copyP1ToAllPeriods);

// Get available years
router.get('/meta/years', targetController.getAvailableYears);

module.exports = router;
