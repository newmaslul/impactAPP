import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeAwakeProbability, computeSleepProbability, bucketSamplesIntoWindows } from './windows.ts';
import type { SleepSample } from './types.ts';

Deno.test('computeAwakeProbability/computeSleepProbability: complementary and clamped 0..1', () => {
  const stillPhone = { screenActivity: 0, touchActivity: 0, motionActivity: 0, appActivity: 0 };
  const activePhone = { screenActivity: 1, touchActivity: 1, motionActivity: 1, appActivity: 1 };

  assertEquals(computeAwakeProbability(stillPhone), 0);
  assertEquals(computeSleepProbability(stillPhone), 1);
  assertEquals(computeAwakeProbability(activePhone), 1);
  assertEquals(computeSleepProbability(activePhone), 0);
  assertEquals(
    computeAwakeProbability(stillPhone) + computeSleepProbability(stillPhone),
    1
  );
});

Deno.test('computeAwakeProbability: phone-use signals (screen/touch/app) outweigh motion alone', () => {
  const motionOnly = { screenActivity: 0, touchActivity: 0, motionActivity: 1, appActivity: 0 };
  const screenOnly = { screenActivity: 1, touchActivity: 0, motionActivity: 0, appActivity: 0 };
  assert(computeAwakeProbability(screenOnly) > computeAwakeProbability(motionOnly));
});

Deno.test('bucketSamplesIntoWindows: gap-filled windows are low-activity, sleep-favoring, and flagged', () => {
  const nightStart = new Date('2026-01-01T18:00:00.000Z');
  const nightEnd = new Date('2026-01-01T18:15:00.000Z'); // 3 windows @ 5min, no samples
  const windows = bucketSamplesIntoWindows([], nightStart, nightEnd, 5);

  assertEquals(windows.length, 3);
  for (const w of windows) {
    assert(w.isGapFilled);
    assert(w.sleepProbability > w.awakeProbability);
  }
});

Deno.test('bucketSamplesIntoWindows: a real high-activity sample produces a high-awake, non-gap window', () => {
  const nightStart = new Date('2026-01-01T18:00:00.000Z');
  const nightEnd = new Date('2026-01-01T18:05:00.000Z');
  const samples: SleepSample[] = [
    {
      timestamp: '2026-01-01T18:02:00.000Z',
      screenActivity: 1,
      touchActivity: 1,
      motionActivity: 0.5,
      appActivity: 0,
      charging: null,
      source: 'phone_sensor',
    },
  ];
  const windows = bucketSamplesIntoWindows(samples, nightStart, nightEnd, 5);
  assertEquals(windows.length, 1);
  assertEquals(windows[0].isGapFilled, false);
  assert(windows[0].awakeProbability > 0.5);
});
