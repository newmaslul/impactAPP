import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const classes = db.prepare(`
    SELECT classes.*, schools.name AS school_name,
      (SELECT COUNT(*) FROM users WHERE users.class_id = classes.id) AS student_count
    FROM classes JOIN schools ON schools.id = classes.school_id
    ORDER BY schools.name, classes.name
  `).all();
  res.json({ classes });
});

router.post('/', (req, res) => {
  const { name, schoolId } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'נדרש שם כיתה' });
  if (!schoolId) return res.status(400).json({ error: 'נדרש בית ספר' });
  const info = db.prepare('INSERT INTO classes (name, school_id) VALUES (?, ?)').run(name.trim(), schoolId);
  res.status(201).json({ class: db.prepare('SELECT * FROM classes WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'כיתה לא נמצאה' });
  res.status(204).end();
});

export default router;
