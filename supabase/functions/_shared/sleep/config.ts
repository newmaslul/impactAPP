// Pure config helpers — no DB access here (that's service.ts's job, same
// split as _shared/scoring/engine.ts vs service.ts). Defaults mirror the
// seeded rows in migration 0003_sleep.sql so a caller with no DB access
// yet (e.g. a unit test) still gets sane values.

import type { AgeBand, SleepConfigValues } from './types.ts';

export const DEFAULT_SLEEP_CONFIG: SleepConfigValues = {
  sleepProbabilityThreshold: 0.75,
  minSleepWindows: 4,
  windowSizeMinutes: 5,
  awakeProbabilityThreshold: 0.60,
  minAwakeWindows: 2,
};

export const DEFAULT_AGE_BANDS: AgeBand[] = [
  { minAge: 6, maxAge: 12, targetMinHours: 9, targetMaxHours: 12 },
  { minAge: 13, maxAge: 18, targetMinHours: 8, targetMaxHours: 10 },
  { minAge: 19, maxAge: 120, targetMinHours: 7, targetMaxHours: 9 },
];

/**
 * Falls back to the 13-18 band (the elaborate spec's primary framing)
 * when age is unknown, since `users.age` is optional and a student with
 * no age set is more likely a minor than an adult.
 */
export function findAgeBand(age: number | null | undefined, bands: AgeBand[] = DEFAULT_AGE_BANDS): AgeBand {
  return (
    (age != null ? bands.find((b) => age >= b.minAge && age <= b.maxAge) : undefined) ??
    bands.find((b) => b.minAge === 13 && b.maxAge === 18) ??
    bands[0]
  );
}

/**
 * §11 gives a range per age band, not a single target — this
 * implementation's documented interpretation is the midpoint of that
 * range, in minutes.
 */
export function getTargetSleepMinutes(age: number | null | undefined, bands: AgeBand[] = DEFAULT_AGE_BANDS): number {
  const band = findAgeBand(age, bands);
  const midpointHours = (band.targetMinHours + band.targetMaxHours) / 2;
  return Math.round(midpointHours * 60);
}
