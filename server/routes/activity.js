import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { upsertRawMetrics, recomputeDailyScore, getDailyScore, getHistory, getSummary, getEffectiveConfig } from '../scoring/service.js';
import { todayStr } from '../scoring/dates.js';

const router = Router();

const SOURCES = ['device_sensor', 'apple_health', 'health_connect', 'fitbit', 'garmin', 'manual'];

router.post('/sync', requireAuth, (req, res) => {
  const { date, source, steps, active_minutes, distance_km, vigorous_minutes, active_energy_kcal } = req.body || {};
  const dateStr = date || todayStr();

  if (!SOURCES.includes(source)) {
    return res.status(400).json({ error: `source חייב להיות אחד מ: ${SOURCES.join(', ')}` });
  }
  if (steps == null && active_minutes == null && distance_km == null && vigorous_minutes == null) {
    return res.status(400).json({ error: 'נדרש לפחות מדד אחד' });
  }

  upsertRawMetrics({
    user_id: req.userId,
    date: dateStr,
    source,
    steps: steps ?? null,
    active_minutes: active_minutes ?? null,
    distance_km: distance_km ?? null,
    vigorous_minutes: vigorous_minutes ?? null,
    active_energy_kcal: active_energy_kcal ?? null,
  });

  const daily = recomputeDailyScore(req.userId, dateStr);
  res.json({ dailyScore: daily });
});

router.get('/today', requireAuth, (req, res) => {
  const dateStr = todayStr();
  const daily = getDailyScore(req.userId, dateStr) || recomputeDailyScore(req.userId, dateStr);
  res.json({ dailyScore: daily });
});

router.get('/history', requireAuth, (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 365);
  res.json({ history: getHistory(req.userId, days) });
});

router.get('/summary', requireAuth, (req, res) => {
  res.json(getSummary(req.userId));
});

router.get('/config', (req, res) => {
  res.json({ config: getEffectiveConfig(todayStr()) });
});

// NOTE: intentionally open, same caveat as routes/employees.js — needs an
// admin-role gate before this is anything but a prototype.
router.put('/config', (req, res) => {
  const current = getEffectiveConfig(todayStr());
  const {
    steps_goal, steps_weight, active_minutes_goal, active_minutes_weight,
    distance_goal_km, distance_weight, vigorous_minutes_goal, vigorous_weight,
    effective_from,
  } = req.body || {};

  const next = {
    steps_goal: steps_goal ?? current.steps_goal,
    steps_weight: steps_weight ?? current.steps_weight,
    active_minutes_goal: active_minutes_goal ?? current.active_minutes_goal,
    active_minutes_weight: active_minutes_weight ?? current.active_minutes_weight,
    distance_goal_km: distance_goal_km ?? current.distance_goal_km,
    distance_weight: distance_weight ?? current.distance_weight,
    vigorous_minutes_goal: vigorous_minutes_goal ?? current.vigorous_minutes_goal,
    vigorous_weight: vigorous_weight ?? current.vigorous_weight,
  };

  const totalWeight = next.steps_weight + next.active_minutes_weight + next.distance_weight + next.vigorous_weight;
  if (Math.round(totalWeight) !== 100) {
    return res.status(400).json({ error: `סכום המשקלים חייב להיות 100 (כרגע: ${totalWeight})` });
  }

  // Never mutates the previous row — a new version takes effect from the
  // given date (default today), so historical scores stay reproducible.
  const info = db.prepare(`
    INSERT INTO scoring_config (effective_from, steps_goal, steps_weight, active_minutes_goal, active_minutes_weight, distance_goal_km, distance_weight, vigorous_minutes_goal, vigorous_weight)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    effective_from || todayStr(), next.steps_goal, next.steps_weight, next.active_minutes_goal,
    next.active_minutes_weight, next.distance_goal_km, next.distance_weight, next.vigorous_minutes_goal, next.vigorous_weight
  );

  res.status(201).json({ config: db.prepare('SELECT * FROM scoring_config WHERE id = ?').get(info.lastInsertRowid) });
});

export default router;
