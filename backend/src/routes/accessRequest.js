const express = require('express');
const router = express.Router();
const { checkRequestStatus, submitAccessRequest, getAllAccessRequests } = require('../controllers/accessRequestController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/check-status/:lineId', checkRequestStatus);
router.post('/submit', submitAccessRequest);

// Protected routes (authentication required) - for admin use
router.get('/all', authenticateToken, getAllAccessRequests);

module.exports = router;
