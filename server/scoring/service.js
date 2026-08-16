import db from '../db.js';
import { METRICS, computeDailyScore, computeWeeklyAverage, computePreviousWeekAverage, computeMonthlyAverage, computeStreak, computePersonalProgress } from './engine.js';
import { validateReading } from './validation.js';
import { todayStr, addDays, parseDate, formatDate } from './dates.js';

export function getEffectiveConfig(dateStr) {
  return db.prepare(`
    SELECT * FROM scoring_config WHERE effective_from <= ? ORDER BY effective_from DESC, id DESC LIMIT 1
  `).get(dateStr);
}

/**
 * A source reporting a reading for a date replaces its own previous
 * reading for that (user, date, source) rather than accumulating
 * duplicate rows — this is the app's duplicate-prevention mechanism.
 */
export function upsertRawMetrics(reading) {
  const { user_id, date, source } = reading;
  const existing = db.prepare(`
    SELECT id FROM raw_daily_metrics WHERE user_id = ? AND date = ? AND source = ?
  `).get(user_id, date, source);

  if (existing) {
    db.prepare(`
      UPDATE raw_daily_metrics SET
        steps = ?, active_minutes = ?, distance_km = ?, vigorous_minutes = ?, active_energy_kcal = ?,
        sync_batch_id = ?, ingested_at = datetime('now')
      WHERE id = ?
    `).run(
      reading.steps ?? null, reading.active_minutes ?? null, reading.distance_km ?? null,
      reading.vigorous_minutes ?? null, reading.active_energy_kcal ?? null, reading.sync_batch_id ?? null,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO raw_daily_metrics (user_id, date, source, steps, active_minutes, distance_km, vigorous_minutes, active_energy_kcal, sync_batch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user_id, date, source,
      reading.steps ?? null, reading.active_minutes ?? null, reading.distance_km ?? null,
      reading.vigorous_minutes ?? null, reading.active_energy_kcal ?? null, reading.sync_batch_id ?? null
    );
  }
}

/** Merges readings across sources for one day: the max non-null value per
 *  metric wins (a phone and a watch both reporting partial step counts
 *  for the day shouldn't cancel each other out; the fuller reading should). */
function mergeRawMetricsForDate(userId, date) {
  const rows = db.prepare('SELECT * FROM raw_daily_metrics WHERE user_id = ? AND date = ?').all(userId, date);
  const merged = { steps: null, active_minutes: null, distance_km: null, vigorous_minutes: null, active_energy_kcal: null };
  for (const row of rows) {
    for (const key of Object.keys(merged)) {
      if (row[key] != null && (merged[key] == null || row[key] > merged[key])) merged[key] = row[key];
    }
  }
  return merged;
}

function getTrailingAverages(userId, beforeDateStr, days = 7) {
  const before = parseDate(beforeDateStr);
  const start = formatDate(addDays(before, -days));
  const rows = db.prepare(`
    SELECT steps_value, active_minutes_value, distance_value, vigorous_value
    FROM daily_scores WHERE user_id = ? AND date >= ? AND date < ?
  `).all(userId, start, beforeDateStr);

  const avg = (values) => {
    const nums = values.filter((v) => v != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };
  return {
    steps: avg(rows.map((r) => r.steps_value)),
    active_minutes: avg(rows.map((r) => r.active_minutes_value)),
    distance_km: avg(rows.map((r) => r.distance_value)),
    vigorous_minutes: avg(rows.map((r) => r.vigorous_value)),
  };
}

/** Validates, scores, and persists one user's daily_scores row for a date. */
export function recomputeDailyScore(userId, dateStr) {
  const merged = mergeRawMetricsForDate(userId, dateStr);
  const trailingAverages = getTrailingAverages(userId, dateStr);
  const { clamped, flags } = validateReading(merged, trailingAverages);
  const config = getEffectiveConfig(dateStr);
  const { perMetric, rawTotal, maxPossible, activityScore } = computeDailyScore(clamped, config);

  db.prepare(`
    INSERT INTO daily_scores (
      user_id, date,
      steps_value, steps_missing, steps_score,
      active_minutes_value, active_minutes_missing, active_minutes_score,
      distance_value, distance_missing, distance_score,
      vigorous_value, vigorous_missing, vigorous_score,
      raw_total, max_possible, activity_score, scoring_config_id, quality_flags, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, date) DO UPDATE SET
      steps_value=excluded.steps_value, steps_missing=excluded.steps_missing, steps_score=excluded.steps_score,
      active_minutes_value=excluded.active_minutes_value, active_minutes_missing=excluded.active_minutes_missing, active_minutes_score=excluded.active_minutes_score,
      distance_value=excluded.distance_value, distance_missing=excluded.distance_missing, distance_score=excluded.distance_score,
      vigorous_value=excluded.vigorous_value, vigorous_missing=excluded.vigorous_missing, vigorous_score=excluded.vigorous_score,
      raw_total=excluded.raw_total, max_possible=excluded.max_possible, activity_score=excluded.activity_score,
      scoring_config_id=excluded.scoring_config_id, quality_flags=excluded.quality_flags, calculated_at=datetime('now')
  `).run(
    userId, dateStr,
    perMetric.steps.value, perMetric.steps.missing ? 1 : 0, perMetric.steps.score,
    perMetric.active_minutes.value, perMetric.active_minutes.missing ? 1 : 0, perMetric.active_minutes.score,
    perMetric.distance_km.value, perMetric.distance_km.missing ? 1 : 0, perMetric.distance_km.score,
    perMetric.vigorous_minutes.value, perMetric.vigorous_minutes.missing ? 1 : 0, perMetric.vigorous_minutes.score,
    rawTotal, maxPossible, activityScore, config.id, flags.length ? JSON.stringify(flags) : null
  );

  if (flags.length) {
    const insertEvent = db.prepare(`
      INSERT INTO data_quality_events (user_id, date, metric, flag_type, details) VALUES (?, ?, ?, ?, ?)
    `);
    flags.forEach((f) => insertEvent.run(userId, dateStr, f.metric, f.flag_type, f.details));
  }

  return getDailyScore(userId, dateStr);
}

export function getDailyScore(userId, dateStr) {
  const row = db.prepare('SELECT * FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, dateStr);
  return row ? { ...row, quality_flags: row.quality_flags ? JSON.parse(row.quality_flags) : [] } : null;
}

export function getHistory(userId, days) {
  const start = formatDate(addDays(parseDate(todayStr()), -days));
  return db.prepare('SELECT * FROM daily_scores WHERE user_id = ? AND date >= ? ORDER BY date ASC').all(userId, start);
}

export function getSummary(userId, dateStr = todayStr()) {
  const today = recomputeDailyScore(userId, dateStr); // live: always reflects the latest synced data
  const yesterdayStr = formatDate(addDays(parseDate(dateStr), -1));
  const yesterday = getDailyScore(userId, yesterdayStr);

  const history = db.prepare('SELECT date, activity_score FROM daily_scores WHERE user_id = ? ORDER BY date DESC LIMIT 90').all(userId);

  const weeklyAverage = computeWeeklyAverage(history, dateStr);
  const previousWeekAverage = computePreviousWeekAverage(history, dateStr);
  const monthlyAverage = computeMonthlyAverage(history, dateStr);
  const streak = computeStreak(history);
  const personalProgress = computePersonalProgress(weeklyAverage, previousWeekAverage);

  return {
    today,
    deltaVsYesterday: yesterday?.activity_score != null && today.activity_score != null
      ? today.activity_score - yesterday.activity_score
      : null,
    weeklyAverage,
    monthlyAverage,
    streak,
    personalProgress,
  };
}
