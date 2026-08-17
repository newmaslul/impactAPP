import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { findAgeBand, getTargetSleepMinutes, DEFAULT_AGE_BANDS } from './config.ts';

Deno.test('findAgeBand: picks the band containing the given age', () => {
  assertEquals(findAgeBand(9), DEFAULT_AGE_BANDS[0]); // 6-12
  assertEquals(findAgeBand(15), DEFAULT_AGE_BANDS[1]); // 13-18
  assertEquals(findAgeBand(30), DEFAULT_AGE_BANDS[2]); // 19-120
});

Deno.test('findAgeBand: falls back to the 13-18 band when age is unknown', () => {
  assertEquals(findAgeBand(null), DEFAULT_AGE_BANDS[1]);
  assertEquals(findAgeBand(undefined), DEFAULT_AGE_BANDS[1]);
});

Deno.test('getTargetSleepMinutes: midpoint of the band range, in minutes', () => {
  assertEquals(getTargetSleepMinutes(9), Math.round(((9 + 12) / 2) * 60)); // 6-12 band -> 10.5h -> 630min
  assertEquals(getTargetSleepMinutes(15), Math.round(((8 + 10) / 2) * 60)); // 13-18 band -> 9h -> 540min
  assertEquals(getTargetSleepMinutes(40), Math.round(((7 + 9) / 2) * 60)); // adult band -> 8h -> 480min
});
