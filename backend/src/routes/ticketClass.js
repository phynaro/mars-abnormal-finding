const express = require('express');
const router = express.Router();
const ticketClassController = require('../controllers/ticketClassController');
const { authenticateToken } = require('../middleware/auth');

// Get all ticket classes
router.get('/', authenticateToken, ticketClassController.getTicketClasses);

module.exports = router;

