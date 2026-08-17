// Buckets raw samples into fixed-size night windows and scores each one
// with a sleepProbability / awakeProbability pair.
//
// NOTE on formula provenance: the governing spec fixes the *inputs*
// (screenActivity/touchActivity/motionActivity/appActivity, each
// normalized 0..1, no audio ever) and the *consequences* of the
// probabilities (the §6/§7 consecutive-window thresholds implemented in
// session.ts). It does not fix a single canonical weighting for turning
// those four inputs into one probability number, so — same as the
// confidence sub-formulas already flagged in the approved plan — this
// file documents its own weighting explicitly rather than inventing one
// silently: phone use (screen/touch/app) is the strongest awake signal,
// motion alone is a weaker one (movement without phone use is common in
// light sleep and is handled separately via `movementOnly` in
// session.ts), so it carries less weight here.

import type { SleepSample, SleepWindow } from './types.ts';

const AWAKE_WEIGHTS = {
  screen: 0.40,
  touch: 0.25,
  motion: 0.20,
  app: 0.15,
};

// A window with zero real samples isn't a data hole — it's treated as
// low-activity, sleep-favoring evidence (per the plan's platform-constraints
// section: a suspended background tab produces exactly this pattern during
// real sleep, and it should count as weak sleep evidence, not be skipped).
const GAP_FILL_AWAKE_PROBABILITY = 0.15;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function computeAwakeProbability(sample: Pick<SleepSample, 'screenActivity' | 'touchActivity' | 'motionActivity' | 'appActivity'>): number {
  const screen = clamp01(sample.screenActivity);
  const touch = clamp01(sample.touchActivity);
  const motion = clamp01(sample.motionActivity);
  const app = clamp01(sample.appActivity);
  return clamp01(
    AWAKE_WEIGHTS.screen * screen +
      AWAKE_WEIGHTS.touch * touch +
      AWAKE_WEIGHTS.motion * motion +
      AWAKE_WEIGHTS.app * app
  );
}

export function computeSleepProbability(sample: Pick<SleepSample, 'screenActivity' | 'touchActivity' | 'motionActivity' | 'appActivity'>): number {
  return clamp01(1 - computeAwakeProbability(sample));
}

function chargingToNumeric(charging: boolean | null): number {
  if (charging === true) return 1;
  if (charging === false) return 0;
  return 0.5; // unknown — Battery Status API unavailable on most current browsers
}

/**
 * Buckets samples (assumed already filtered to a single night's window,
 * e.g. 18:00 to 12:00 the next day — the caller decides the night
 * boundary) into fixed-size windows spanning [nightStart, nightEnd).
 * Windows with no real sample inside them are gap-filled with a low,
 * sleep-favoring reading rather than omitted, so the detector can still
 * run across a silent overnight gap.
 */
export function bucketSamplesIntoWindows(
  samples: SleepSample[],
  nightStart: Date,
  nightEnd: Date,
  windowSizeMinutes: number
): SleepWindow[] {
  const windowMs = windowSizeMinutes * 60 * 1000;
  const sorted = [...samples].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const windows: SleepWindow[] = [];
  for (let start = nightStart.getTime(); start < nightEnd.getTime(); start += windowMs) {
    const end = Math.min(start + windowMs, nightEnd.getTime());
    const inWindow = sorted.filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= start && t < end;
    });

    if (inWindow.length === 0) {
      windows.push({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        screenActivity: 0,
        touchActivity: 0,
        motionActivity: 0,
        appActivity: 0,
        charging: 0.5,
        sleepProbability: clamp01(1 - GAP_FILL_AWAKE_PROBABILITY),
        awakeProbability: GAP_FILL_AWAKE_PROBABILITY,
        isGapFilled: true,
      });
      continue;
    }

    // Average the real samples that fell in this window.
    const n = inWindow.length;
    const avg = {
      screenActivity: inWindow.reduce((s, x) => s + clamp01(x.screenActivity), 0) / n,
      touchActivity: inWindow.reduce((s, x) => s + clamp01(x.touchActivity), 0) / n,
      motionActivity: inWindow.reduce((s, x) => s + clamp01(x.motionActivity), 0) / n,
      appActivity: inWindow.reduce((s, x) => s + clamp01(x.appActivity), 0) / n,
    };
    const chargingValues = inWindow.map((x) => chargingToNumeric(x.charging));
    const charging = chargingValues.reduce((s, x) => s + x, 0) / chargingValues.length;

    windows.push({
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      ...avg,
      charging,
      sleepProbability: computeSleepProbability(avg),
      awakeProbability: computeAwakeProbability(avg),
      isGapFilled: false,
    });
  }

  return windows;
}
