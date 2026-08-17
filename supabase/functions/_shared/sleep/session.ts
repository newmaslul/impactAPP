// Consecutive-window run detection for sleep onset / wake, movementOnly
// handling, and duration math. Pure function of a night's SleepWindow[] —
// no I/O, fully unit-testable.
//
// Thresholds (sleep-onset ≥0.75 probability for ≥4 consecutive windows =
// 20 minutes at the default 5-minute window size; wake ≥0.60 awake
// probability AND at least one of screen/touch/app ≥0.30, for ≥2
// consecutive windows = 10 minutes) come from sleep_config and are passed
// in rather than hardcoded, so an admin change takes effect without a
// code change — same pattern as scoring_config.

import type { AwakePeriod, SleepConfigValues, SleepSessionResult, SleepWindow } from './types.ts';

const PHONE_USE_THRESHOLD = 0.30; // §7: wake needs sustained awake probability AND real phone use, not motion alone
const MOVEMENT_ONLY_MOTION_THRESHOLD = 0.60;
const MOVEMENT_ONLY_USE_CEILING = 0.10;

function isMovementOnly(w: SleepWindow): boolean {
  return (
    w.motionActivity > MOVEMENT_ONLY_MOTION_THRESHOLD &&
    w.screenActivity < MOVEMENT_ONLY_USE_CEILING &&
    w.touchActivity < MOVEMENT_ONLY_USE_CEILING &&
    w.appActivity < MOVEMENT_ONLY_USE_CEILING
  );
}

function hasPhoneUse(w: SleepWindow): boolean {
  return w.screenActivity >= PHONE_USE_THRESHOLD || w.touchActivity >= PHONE_USE_THRESHOLD || w.appActivity >= PHONE_USE_THRESHOLD;
}

function isSleepWindow(w: SleepWindow, threshold: number): boolean {
  return w.sleepProbability >= threshold;
}

// A "real" wake window per §7: sustained high awake probability AND
// actual phone use — motion alone (movementOnly) never qualifies, so
// rolling over in bed doesn't get misread as waking up.
function isWakeWindow(w: SleepWindow, threshold: number): boolean {
  return w.awakeProbability >= threshold && hasPhoneUse(w) && !isMovementOnly(w);
}

interface Run {
  startIndex: number;
  endIndex: number; // exclusive
}

function findRuns(windows: SleepWindow[], predicate: (w: SleepWindow) => boolean, minLength: number, fromIndex = 0): Run[] {
  const runs: Run[] = [];
  let runStart: number | null = null;
  for (let i = fromIndex; i <= windows.length; i++) {
    const match = i < windows.length && predicate(windows[i]);
    if (match) {
      if (runStart === null) runStart = i;
    } else if (runStart !== null) {
      if (i - runStart >= minLength) runs.push({ startIndex: runStart, endIndex: i });
      runStart = null;
    }
  }
  return runs;
}

function minutesBetween(windows: SleepWindow[], startIndex: number, endIndex: number): number {
  if (windows.length === 0) return 0;
  const start = new Date(windows[startIndex].startTime).getTime();
  const end = new Date(windows[Math.min(endIndex, windows.length) - 1]?.endTime ?? windows[startIndex].endTime).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

const EMPTY_RESULT: SleepSessionResult = {
  sleepStart: null,
  sleepEnd: null,
  timeInBedMinutes: 0,
  estimatedSleepMinutes: 0,
  awakeMinutes: 0,
  interruptions: 0,
  awakePeriods: [],
};

export function calculateSleepSession(windows: SleepWindow[], config: SleepConfigValues): SleepSessionResult {
  if (!windows.length) return { ...EMPTY_RESULT };

  const sleepRuns = findRuns(windows, (w) => isSleepWindow(w, config.sleepProbabilityThreshold), config.minSleepWindows);
  if (sleepRuns.length === 0) {
    // §21 edge case: no qualifying sleep run found (e.g. no-data night, or
    // a night with too little low-activity signal to detect onset at all).
    return { ...EMPTY_RESULT };
  }

  const onset = sleepRuns[0];
  const sleepStartIndex = onset.startIndex;
  const sleepStart = windows[sleepStartIndex].startTime;

  const awakePeriods: AwakePeriod[] = [];
  let cursor = onset.endIndex;
  let sleepEndIndex: number | null = null;

  while (cursor < windows.length) {
    const wakeRuns = findRuns(windows, (w) => isWakeWindow(w, config.awakeProbabilityThreshold), config.minAwakeWindows, cursor);
    if (wakeRuns.length === 0) {
      // No further qualifying wake run — sleep is considered ongoing
      // through the rest of the observed data (§21: data ends before a
      // clean wake is detected, e.g. the observation window itself ends
      // mid-sleep).
      break;
    }

    const wake = wakeRuns[0];
    // Does sleep resume after this awake run? Look for another qualifying
    // sleep run starting at or after the awake run's end.
    const resumeRuns = findRuns(windows, (w) => isSleepWindow(w, config.sleepProbabilityThreshold), config.minSleepWindows, wake.endIndex);

    if (resumeRuns.length > 0) {
      // An interruption within the night, not the final wake.
      awakePeriods.push({
        start: windows[wake.startIndex].startTime,
        end: windows[wake.endIndex - 1].endTime,
        movementOnly: false,
      });
      cursor = resumeRuns[0].endIndex;
      continue;
    }

    // No sleep resumes after this — this is the final wake.
    sleepEndIndex = wake.startIndex;
    break;
  }

  const sleepEnd = sleepEndIndex !== null ? windows[sleepEndIndex].startTime : null;
  const observedEndIndex = sleepEndIndex ?? windows.length;

  const timeInBedMinutes = minutesBetween(windows, sleepStartIndex, observedEndIndex);
  const awakeMinutes = awakePeriods.reduce((sum, period) => {
    const startIdx = windows.findIndex((w) => w.startTime === period.start);
    const endIdx = windows.findIndex((w) => w.endTime === period.end) + 1;
    if (startIdx < 0 || endIdx <= 0) return sum;
    return sum + minutesBetween(windows, startIdx, endIdx);
  }, 0);

  // Never negative — a sleep session can't have more awake time counted
  // against it than the time it spans (§9).
  const estimatedSleepMinutes = Math.max(0, timeInBedMinutes - awakeMinutes);

  // Also record movementOnly stretches inside the sleep span for
  // observability, even though they never break the session or count as
  // interruptions (§8) — useful for the confidence/consistency layers and
  // for debugging, without affecting duration math.
  const movementOnlyRuns = findRuns(windows.slice(sleepStartIndex, observedEndIndex), isMovementOnly, 1).map((r) => ({
    start: windows[sleepStartIndex + r.startIndex].startTime,
    end: windows[sleepStartIndex + r.endIndex - 1].endTime,
    movementOnly: true,
  }));

  return {
    sleepStart,
    sleepEnd,
    timeInBedMinutes,
    estimatedSleepMinutes,
    awakeMinutes,
    interruptions: awakePeriods.length,
    awakePeriods: [...awakePeriods, ...movementOnlyRuns].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
  };
}
