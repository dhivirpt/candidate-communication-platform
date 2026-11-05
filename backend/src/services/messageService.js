const crypto = require('crypto');
const db = require('../db');
const provider = require('./providerClient');
const events = require('../events');
const { AppError, describe } = require('../errors');

const RANK = { queued: 0, sent: 1, delivered: 2, read: 3 };

const toDto = (m) => m && ({
  id: m.id, candidateId: m.candidate_id, body: m.body, status: m.status,
  errorCode: m.error_code, errorMessage: m.error_message, retryable: !!m.retryable,
  attempts: m.attempts, createdAt: m.created_at, updatedAt: m.updated_at,
});
const getMessage = (id) => db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

/** Replace {{name}} / {{firstName}} with candidate data (simple templating). */
function render(body, c) {
  return body.replace(/{{\s*name\s*}}/gi, c.name).replace(/{{\s*firstName\s*}}/gi, c.name.split(' ')[0]);
}

/** Hand a stored message to the provider. Never throws: a failure is stored on the row. */
async function dispatch(id) {
  const msg = getMessage(id);
  const cand = db.prepare('SELECT * FROM candidates WHERE id = ?').get(msg.candidate_id);
  db.prepare(`UPDATE messages SET attempts = attempts + 1, status = 'queued', error_code = NULL,
              error_message = NULL, retryable = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  try {
    const r = await provider.sendMessage({ to: cand.phone, body: msg.body, reference: String(id) });
    db.prepare(`UPDATE messages SET provider_message_id = ?, updated_at = datetime('now') WHERE id = ?`).run(r.id, id);
  } catch (e) {
    const code = e.code || 'provider_error';
    const info = describe(code);
    db.prepare(`UPDATE messages SET status = 'failed', error_code = ?, error_message = ?, retryable = ?,
                updated_at = datetime('now') WHERE id = ?`).run(code, info.message, info.retryable ? 1 : 0, id);
  }
  const out = toDto(getMessage(id));
  events.broadcast('message.updated', out);
  return out;
}

/** Send the same message to many candidates. Each one is tracked independently. */
async function send(candidateIds, template) {
  const body = (template || '').trim();
  if (!body) throw new AppError(400, 'Message cannot be empty');
  if (body.length > 1000) throw new AppError(400, 'Message is too long (max 1000 characters)');
  if (!Array.isArray(candidateIds) || !candidateIds.length) throw new AppError(400, 'Select at least one candidate');

  const bulkId = crypto.randomUUID();
  const results = await Promise.all(candidateIds.map(async (cid) => {
    try {
      const cand = db.prepare('SELECT * FROM candidates WHERE id = ?').get(cid);
      if (!cand) return { candidateId: cid, name: 'Unknown', error: 'Candidate no longer exists' };
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO messages (candidate_id, body, bulk_id) VALUES (?, ?, ?)').run(cid, render(body, cand), bulkId);
      return { candidateId: cid, name: cand.name, message: await dispatch(lastInsertRowid) };
    } catch (e) {
      console.error(e);
      return { candidateId: cid, error: 'Something went wrong while sending this message' };
    }
  }));
  return { bulkId, results };
}

async function retry(id) {
  const msg = getMessage(id);
  if (!msg) throw new AppError(404, 'Message not found');
  if (msg.status !== 'failed') throw new AppError(409, 'Only failed messages can be retried');
  if (!msg.retryable) throw new AppError(409, 'This failure is permanent and cannot be retried');
  return dispatch(id);
}

/**
 * Process a provider webhook. Idempotent and order-safe:
 *  - duplicate eventId  -> ignored
 *  - status never moves backwards (read can't become delivered)
 *  - 'failed' only applies if the message was not yet delivered/read
 */
function applyStatusEvent({ eventId, messageId, status, errorCode }) {
  if (!eventId || !messageId || !status) throw new AppError(400, 'Invalid event');
  const msg = db.prepare('SELECT * FROM messages WHERE provider_message_id = ?').get(messageId);
  // Not stored yet (race with send) -> 404 so the provider retries later
  if (!msg) throw new AppError(404, 'Unknown message');

  const result = db.transaction(() => {
    const ins = db.prepare('INSERT OR IGNORE INTO status_events (event_id, message_id, status) VALUES (?, ?, ?)')
      .run(eventId, msg.id, status);
    if (ins.changes === 0) return { duplicate: true };

    const cur = getMessage(msg.id).status;
    if (status === 'failed') {
      if (cur === 'delivered' || cur === 'read') return { ignored: true };
      const info = describe(errorCode);
      db.prepare(`UPDATE messages SET status='failed', error_code=?, error_message=?, retryable=?,
                  updated_at=datetime('now') WHERE id=?`)
        .run(errorCode || 'provider_error', info.message, info.retryable ? 1 : 0, msg.id);
      return { applied: true };
    }
    if (status in RANK && cur !== 'failed' && RANK[status] > RANK[cur]) {
      db.prepare(`UPDATE messages SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, msg.id);
      return { applied: true };
    }
    return { ignored: true };
  })();

  if (result.applied) events.broadcast('message.updated', toDto(getMessage(msg.id)));
  return result;
}

module.exports = { send, retry, applyStatusEvent, toDto };
