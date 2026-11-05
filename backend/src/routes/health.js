const router = require('express').Router();
const db = require('../db');
const provider = require('../services/providerClient');

router.get('/provider', async (_req, res) => {
  const remote = await provider.getHealth();
  const c = db.prepare(`SELECT
      SUM(status IN ('sent','delivered','read')) AS sent,
      SUM(status IN ('delivered','read')) AS delivered,
      SUM(status = 'failed') AS failed FROM messages`).get();
  res.json({
    status: remote ? remote.status : 'down',
    messagesSent: c.sent || 0, messagesDelivered: c.delivered || 0, messagesFailed: c.failed || 0,
  });
});
module.exports = router;
