import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { calculateDailyScore, calculateStepsScore } from './dailyScore.ts';

Deno.test('calculateDailyScore: 40/30/20/10 weighting when all four inputs are present', () => {
  // 100*0.4 + 50*0.3 + 100*0.2 + 0*0.1 = 40 + 15 + 20 + 0 = 75
  const score = calculateDailyScore({ activityScore: 100, sleepScore: 50, stepsScore: 100, consistencyScore: 0 });
  assertEquals(score, 75);
});

Deno.test('calculateDailyScore: a missing input is excluded from both earned and possible totals, not defaulted to 0', () => {
  // Only activityScore(40%) + sleepScore(30%) present -> rescaled to /70 -> equivalent to a straight weighted average of the two.
  const score = calculateDailyScore({ activityScore: 100, sleepScore: 50, stepsScore: null, consistencyScore: null });
  const expected = Math.round((100 * 0.4 + 50 * 0.3) / 0.7);
  assertEquals(score, expected);
});

Deno.test('calculateDailyScore: all inputs missing returns null, never a fabricated 0', () => {
  assertEquals(calculateDailyScore({ activityScore: null, sleepScore: null, stepsScore: null, consistencyScore: null }), null);
});

Deno.test('calculateStepsScore: ratio of steps to goal, clamped 0-100', () => {
  assertEquals(calculateStepsScore(5000, 10000), 50);
  assertEquals(calculateStepsScore(15000, 10000), 100); // clamped, doesn't reward over-walking beyond 100
  assertEquals(calculateStepsScore(0, 10000), 0);
  assertEquals(calculateStepsScore(100, 0), 0); // no goal set — never divide by zero
});
