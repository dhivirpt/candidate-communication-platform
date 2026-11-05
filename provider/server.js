/**
 * Dummy communication provider (acts like a tiny WhatsApp/Twilio).
 * Fully independent from the main app: it only talks HTTP.
 *
 * Magic phone numbers (last 4 digits) simulate behaviours:
 *   0000 -> 400 invalid_recipient      (permanent)
 *   8888 -> 429 rate_limited           (temporary)
 *   9999 -> 503 service_unavailable    (temporary)
 *   7777 -> accepted, then delivery FAILS asynchronously (handset unreachable)
 *   6666 -> sent + delivered, never read
 *   else -> sent -> delivered -> read
 * Admin: POST /admin/outage {"on":true|false} makes every send return 503.
 */
const express = require('express');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.PROVIDER_API_KEY || 'dummy-key';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dummy-webhook-secret';
const SPEED = Number(process.env.SPEED || 1); // >1 = faster demo

const app = express();
app.use(express.json());

const messages = new Map();
const stats = { accepted: 0, delivered: 0, failed: 0, rejected: 0 };
let outage = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));

async function postWebhook(url, payload, attempt = 1) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-provider-secret': WEBHOOK_SECRET },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    if (attempt < 5) { await wait(1000 * attempt); return postWebhook(url, payload, attempt + 1); }
    console.error('webhook gave up', payload.eventId, e.message);
  }
}

async function emit(msg, status, extra = {}) {
  msg.status = status;
  const payload = { eventId: `${msg.id}:${status}`, messageId: msg.id, status,
    timestamp: new Date().toISOString(), ...extra };
  await postWebhook(msg.callbackUrl, payload);
  // Real providers occasionally redeliver events -> simulate duplicates
  if (Math.random() < 0.3) await postWebhook(msg.callbackUrl, payload);
}

async function lifecycle(msg) {
  const tail = msg.to.slice(-4);
  await wait(1000);
  await emit(msg, 'sent');
  if (tail === '7777') {
    await wait(1500);
    stats.failed++;
    return emit(msg, 'failed', { errorCode: 'handset_unreachable', errorMessage: 'Recipient handset is unreachable' });
  }
  await wait(2000);
  stats.delivered++;
  await emit(msg, 'delivered');
  if (tail === '6666') return;
  await wait(3000);
  await emit(msg, 'read');
}

const auth = (req, res, next) =>
  req.get('x-api-key') === API_KEY ? next() : res.status(401).json({ error: 'unauthorized' });

app.post('/v1/messages', auth, (req, res) => {
  const { to, body, callbackUrl } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'bad_request', message: 'to and body are required' });
  const tail = String(to).slice(-4);

  if (outage || tail === '9999') { stats.rejected++; return res.status(503).json({ error: 'service_unavailable', message: 'Provider temporarily unavailable' }); }
  if (tail === '8888') { stats.rejected++; res.set('Retry-After', '30'); return res.status(429).json({ error: 'rate_limited', message: 'Too many requests' }); }
  if (tail === '0000' || !/^\+?\d{10,15}$/.test(to)) { stats.rejected++; return res.status(400).json({ error: 'invalid_recipient', message: 'Recipient number is not valid' }); }

  const msg = { id: 'pm_' + crypto.randomBytes(6).toString('hex'), to, body, callbackUrl, status: 'queued' };
  messages.set(msg.id, msg);
  stats.accepted++;
  lifecycle(msg).catch((e) => console.error(e));
  res.status(202).json({ id: msg.id, status: 'queued' });
});

app.get('/v1/messages/:id', auth, (req, res) => {
  const m = messages.get(req.params.id);
  return m ? res.json({ id: m.id, status: m.status }) : res.status(404).json({ error: 'not_found' });
});

app.get('/health', (_req, res) =>
  res.json({ status: outage ? 'down' : 'operational', ...stats }));

app.post('/admin/outage', (req, res) => { outage = !!(req.body && req.body.on); res.json({ outage }); });

app.listen(PORT, () => console.log(`Dummy provider on :${PORT}`));
