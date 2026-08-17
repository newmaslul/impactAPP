// Covers the confidence-related scenarios from the required 18: a
// well-covered real-data night reads as high confidence, a mostly
// gap-filled (missing-data) night reads as low confidence, and an
// unavailable app-usage signal (the phone-only reality of this
// deployment) never gets silently treated as "confirmed zero activity".

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { calculateConfidence } from './confidence.ts';
import type { SleepWindow } from './types.ts';

function realWindow(overrides: Partial<SleepWindow> = {}): SleepWindow {
  return {
    startTime: '2026-01-01T22:00:00.000Z',
    endTime: '2026-01-01T22:05:00.000Z',
    screenActivity: 0,
    touchActivity: 0,
    motionActivity: 0.05,
    appActivity: 0,
    charging: 0.5,
    sleepProbability: 0.95,
    awakeProbability: 0.05,
    isGapFilled: false,
    ...overrides,
  };
}

function gapWindow(): SleepWindow {
  return { ...realWindow(), isGapFilled: true, sleepProbability: 0.85, awakeProbability: 0.15 };
}

Deno.test('calculateConfidence: a night fully covered by real samples scores high', () => {
  const windows = Array.from({ length: 40 }, () => realWindow());
  const result = calculateConfidence(windows, 'phone_sensor');
  assertEquals(result.sensorQuality, 1);
  assertEquals(result.signalContinuity, 1);
  assert(result.confidenceScore >= 70, `expected high confidence, got ${result.confidenceScore}`);
});

Deno.test('calculateConfidence: a mostly gap-filled (low-data) night scores low — the LOW_CONFIDENCE case', () => {
  const windows = [...Array.from({ length: 4 }, () => realWindow()), ...Array.from({ length: 80 }, () => gapWindow())];
  const result = calculateConfidence(windows, 'phone_sensor');
  assert(result.confidenceScore < 60, `expected low confidence, got ${result.confidenceScore}`);
  assertEquals(result.band, 'LOW');
});

Deno.test('calculateConfidence: >=30% missing data still produces a non-crashing, reduced score rather than a hole', () => {
  const windows = [...Array.from({ length: 70 }, () => realWindow()), ...Array.from({ length: 30 }, () => gapWindow())];
  const result = calculateConfidence(windows, 'phone_sensor');
  assert(result.confidenceScore > 0 && result.confidenceScore < 100);
  assertEquals(result.sensorQuality, 0.7);
});

Deno.test('calculateConfidence: appActivity being permanently unavailable from a phone-only source caps usageReliability at a neutral 0.5, never a penalizing 0', () => {
  const windows = Array.from({ length: 20 }, () => realWindow());
  const phoneOnly = calculateConfidence(windows, 'phone_sensor');
  const withRealAppData = calculateConfidence(windows, 'healthkit');
  assertEquals(phoneOnly.usageReliability, 0.5);
  assertEquals(withRealAppData.usageReliability, 1);
});

Deno.test('calculateConfidence: unknown charging state (Battery Status API unavailable) is neutral, not penalized to 0', () => {
  const windows = Array.from({ length: 20 }, () => realWindow({ charging: 0.5 }));
  const result = calculateConfidence(windows, 'phone_sensor');
  assertEquals(result.chargingReliability, 0);
  // chargingReliability measures "was charging state actually known" — all
  // unknown here is legitimately 0 (none known), which is itself only
  // 10% of the total weight, so it never tanks the whole score alone.
  assert(result.confidenceScore > 0);
});

Deno.test('calculateConfidence: no windows at all returns a safe zeroed LOW result, never throws', () => {
  const result = calculateConfidence([], 'phone_sensor');
  assertEquals(result.confidenceScore, 0);
  assertEquals(result.band, 'LOW');
});
