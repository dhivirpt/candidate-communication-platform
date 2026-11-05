const router = require('express').Router();
const db = require('../db');
const { AppError } = require('../errors');
const { toDto } = require('../services/messageService');

const dto = (c) => ({
  id: c.id, name: c.name, phone: c.phone, email: c.email, createdAt: c.created_at,
  lastStatus: c.last_status || null,
});
const LIST_SQL = `SELECT c.*, (SELECT status FROM messages m WHERE m.candidate_id = c.id
                  ORDER BY m.id DESC LIMIT 1) AS last_status FROM candidates c`;

router.get('/', (req, res) => {
  const q = `%${(req.query.q || '').toString().trim()}%`;
  const rows = db.prepare(`${LIST_SQL} WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
                           ORDER BY c.id DESC`).all(q, q, q);
  res.json(rows.map(dto));
});

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const phone = (req.body.phone || '').replace(/[\s()-]/g, '');
  if (!name) throw new AppError(400, 'Name is required');
  if (!/^\+?\d{10,15}$/.test(phone)) throw new AppError(400, 'Enter a valid phone number (10-15 digits, e.g. +919876543210)');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError(400, 'Enter a valid email address');
  if (db.prepare('SELECT 1 FROM candidates WHERE phone = ?').get(phone))
    throw new AppError(409, 'A candidate with this phone number already exists');
  const { lastInsertRowid } = db.prepare('INSERT INTO candidates (name, phone, email) VALUES (?, ?, ?)').run(name, phone, email);
  res.status(201).json(dto(db.prepare(`${LIST_SQL} WHERE c.id = ?`).get(lastInsertRowid)));
});

router.post('/bulk-delete', (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) throw new AppError(400, 'No candidates selected');
  const del = db.prepare('DELETE FROM candidates WHERE id = ?');
  const n = db.transaction(() => ids.reduce((s, id) => s + del.run(id).changes, 0))();
  res.json({ deleted: n });
});

router.get('/:id', (req, res) => {
  const c = db.prepare(`${LIST_SQL} WHERE c.id = ?`).get(req.params.id);
  if (!c) throw new AppError(404, 'Candidate not found');
  res.json(dto(c));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  if (!r.changes) throw new AppError(404, 'Candidate not found');
  res.json({ deleted: 1 });
});

router.get('/:id/messages', (req, res) => {
  if (!db.prepare('SELECT 1 FROM candidates WHERE id = ?').get(req.params.id)) throw new AppError(404, 'Candidate not found');
  const rows = db.prepare('SELECT * FROM messages WHERE candidate_id = ? ORDER BY id DESC').all(req.params.id);
  res.json(rows.map(toDto));
});

module.exports = router;
