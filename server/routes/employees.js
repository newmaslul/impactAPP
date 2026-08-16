import { Router } from 'express';
import db from '../db.js';
import { toPublicUser } from '../serialize.js';

// NOTE: these endpoints are intentionally open in this prototype — there
// is no separate "admin login" yet, only the one phone+password user
// table. A real deployment must gate these behind an admin-role check
// (e.g. requireAuth + `req.user.role === 'admin'`) before going anywhere
// near production.

const router = Router();

const PHONE_RE = /^0\d{8,9}$/;

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY points DESC').all();
  res.json({ employees: rows.map(toPublicUser) });
});

router.patch('/:id', (req, res) => {
  const { department, role, status } = req.body || {};
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'משתמש לא נמצא' });

  db.prepare(`
    UPDATE users SET
      department = COALESCE(?, department),
      role = COALESCE(?, role),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(department ?? null, role ?? null, status ?? null, req.params.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json({ employee: toPublicUser(updated) });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'משתמש לא נמצא' });
  res.status(204).end();
});

router.post('/invite', (req, res) => {
  const { name, phone, department, role } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'נדרש שם' });
  if (!PHONE_RE.test(String(phone || '').trim())) return res.status(400).json({ error: 'מספר טלפון לא תקין' });

  const normalizedPhone = phone.trim();
  const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone);
  if (existing) return res.status(409).json({ error: 'כבר קיים משתמש עם המספר הזה' });

  const info = db.prepare(`
    INSERT INTO users (phone, username, department, role, status, password_hash)
    VALUES (?, ?, ?, ?, 'invited', NULL)
  `).run(normalizedPhone, name.trim(), department, role || 'employee');

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ employee: toPublicUser(created) });
});

export default router;
