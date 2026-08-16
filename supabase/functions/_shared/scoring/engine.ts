// Pure, config-driven scoring functions — no DB access, no side effects.
// Every weight/goal comes from the `config` argument (a row from
// scoring_config), never a hardcoded constant, so admin changes to goals
// or weights never require touching this file.
//
// Deliberately excludes active_energy_kcal from scoring entirely — it's a
// calorie-burn *estimate*, not a direct activity measure (see
// PRODUCT requirement #8). Callers may still store it for reference.

import { parseDate, formatDate, addDays, startOfWeek, startOfMonth, endOfMonth } from './dates.ts';

export const METRICS = [
  { key: 'steps', goalKey: 'steps_goal', weightKey: 'steps_weight' },
  { key: 'active_minutes', goalKey: 'active_minutes_goal', weightKey: 'active_minutes_weight' },
  { key: 'distance_km', goalKey: 'distance_goal_km', weightKey: 'distance_weight' },
  { key: 'vigorous_minutes', goalKey: 'vigorous_minutes_goal', weightKey: 'vigorous_weight' },
];

export function computeMetricScore(value, goal, weight) {
  if (!goal || goal <= 0) return 0;
  return Math.min((value / goal) * weight, weight);
}

/**
 * rawMetrics: { steps, active_minutes, distance_km, vigorous_minutes } —
 * a key holding `null`/`undefined` means that metric is missing today,
 * not zero.
 *
 * Fairness rule (confirmed with the product owner): a missing metric is
 * excluded from BOTH the earned total and the possible total, then the
 * ratio is rescaled to /100 — a child missing only their distance reading
 * is scored out of the remaining 85 points, not penalized to 0 for it.
 */
export function computeDailyScore(rawMetrics, config) {
  let rawTotal = 0;
  let maxPossible = 0;
  const perMetric = {};

  for (const m of METRICS) {
    const value = rawMetrics[m.key];
    const missing = value === null || value === undefined;
    const weight = config[m.weightKey];

    if (missing) {
      perMetric[m.key] = { value: null, missing: true, score: 0 };
      continue;
    }

    const score = computeMetricScore(value, config[m.goalKey], weight);
    perMetric[m.key] = { value, missing: false, score };
    rawTotal += score;
    maxPossible += weight;
  }

  const activityScore = maxPossible > 0 ? Math.round((rawTotal / maxPossible) * 100) : null;

  return { perMetric, rawTotal, maxPossible, activityScore };
}

/** Average of non-null activity_score values within [startDate, endDate] inclusive. */
export function averageScoreInRange(dailyScores, startDate, endDate) {
  const inRange = dailyScores.filter((d) => {
    const date = parseDate(d.date);
    return date >= startDate && date <= endDate && d.activity_score !== null && d.activity_score !== undefined;
  });
  if (inRange.length === 0) return null;
  const sum = inRange.reduce((acc, d) => acc + d.activity_score, 0);
  return Math.round((sum / inRange.length) * 10) / 10;
}

export function computeWeeklyAverage(dailyScores, referenceDateStr) {
  const ref = parseDate(referenceDateStr);
  const start = startOfWeek(ref);
  const end = addDays(start, 6);
  return averageScoreInRange(dailyScores, start, end);
}

export function computePreviousWeekAverage(dailyScores, referenceDateStr) {
  const ref = parseDate(referenceDateStr);
  const thisWeekStart = startOfWeek(ref);
  const start = addDays(thisWeekStart, -7);
  const end = addDays(thisWeekStart, -1);
  return averageScoreInRange(dailyScores, start, end);
}

export function computeMonthlyAverage(dailyScores, referenceDateStr) {
  const ref = parseDate(referenceDateStr);
  return averageScoreInRange(dailyScores, startOfMonth(ref), endOfMonth(ref));
}

/**
 * Consecutive days (walking back from the most recent date present) with
 * a recorded, positive activity_score. Breaks on any gap or missed day.
 */
export function computeStreak(dailyScores) {
  const byDate = new Map(dailyScores.map((d) => [d.date, d.activity_score]));
  const sortedDates = [...byDate.keys()].sort().reverse();
  if (sortedDates.length === 0) return 0;

  let streak = 0;
  let cursor = parseDate(sortedDates[0]);
  for (const dateStr of sortedDates) {
    if (formatDate(cursor) !== dateStr) break;
    const score = byDate.get(dateStr);
    if (score === null || score === undefined || score <= 0) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Personal Progress Score — the fairness feature: measures a child's
 * improvement against their OWN recent history, not against other kids.
 * Matches the product owner's own example: 55 → 70 = "שיפור של 27%".
 */
export function computePersonalProgress(thisWeekAvg, lastWeekAvg) {
  if (lastWeekAvg === null || lastWeekAvg === 0) {
    return { percent: null, label: 'אין מספיק נתונים להשוואה' };
  }
  if (thisWeekAvg === null) {
    return { percent: null, label: 'אין נתונים השבוע' };
  }
  const percent = Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100);
  const label = percent >= 0 ? `שיפור של ${percent}%` : `ירידה של ${Math.abs(percent)}%`;
  return { percent, label };
}
