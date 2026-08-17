// Covers: duration scoring in/out of the age-band target range, the "7
// vs. fewer than 7 nights of history" consistency/regularity scenarios,
// and calculateSleepScore's own missing-data fairness rescale.

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { calculateDurationScore, calculateConsistencyScore, calculateWakeRegularity, calculateSleepScore } from './scores.ts';

const TARGET_MIN = 480; // 8h
const TARGET_MAX = 600; // 10h

Deno.test('calculateDurationScore: full marks anywhere inside the target range', () => {
  assertEquals(calculateDurationScore(480, TARGET_MIN, TARGET_MAX), 100);
  assertEquals(calculateDurationScore(540, TARGET_MIN, TARGET_MAX), 100);
  assertEquals(calculateDurationScore(600, TARGET_MIN, TARGET_MAX), 100);
});

Deno.test('calculateDurationScore: scaled down below the range, floored at 0', () => {
  assertEquals(calculateDurationScore(240, TARGET_MIN, TARGET_MAX), 50); // half of target min
  assertEquals(calculateDurationScore(0, TARGET_MIN, TARGET_MAX), 0);
});

Deno.test('calculateDurationScore: oversleeping also loses points, floored at 0', () => {
  const overslept = calculateDurationScore(TARGET_MAX + 120, TARGET_MIN, TARGET_MAX);
  assert(overslept < 100 && overslept >= 0);
});

Deno.test('calculateConsistencyScore: fewer than 2 nights of history is excluded (null), not defaulted', () => {
  assertEquals(calculateConsistencyScore([]), null);
  assertEquals(calculateConsistencyScore([480]), null);
});

Deno.test('calculateConsistencyScore: identical durations across nights score perfectly consistent', () => {
  assertEquals(calculateConsistencyScore([480, 480, 480]), 100);
});

Deno.test('calculateConsistencyScore: only the last 7 nights are used when more history exists', () => {
  const eightNightsWithOneWildOutlier = [480, 480, 480, 480, 480, 480, 480, 0]; // oldest night (index 0) is wild
  const lastSeven = [480, 480, 480, 480, 480, 480, 0];
  assertEquals(calculateConsistencyScore(eightNightsWithOneWildOutlier), calculateConsistencyScore(lastSeven));
});

Deno.test('calculateConsistencyScore: 7 nights of real variation scores lower than a perfectly steady week', () => {
  const steady = calculateConsistencyScore([480, 480, 480, 480, 480, 480, 480]);
  const variable = calculateConsistencyScore([300, 600, 320, 580, 340, 560, 480]);
  assert((steady ?? 0) > (variable ?? 0));
});

Deno.test('calculateWakeRegularity: fewer than 2 nights is excluded (null)', () => {
  assertEquals(calculateWakeRegularity([420]), null);
});

Deno.test('calculateWakeRegularity: identical wake times score perfectly regular', () => {
  assertEquals(calculateWakeRegularity([420, 420, 420]), 100); // 07:00 every night
});

Deno.test('calculateWakeRegularity: wake times near midnight wrap correctly (23:50 vs 00:10 read as 20min apart, not ~23.5h)', () => {
  const nearMidnight = calculateWakeRegularity([1430, 10, 1435, 5]); // 23:50, 00:10, 23:55, 00:05
  assert((nearMidnight ?? 0) > 80, `expected high regularity across the midnight wrap, got ${nearMidnight}`);
});

Deno.test('calculateSleepScore: missing consistency/regularity are excluded and the remaining weights rescale to /100', () => {
  const full = calculateSleepScore({ durationScore: 100, consistencyScore: 100, regularityScore: 100, confidenceScore: 100 });
  const partial = calculateSleepScore({ durationScore: 100, consistencyScore: null, regularityScore: null, confidenceScore: 100 });
  assertEquals(full, 100);
  assertEquals(partial, 100); // all present inputs are 100, so the rescaled average is still 100
});

Deno.test('calculateSleepScore: all inputs missing returns null rather than a fabricated 0', () => {
  assertEquals(
    calculateSleepScore({ durationScore: null, consistencyScore: null, regularityScore: null, confidenceScore: null }),
    null
  );
});
