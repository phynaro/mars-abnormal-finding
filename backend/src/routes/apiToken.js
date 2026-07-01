const express = require('express');
const router = express.Router();
const apiTokenController = require('../controllers/apiTokenController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Managing service API tokens is admin-only and must use a real user session
// (a read-only API token cannot manage tokens, since these are POST/DELETE).
router.use(authenticateToken, requireAdmin);

router.get('/', apiTokenController.listApiTokens);
router.post('/', apiTokenController.createApiToken);
router.delete('/:id', apiTokenController.revokeApiToken);

module.exports = router;
