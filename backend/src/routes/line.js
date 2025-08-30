const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const lineService = require('../services/lineService');

function verifySignature(req) {
  try {
    const secret = process.env.LINE_CHANNEL_SECRET;
    const signature = req.headers['x-line-signature'];
    if (!secret || !signature || !req.rawBody) return true; // skip if no secret configured
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(req.rawBody);
    const digest = hmac.digest('base64');
    return digest === signature;
  } catch (e) {
    console.warn('LINE signature verify error:', e.message);
    return false;
  }
}

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(403).json({ success: false, message: 'Invalid signature' });
  }
  try {
    const body = req.body || {};
    const events = body.events || [];
    for (const event of events) {
      if (event.type === 'message' && event.message?.type === 'text') {
        const text = String(event.message.text || '').toLowerCase();
        // Match variations: line id, lineid, etc.
        const needsLineId = /\bline\s*id\b/.test(text) || /\blineid\b/.test(text);
        if (needsLineId) {
          const userId = event.source?.userId;
          if (userId && event.replyToken) {
            await lineService.replyToToken(event.replyToken, `Your LINE userId: ${userId}`);
          }
        }
      }
    }
    res.json({ success: true });
  } catch (e) {
    console.error('LINE webhook error:', e);
    res.status(500).json({ success: false });
  }
});

module.exports = router;

