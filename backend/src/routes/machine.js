const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/machines - Get all machines with optional filtering and pagination
router.get('/', machineController.getAllMachines);

// GET /api/machines/stats - Get machine statistics
router.get('/stats', machineController.getMachineStats);

// GET /api/machines/:id - Get machine by ID
router.get('/:id', machineController.getMachineById);

// POST /api/machines - Create a new machine
router.post('/', machineController.createMachine);

// PUT /api/machines/:id - Update machine
router.put('/:id', machineController.updateMachine);

// DELETE /api/machines/:id - Delete machine (soft delete)
router.delete('/:id', machineController.deleteMachine);

module.exports = router;
