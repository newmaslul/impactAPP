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
