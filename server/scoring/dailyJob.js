import db from '../db.js';
import { recomputeDailyScore } from './service.js';
import { addDays, formatDate, parseDate, todayStr } from './dates.js';

// Safety net, not the primary path: POST /api/activity/sync already
// recomputes a user's score live on every reading. This just catches
// anyone whose data arrived without a fresh sync call finalizing it (e.g.
// a future adapter that writes raw_daily_metrics directly), by making
// sure yesterday's score got computed at least once. Plain
// setInterval-based scheduling — no extra dependency for something this
// small.
export function finalizeYesterdayForAllUsers() {
  const yesterday = formatDate(addDays(parseDate(todayStr()), -1));
  const userIds = db.prepare(`
    SELECT DISTINCT user_id FROM raw_daily_metrics WHERE date = ?
  `).all(yesterday).map((r) => r.user_id);

  userIds.forEach((userId) => {
    const existing = db.prepare('SELECT id FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, yesterday);
    if (!existing) recomputeDailyScore(userId, yesterday);
  });

  return userIds.length;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function startDailyJobScheduler() {
  setInterval(finalizeYesterdayForAllUsers, SIX_HOURS_MS);
}
