// Local-timezone "today" boundary for the health layer. Deliberately the
// mirror image of supabase/functions/_shared/scoring/dates.ts, which is
// UTC-safe on purpose because it does server-side math on a `date`
// string the client already resolved — that resolution has to happen
// somewhere, and "what day is it right now, for this device" can only be
// answered correctly on the device itself, in its own timezone. Nothing
// in the frontend computed this local boundary before this file existed.

/** Midnight today, in the device's own local timezone. */
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 'YYYY-MM-DD' for the device's local today — what the backend's `date` field expects. */
export function todayLocalDateString() {
  return formatLocalDate(new Date());
}

/** 'YYYY-MM-DD' for an arbitrary local Date, without any UTC shift (unlike `toISOString().slice(0,10)`, which would). */
export function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
