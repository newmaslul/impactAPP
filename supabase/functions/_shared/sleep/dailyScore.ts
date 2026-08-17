// calculateDailyScore() — §16. The new top-level composite that replaces
// activity_score as the number shown in ScoreRing (confirmed decision,
// see plan): 40% Activity + 30% Sleep + 20% Steps + 10% Consistency.
//
// Two things are flagged here exactly as in the approved plan, not
// silently resolved:
// - "Steps" here is a standalone steps/goal ratio (0-100), separate from
//   the steps sub-metric already folded into `activityScore` — the given
//   formula double-counts steps on purpose (once inside Activity, once
//   standalone), and this file preserves that rather than "fixing" it.
// - "Consistency" reuses the sleep consistency score (7-night rolling
//   stdDev of sleep duration) — the spec doesn't define a separate
//   activity-consistency metric, so nothing new is invented for it.
//
// Missing inputs are excluded from both earned and possible totals and
// the rest rescaled to /100 — the same fairness rule used throughout the
// activity scoring engine (never default a missing metric to 0).

export interface DailyScoreInput {
  activityScore: number | null; // existing 4-metric composite, unchanged
  sleepScore: number | null;
  stepsScore: number | null; // steps/goal ratio, 0-100, standalone from activityScore's own steps share
  consistencyScore: number | null; // reuses sleep's consistency score
}

const WEIGHTS = {
  activityScore: 0.40,
  sleepScore: 0.30,
  stepsScore: 0.20,
  consistencyScore: 0.10,
};

export function calculateDailyScore(input: DailyScoreInput): number | null {
  const parts: Array<{ value: number; weight: number }> = [];
  if (input.activityScore != null) parts.push({ value: input.activityScore, weight: WEIGHTS.activityScore });
  if (input.sleepScore != null) parts.push({ value: input.sleepScore, weight: WEIGHTS.sleepScore });
  if (input.stepsScore != null) parts.push({ value: input.stepsScore, weight: WEIGHTS.stepsScore });
  if (input.consistencyScore != null) parts.push({ value: input.consistencyScore, weight: WEIGHTS.consistencyScore });

  if (parts.length === 0) return null;

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const earned = parts.reduce((s, p) => s + p.value * p.weight, 0);
  return Math.round(earned / totalWeight);
}

/** Standalone steps/goal ratio (0-100), clamped — the "Steps" input above. */
export function calculateStepsScore(steps: number, goalSteps: number): number {
  if (goalSteps <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((steps / goalSteps) * 100)));
}
