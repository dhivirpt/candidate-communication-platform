require('express-async-errors'); // lets async route handlers throw into the error middleware
const express = require('express');
const cors = require('cors');
const cfg = require('./config');
const events = require('./events');
const { AppError } = require('./errors');
require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/health', require('./routes/health'));
app.use('/webhooks', require('./routes/webhooks'));
app.get('/api/events', (req, res) => events.subscribe(req, res));

app.use((err, _req, res, _next) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

app.listen(cfg.port, () => console.log(`Backend on :${cfg.port}`));
