// Pure anomaly-detection for one day's raw reading before it's scored.
// Flags are informational (persisted to data_quality_events for admin
// review) — flagged values are CLAMPED to a sane ceiling, never zeroed,
// and still count toward the child's own score/history. The intent is to
// stop a value from gaming a future ranking, not to punish a kid for a
// sensor glitch on their own dashboard. Duplicate-submission prevention
// is handled separately at the route layer via an upsert keyed on
// (user_id, date, source) — a day's reading from a given source updates
// in place rather than accumulating duplicate rows.

// Deliberately generous ceilings — the goal is to catch obviously broken
// data (sensor glitches, unit errors), not to second-guess a genuinely
// very active kid. Tune here as needed; nothing above depends on these
// exact numbers.
export const CAPS = {
  steps: 60000,
  active_minutes: 600,
  distance_km: 42,
  vigorous_minutes: 300,
};

function clampWithFlag(value, cap, metric, flags) {
  if (value === null || value === undefined) return value;
  if (value > cap) {
    flags.push({ metric, flag_type: 'outlier_high', details: `${value} exceeds the ${cap} ceiling; clamped.` });
    return cap;
  }
  if (value < 0) {
    flags.push({ metric, flag_type: 'invalid_negative', details: `${value} is negative; clamped to 0.` });
    return 0;
  }
  return value;
}

/**
 * reading: { steps, active_minutes, distance_km, vigorous_minutes } (nulls allowed = missing)
 * trailingAverages: same shape, each the user's own recent (e.g. 7-day) average, or null if insufficient history
 */
export function validateReading(reading, trailingAverages = {}) {
  const flags = [];
  const clamped = { ...reading };

  clamped.steps = clampWithFlag(reading.steps, CAPS.steps, 'steps', flags);
  clamped.active_minutes = clampWithFlag(reading.active_minutes, CAPS.active_minutes, 'active_minutes', flags);
  clamped.distance_km = clampWithFlag(reading.distance_km, CAPS.distance_km, 'distance_km', flags);
  clamped.vigorous_minutes = clampWithFlag(reading.vigorous_minutes, CAPS.vigorous_minutes, 'vigorous_minutes', flags);

  // Jump check: a value far above the child's own recent average — likely
  // a glitch, or worth a look, but not disqualifying on its own.
  for (const metric of ['steps', 'active_minutes', 'distance_km', 'vigorous_minutes']) {
    const value = clamped[metric];
    const avg = trailingAverages[metric];
    if (value == null || avg == null || avg <= 0) continue;
    if (value > avg * 3 && value > (metric === 'steps' ? 3000 : 10)) {
      flags.push({ metric, flag_type: 'implausible_jump', details: `${value} is more than 3x this user's recent average (${avg}).` });
    }
  }

  // Cross-metric consistency: distance far beyond what the reported step
  // count could plausibly cover (~3 meters/step is already generous).
  if (clamped.distance_km != null && clamped.steps != null && clamped.steps > 0) {
    const kmPerThousandSteps = clamped.distance_km / (clamped.steps / 1000);
    if (kmPerThousandSteps > 3) {
      flags.push({
        metric: 'distance_km',
        flag_type: 'inconsistent_metrics',
        details: `${clamped.distance_km}km reported against only ${clamped.steps} steps.`,
      });
    }
  }

  // vigorous_minutes shouldn't exceed active_minutes (vigorous is a subset).
  if (clamped.vigorous_minutes != null && clamped.active_minutes != null && clamped.vigorous_minutes > clamped.active_minutes) {
    flags.push({
      metric: 'vigorous_minutes',
      flag_type: 'inconsistent_metrics',
      details: `${clamped.vigorous_minutes} vigorous minutes exceeds ${clamped.active_minutes} total active minutes.`,
    });
    clamped.vigorous_minutes = clamped.active_minutes;
  }

  return { clamped, flags };
}
