// calculateConfidence() — §10. The spec fixes the five sub-scores and
// their weights (sensorQuality 30%, signalContinuity 25%, screenReliability
// 20%, usageReliability 15%, chargingReliability 10%) but not each
// sub-score's exact formula. As already flagged in the approved plan, this
// file documents its own interpretation of each rather than inventing one
// silently:
//
// - sensorQuality: fraction of the night's windows backed by a real
//   sample (not gap-filled).
// - signalContinuity: penalizes one long blackout more than the same
//   total gap spread thin — 1 minus the longest consecutive gap-filled
//   run, as a fraction of the whole night.
// - screenReliability: agreement rate between screenActivity and
//   touchActivity among real windows (phone-use signals that disagree
//   wildly — screen off but heavy touch, etc. — indicate a noisy read).
// - usageReliability: appActivity (usage of *other* apps) has no web API
//   at all (§ platform constraints) — permanently unavailable from
//   phone_sensor/manual sources, so this reliability is capped at a
//   neutral 0.5 for those rather than silently treated as "confirmed zero
//   activity". Sources that do carry real app-usage data (future
//   healthkit/health_connect/wearable integrations) get full credit.
// - chargingReliability: the web Battery Status API is deprecated/removed
//   in most current browsers, so `charging` is usually unknown (0.5) —
//   this sub-score is the fraction of real windows where charging state
//   was actually known, again neutral rather than penalizing to 0.

import type { ConfidenceBreakdown, SleepSource, SleepWindow } from './types.ts';

const WEIGHTS = {
  sensorQuality: 0.30,
  signalContinuity: 0.25,
  screenReliability: 0.20,
  usageReliability: 0.15,
  chargingReliability: 0.10,
};

const SOURCES_WITH_REAL_APP_USAGE: SleepSource[] = ['healthkit', 'health_connect', 'wearable'];

function longestGapRun(windows: SleepWindow[]): number {
  let longest = 0;
  let current = 0;
  for (const w of windows) {
    if (w.isGapFilled) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function bandFor(score: number): ConfidenceBreakdown['band'] {
  if (score >= 85) return 'HIGH';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

export function calculateConfidence(windows: SleepWindow[], source: SleepSource): ConfidenceBreakdown {
  if (windows.length === 0) {
    return {
      sensorQuality: 0,
      signalContinuity: 0,
      screenReliability: 0,
      usageReliability: 0,
      chargingReliability: 0,
      confidenceScore: 0,
      band: 'LOW',
    };
  }

  const realWindows = windows.filter((w) => !w.isGapFilled);

  const sensorQuality = realWindows.length / windows.length;

  const signalContinuity = 1 - longestGapRun(windows) / windows.length;

  const screenReliability =
    realWindows.length === 0
      ? 0
      : realWindows.filter((w) => (w.screenActivity >= 0.30) === (w.touchActivity >= 0.30)).length / realWindows.length;

  const usageReliability = SOURCES_WITH_REAL_APP_USAGE.includes(source) ? 1 : 0.5;

  const chargingReliability =
    realWindows.length === 0 ? 0.5 : realWindows.filter((w) => w.charging !== 0.5).length / realWindows.length;

  const confidenceScore = Math.round(
    100 *
      (WEIGHTS.sensorQuality * sensorQuality +
        WEIGHTS.signalContinuity * signalContinuity +
        WEIGHTS.screenReliability * screenReliability +
        WEIGHTS.usageReliability * usageReliability +
        WEIGHTS.chargingReliability * chargingReliability)
  );

  return {
    sensorQuality,
    signalContinuity,
    screenReliability,
    usageReliability,
    chargingReliability,
    confidenceScore,
    band: bandFor(confidenceScore),
  };
}
