import bcrypt from 'bcryptjs';
import db from '../db.js';
import { recomputeDailyScore, upsertRawMetrics } from './service.js';
import { addDays, formatDate, parseDate, todayStr } from './dates.js';

// Seeds one demo school/class and two students with ~14 days of history —
// including a day with a missing metric (exercises the fairness rule) and
// a day with an implausible step count (exercises the anti-manipulation
// flagging) — so the new dashboard isn't empty on first look. Runs once;
// no-ops if any student account already exists.
export function seedActivityDemo() {
  const studentCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'student'").get().n;
  if (studentCount > 0) return;

  const schoolInfo = db.prepare('INSERT INTO schools (name) VALUES (?)').run('בית ספר יסודי הדגמה');
  const classInfo = db.prepare('INSERT INTO classes (name, school_id) VALUES (?, ?)').run("ה'1", schoolInfo.lastInsertRowid);
  const classId = classInfo.lastInsertRowid;

  const passwordHash = bcrypt.hashSync('seed-account-no-login', 10);
  const insertStudent = db.prepare(`
    INSERT INTO users (phone, username, department, role, class_id, password_hash, status)
    VALUES (?, ?, '', 'student', ?, ?, 'active')
  `);

  const students = [
    { phone: '0500000101', username: 'נועם לביא' },
    { phone: '0500000102', username: 'איה שחר' },
  ];

  const studentIds = students.map((s) => insertStudent.run(s.phone, s.username, classId, passwordHash).lastInsertRowid);

  const today = parseDate(todayStr());
  studentIds.forEach((userId, studentIndex) => {
    for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
      const date = formatDate(addDays(today, -daysAgo));
      // A gently improving trend, offset per student, so the Personal
      // Progress card has something real to show.
      const base = 4000 + studentIndex * 800 + (13 - daysAgo) * 220;

      const reading = {
        user_id: userId,
        date,
        source: 'manual',
        steps: base,
        active_minutes: Math.round(20 + (13 - daysAgo) * 1.6),
        distance_km: Math.round((base / 1400) * 10) / 10,
        vigorous_minutes: Math.round(5 + (13 - daysAgo) * 0.6),
      };

      // Day 5 ago: missing distance reading, to demo the fairness rescale.
      if (daysAgo === 5) reading.distance_km = null;
      // Day 2 ago: an implausible spike, to demo anti-manipulation flagging.
      if (daysAgo === 2) reading.steps = 42000;

      upsertRawMetrics(reading);
      recomputeDailyScore(userId, date);
    }
  });
}
