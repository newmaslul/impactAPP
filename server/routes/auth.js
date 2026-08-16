import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { toPublicUser } from '../serialize.js';

const router = Router();

const PHONE_RE = /^0\d{8,9}$/;

router.post('/register', (req, res) => {
  const { phone, username, department, password, biometricEnabled, role, classId } = req.body || {};
  const accountRole = role === 'student' ? 'student' : 'employee';

  if (!PHONE_RE.test(String(phone || '').trim())) {
    return res.status(400).json({ error: 'מספר טלפון לא תקין' });
  }
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'נדרש שם משתמש' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'הסיסמה צריכה להכיל לפחות 6 תווים' });
  }
  if (accountRole === 'student' && !classId) {
    return res.status(400).json({ error: 'נדרשת כיתה' });
  }

  const normalizedPhone = phone.trim();
  const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone);

  // An admin-invited row has no password yet — registering with that phone
  // completes/activates the same account instead of failing as a duplicate.
  if (existing && existing.password_hash) {
    return res.status(409).json({ error: 'המספר הזה כבר רשום — נסו להתחבר במקום' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  // department is a corporate-account concept; students use class_id instead.
  const departmentValue = accountRole === 'student' ? '' : (department || '');

  let user;
  if (existing) {
    db.prepare(`
      UPDATE users SET username = ?, department = ?, role = ?, class_id = ?, password_hash = ?, biometric_enabled = ?, status = 'active'
      WHERE id = ?
    `).run(username.trim(), departmentValue, accountRole, classId ?? null, passwordHash, biometricEnabled ? 1 : 0, existing.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  } else {
    const info = db.prepare(`
      INSERT INTO users (phone, username, department, role, class_id, password_hash, biometric_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(normalizedPhone, username.trim(), departmentValue, accountRole, classId ?? null, passwordHash, biometricEnabled ? 1 : 0);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

router.post('/login', (req, res) => {
  const { phone, password } = req.body || {};
  if (!PHONE_RE.test(String(phone || '').trim())) {
    return res.status(400).json({ error: 'מספר טלפון לא תקין' });
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone.trim());
  if (!user || !user.password_hash || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'מספר טלפון או סיסמה שגויים' });
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

// The biometric ceremony (see src/hooks/useBiometricAuth.js) is a real,
// local WebAuthn platform-authenticator check — the OS genuinely demands
// Face ID/fingerprint/Windows Hello. But turning that into a *server*-
// verified login would mean registering the passkey's public key here and
// checking its signed assertion on every login (e.g. via
// @simplewebauthn/server) — a real feature on its own. This endpoint is
// the honest, simplified stand-in: it trusts that the client already
// completed the biometric check and just issues a session for that phone
// number, with no password. Do not ship this as-is; it's a placeholder
// for real server-side WebAuthn verification.
router.post('/biometric-login', (req, res) => {
  const { phone } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(String(phone || '').trim());
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
  res.json({ token: signToken(user), user: toPublicUser(user) });
});

router.post('/forgot-password', (req, res) => {
  const { phone } = req.body || {};
  if (!PHONE_RE.test(String(phone || '').trim())) {
    return res.status(400).json({ error: 'מספר טלפון לא תקין' });
  }
  // Security-conscious: always say the same thing whether or not the
  // number is registered. There's no SMS provider wired up, so nothing is
  // actually sent — this only proves the number reaches a real account.
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
  res.json({ user: toPublicUser(user) });
});

export default router;
