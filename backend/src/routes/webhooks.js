const router = require('express').Router();
const cfg = require('../config');
const svc = require('../services/messageService');
const { AppError } = require('../errors');

router.post('/provider', (req, res) => {
  if (req.get('x-provider-secret') !== cfg.webhookSecret) throw new AppError(401, 'Invalid signature');
  res.json(svc.applyStatusEvent(req.body));
});
module.exports = router;
