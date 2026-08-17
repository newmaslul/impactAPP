// Manual "sync now" trigger for the new HealthConnectionCard UI. The
// existing useActivitySync.js already syncs automatically (throttled,
// on every meaningful reading change) — this doesn't replace that, it's
// an additional on-demand path for a UI button, going through the exact
// same backend route (`POST /activity/sync`, see
// supabase/functions/activity/index.ts) and validation
// (`_shared/scoring/validation.ts`) every other sync already goes
// through. No new endpoint, per the confirmed decision in this
// integration's plan.

import { api } from '../lib/api.js';

/**
 * @param {{id: string, reading: object|null}} adapter
 * @returns {Promise<object>} the updated activity summary (same shape api.activitySummary() returns)
 */
export async function syncHealthData(adapter) {
  if (!adapter?.reading) {
    throw new Error('אין נתונים לסנכרון עדיין');
  }
  await api.activitySync({ source: adapter.id, ...adapter.reading });
  return api.activitySummary();
}

/**
 * Deletes every stored raw_daily_metrics row for this adapter's source
 * (docs/HEALTH_PRIVACY.md's self-service delete) and returns the
 * recomputed today's score. This only removes what this app stored —
 * it cannot revoke the underlying OS-level HealthKit/Health Connect
 * permission (see healthService.js's disconnectHealth() for that half).
 * @param {{id: string}} adapter
 */
export async function deleteHealthData(adapter) {
  if (!adapter?.id) {
    throw new Error('אין מקור מחובר למחיקה');
  }
  return api.deleteHealthData(adapter.id);
}
