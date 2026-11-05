const router = require('express').Router();
const svc = require('../services/messageService');

router.post('/send', async (req, res) => {
  res.status(201).json(await svc.send(req.body.candidateIds, req.body.body));
});
router.post('/:id/retry', async (req, res) => {
  res.json(await svc.retry(Number(req.params.id)));
});

module.exports = router;
