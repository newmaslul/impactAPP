// calculateSleepScore() and its inputs: Duration Score (§12),
// Consistency Score (7-night rolling stdDev), Wake Regularity (§13-15).
// All pure functions of already-computed session/history data — no I/O.

// Duration Score formula is this implementation's documented
// interpretation (the spec fixes the target range per age band via
// sleep_age_bands, but not the exact scoring curve around it): full marks
// inside [targetMin, targetMax], linearly scaled down on either side of
// the range, floored at 0 — sleeping either too little or too much both
// pull the score down, rather than only under-sleeping being penalized.
export function calculateDurationScore(estimatedSleepMinutes: number, targetMinMinutes: number, targetMaxMinutes: number): number {
  if (estimatedSleepMinutes <= 0) return 0;
  if (estimatedSleepMinutes >= targetMinMinutes && estimatedSleepMinutes <= targetMaxMinutes) return 100;
  if (estimatedSleepMinutes < targetMinMinutes) {
    return Math.max(0, Math.round(100 * (estimatedSleepMinutes / targetMinMinutes)));
  }
  // Oversleeping: lose the same proportion above the max as an equal
  // excess would lose below the min, floored at 0 rather than going
  // negative for extreme outliers.
  const excess = estimatedSleepMinutes - targetMaxMinutes;
  return Math.max(0, Math.round(100 * (1 - excess / targetMaxMinutes)));
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Consistency Score: 7-night rolling stdDev of estimated sleep duration.
// Interpretation: a stdDev of 0 minutes = perfectly consistent = 100; a
// stdDev of 120 minutes (2 hours) or more is treated as fully
// inconsistent = 0, linear in between. Needs at least 2 nights of history
// to be meaningful — with fewer, returns null (not a misleadingly perfect
// 100 from a single data point) so the caller can fall back or exclude it
// from the composite, mirroring the existing activity engine's
// missing-metric fairness rule (exclude, don't default to 0 or fake full
// marks).
const CONSISTENCY_STDDEV_FLOOR_MINUTES = 120;

export function calculateConsistencyScore(recentDurationsMinutes: number[]): number | null {
  const nights = recentDurationsMinutes.slice(-7).filter((n) => n != null && !Number.isNaN(n));
  if (nights.length < 2) return null;
  const sd = stdDev(nights);
  return Math.max(0, Math.round(100 * (1 - sd / CONSISTENCY_STDDEV_FLOOR_MINUTES)));
}

// Wake Regularity (§13-15): consistency of wake TIME-of-day across recent
// nights, independent of sleep duration. Wake times are given as minutes
// since local midnight (0-1439); a circular stdDev is used so a 23:50 vs
// 00:10 wake pair reads as 20 minutes apart, not ~23.5 hours. Same
// stdDev-to-score mapping shape as consistency, with a tighter floor (60
// minutes) since wake time is a more tightly regulated rhythm than total
// duration in typical routines.
const REGULARITY_STDDEV_FLOOR_MINUTES = 60;
const MINUTES_PER_DAY = 1440;

function circularStdDevMinutes(wakeMinutes: number[]): number {
  if (wakeMinutes.length < 2) return 0;
  // Map each time to a point on the unit circle, average the vectors, and
  // derive a circular spread from the resultant vector length — the
  // standard way to average/measure spread on a clock face.
  const angles = wakeMinutes.map((m) => (2 * Math.PI * m) / MINUTES_PER_DAY);
  const sinSum = angles.reduce((s, a) => s + Math.sin(a), 0) / angles.length;
  const cosSum = angles.reduce((s, a) => s + Math.cos(a), 0) / angles.length;
  const resultantLength = Math.sqrt(sinSum ** 2 + cosSum ** 2);
  const circularVariance = 1 - resultantLength; // 0 = identical times, 1 = maximally spread
  // Convert back to a minutes-scale spread for a stable, documented mapping.
  return circularVariance * (MINUTES_PER_DAY / (2 * Math.PI));
}

export function calculateWakeRegularity(recentWakeTimesMinutes: number[]): number | null {
  const nights = recentWakeTimesMinutes.slice(-7).filter((n) => n != null && !Number.isNaN(n));
  if (nights.length < 2) return null;
  const sd = circularStdDevMinutes(nights);
  return Math.max(0, Math.round(100 * (1 - sd / REGULARITY_STDDEV_FLOOR_MINUTES)));
}

// calculateSleepScore(): 60% duration + 20% consistency + 10% regularity +
// 10% confidence. When consistency and/or regularity are unavailable
// (fewer than 2 nights of history — a new user's first night), they're
// excluded from both the earned and possible totals and the remaining
// weights are rescaled to /100, same fairness rule as the activity
// scoring engine (never default a missing metric to 0).
export function calculateSleepScore(input: {
  durationScore: number | null;
  consistencyScore: number | null;
  regularityScore: number | null;
  confidenceScore: number | null; // 0-100
}): number | null {
  const parts: Array<{ value: number; weight: number }> = [];
  if (input.durationScore != null) parts.push({ value: input.durationScore, weight: 0.60 });
  if (input.consistencyScore != null) parts.push({ value: input.consistencyScore, weight: 0.20 });
  if (input.regularityScore != null) parts.push({ value: input.regularityScore, weight: 0.10 });
  if (input.confidenceScore != null) parts.push({ value: input.confidenceScore, weight: 0.10 });

  if (parts.length === 0) return null;

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const earned = parts.reduce((s, p) => s + p.value * p.weight, 0);
  return Math.round(earned / totalWeight);
}
