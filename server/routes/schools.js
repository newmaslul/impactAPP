import { Router } from 'express';
import db from '../db.js';

// Same "intentionally open for now" caveat as routes/employees.js — needs
// an admin-role gate before this is anything but a prototype.
const router = Router();

router.get('/', (req, res) => {
  res.json({ schools: db.prepare('SELECT * FROM schools ORDER BY name').all() });
});

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'נדרש שם בית ספר' });
  const info = db.prepare('INSERT INTO schools (name) VALUES (?)').run(name.trim());
  res.status(201).json({ school: db.prepare('SELECT * FROM schools WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM schools WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'בית ספר לא נמצא' });
  res.status(204).end();
});

export default router;
