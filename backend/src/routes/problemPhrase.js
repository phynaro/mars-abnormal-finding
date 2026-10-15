const express = require('express');
const router = express.Router();
const problemPhraseController = require('../controllers/problemPhraseController');
const { authenticateToken, requirePermissionLevel } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requirePermissionLevel(3));

router.get('/phrases', problemPhraseController.getPhrases);
router.post('/phrases', problemPhraseController.createPhrase);
router.put('/phrases/:id', problemPhraseController.updatePhrase);
router.delete('/phrases/:id', problemPhraseController.deletePhrase);
router.get('/buckets/counts', problemPhraseController.getBucketCounts);
router.get('/buckets/tickets', problemPhraseController.getBucketTickets);
router.post('/rerun', problemPhraseController.rerunClassification);

module.exports = router;
