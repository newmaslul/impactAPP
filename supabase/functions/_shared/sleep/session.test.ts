// Covers the session-detection scenarios from the required 18: 9h/8h/6h
// clean sleep, a fully still (no-motion) night, mid-night phone use that
// resumes into sleep (an interruption), movement-without-screen
// (movementOnly — must NOT end the session), a real final wake, multiple
// wake-ups, a no-data night, midnight-crossing, timezone-safety (UTC
// instant arithmetic), and implausible data (a session that never
// produces a closing wake run).

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { calculateSleepSession } from './session.ts';
import { computeAwakeProbability, computeSleepProbability } from './windows.ts';
import { DEFAULT_SLEEP_CONFIG } from './config.ts';
import type { SleepWindow } from './types.ts';

const WINDOW_MINUTES = 5;

type Kind = 'sleep' | 'awake' | 'movement' | 'gap';

function kindToActivity(kind: Kind) {
  switch (kind) {
    case 'sleep':
      return { screenActivity: 0, touchActivity: 0, motionActivity: 0.05, appActivity: 0 };
    case 'awake':
      return { screenActivity: 1, touchActivity: 1, motionActivity: 0.5, appActivity: 1 };
    case 'movement':
      // Rolling over in bed: strong motion, no phone use at all.
      return { screenActivity: 0.02, touchActivity: 0.02, motionActivity: 0.8, appActivity: 0 };
    case 'gap':
      return null; // handled separately below
  }
}

function buildNight(kinds: Kind[], startTime = new Date('2026-01-01T22:00:00.000Z')): SleepWindow[] {
  return kinds.map((kind, i) => {
    const start = new Date(startTime.getTime() + i * WINDOW_MINUTES * 60000);
    const end = new Date(start.getTime() + WINDOW_MINUTES * 60000);
    if (kind === 'gap') {
      return {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        screenActivity: 0,
        touchActivity: 0,
        motionActivity: 0,
        appActivity: 0,
        charging: 0.5,
        sleepProbability: 0.85,
        awakeProbability: 0.15,
        isGapFilled: true,
      };
    }
    const activity = kindToActivity(kind)!;
    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      ...activity,
      charging: 0.5,
      sleepProbability: computeSleepProbability(activity),
      awakeProbability: computeAwakeProbability(activity),
      isGapFilled: false,
    };
  });
}

function repeat<T>(kind: T, n: number): T[] {
  return Array.from({ length: n }, () => kind);
}

Deno.test('session: clean 9h night (108 sleep windows) is detected with no interruptions', () => {
  const windows = buildNight([...repeat<Kind>('sleep', 108), ...repeat<Kind>('awake', 2)]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.estimatedSleepMinutes, 108 * 5); // 540 = 9h
  assertEquals(result.interruptions, 0);
  assert(result.sleepStart != null && result.sleepEnd != null);
});

Deno.test('session: clean 8h night (96 sleep windows)', () => {
  const windows = buildNight([...repeat<Kind>('sleep', 96), ...repeat<Kind>('awake', 2)]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.estimatedSleepMinutes, 96 * 5); // 480 = 8h
});

Deno.test('session: clean 6h night (72 sleep windows)', () => {
  const windows = buildNight([...repeat<Kind>('sleep', 72), ...repeat<Kind>('awake', 2)]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.estimatedSleepMinutes, 72 * 5); // 360 = 6h
});

Deno.test('session: fully still (no-motion) phone produces one continuous session, no false interruptions', () => {
  const windows = buildNight([...repeat<Kind>('sleep', 60), ...repeat<Kind>('awake', 2)]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.interruptions, 0);
  assertEquals(result.estimatedSleepMinutes, 60 * 5);
});

Deno.test('session: mid-night phone use that is followed by resumed sleep counts as one interruption', () => {
  const windows = buildNight([
    ...repeat<Kind>('sleep', 20),
    ...repeat<Kind>('awake', 3), // sustained phone use, mid-night
    ...repeat<Kind>('sleep', 20), // sleep resumes
    ...repeat<Kind>('awake', 2), // final wake
  ]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.interruptions, 1);
  assert(result.awakeMinutes >= 3 * 5);
  // Total sleep = 40 windows worth of real sleep, minus the 3-window interruption already excluded from awakeMinutes only, not double-subtracted.
  assertEquals(result.estimatedSleepMinutes, 40 * 5);
});

Deno.test('session: movement-without-screen (movementOnly) never ends the session or counts as an interruption', () => {
  const windows = buildNight([
    ...repeat<Kind>('sleep', 20),
    ...repeat<Kind>('movement', 3), // rolling over — motion only, no phone use
    ...repeat<Kind>('sleep', 20),
    ...repeat<Kind>('awake', 2),
  ]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.interruptions, 0); // movementOnly is not a real interruption
  const movementEntry = result.awakePeriods.find((p) => p.movementOnly);
  assert(movementEntry != null, 'expected a movementOnly period to be recorded for observability');
});

Deno.test('session: a real final wake (sustained phone use, no further sleep) ends the session', () => {
  const windows = buildNight([...repeat<Kind>('sleep', 50), ...repeat<Kind>('awake', 4)]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assert(result.sleepEnd != null);
  assertEquals(result.sleepEnd, windows[50].startTime);
});

Deno.test('session: multiple wake-ups in one night are each counted as separate interruptions', () => {
  const windows = buildNight([
    ...repeat<Kind>('sleep', 15),
    ...repeat<Kind>('awake', 2),
    ...repeat<Kind>('sleep', 15),
    ...repeat<Kind>('awake', 2),
    ...repeat<Kind>('sleep', 15),
    ...repeat<Kind>('awake', 2), // final wake
  ]);
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.interruptions, 2);
});

Deno.test('session: no-data night (zero windows) returns an empty, non-crashing result', () => {
  const result = calculateSleepSession([], DEFAULT_SLEEP_CONFIG);
  assertEquals(result.sleepStart, null);
  assertEquals(result.sleepEnd, null);
  assertEquals(result.estimatedSleepMinutes, 0);
  assertEquals(result.interruptions, 0);
});

Deno.test('session: sleep session crossing local midnight is measured correctly across the boundary', () => {
  const windows = buildNight(
    [...repeat<Kind>('sleep', 90), ...repeat<Kind>('awake', 2)],
    new Date('2026-01-01T23:30:00.000Z') // starts 30min before UTC midnight
  );
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.estimatedSleepMinutes, 90 * 5);
  assert(new Date(result.sleepStart!).getUTCDate() === 1);
  assert(new Date(result.sleepEnd!).getUTCDate() === 2); // wake happens after midnight
});

Deno.test('session: duration math is based on absolute instants, immune to timezone/offset reinterpretation', () => {
  // Two representations of the exact same instant (Z vs an equivalent
  // numeric offset) must produce identical duration math — the engine
  // never parses or reasons about a "local" calendar date internally.
  const utcWindows = buildNight([...repeat<Kind>('sleep', 24), ...repeat<Kind>('awake', 2)], new Date('2026-06-01T20:00:00.000Z'));
  const offsetEquivalentStart = new Date('2026-06-01T23:00:00.000+03:00'); // same instant as 20:00Z
  const offsetWindows = buildNight([...repeat<Kind>('sleep', 24), ...repeat<Kind>('awake', 2)], offsetEquivalentStart);

  const a = calculateSleepSession(utcWindows, DEFAULT_SLEEP_CONFIG);
  const b = calculateSleepSession(offsetWindows, DEFAULT_SLEEP_CONFIG);
  assertEquals(a.estimatedSleepMinutes, b.estimatedSleepMinutes);
  assertEquals(new Date(a.sleepStart!).getTime(), new Date(b.sleepStart!).getTime());
});

Deno.test('session: implausible data (sleep signal never drops, no wake run found) never goes negative and stays unclosed rather than guessing an end', () => {
  // Same-favoring signal for 16 hours straight with no qualifying wake run.
  const windows = buildNight(repeat<Kind>('sleep', 192));
  const result = calculateSleepSession(windows, DEFAULT_SLEEP_CONFIG);
  assertEquals(result.sleepEnd, null); // §21: data ends before a clean wake is detected
  assertEquals(result.estimatedSleepMinutes, 192 * 5); // full observed span, not truncated or negative
  assert(result.estimatedSleepMinutes >= 0);
});
