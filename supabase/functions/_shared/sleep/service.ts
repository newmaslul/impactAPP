// Postgres-backed orchestration for the sleep pipeline — mirrors
// _shared/scoring/service.ts's shape exactly: pure logic lives in
// windows.ts/session.ts/confidence.ts/scores.ts/dailyScore.ts, this file
// is the only place that talks to the database.

import { supabaseAdmin } from '../supabaseAdmin.ts';
import { parseDate, formatDate, addDays, todayStr } from '../scoring/dates.ts';
import { getSummary as getActivitySummary } from '../scoring/service.ts';
import { DEFAULT_SLEEP_CONFIG, DEFAULT_AGE_BANDS, findAgeBand } from './config.ts';
import { bucketSamplesIntoWindows } from './windows.ts';
import { calculateSleepSession } from './session.ts';
import { calculateConfidence } from './confidence.ts';
import { calculateDurationScore, calculateConsistencyScore, calculateWakeRegularity, calculateSleepScore } from './scores.ts';
import { calculateDailyScore, calculateStepsScore } from './dailyScore.ts';
import type { AgeBand, SleepConfigValues, SleepSample, SleepSource } from './types.ts';

export async function getEffectiveSleepConfig(dateStr: string): Promise<SleepConfigValues & { id: number }> {
  const { data, error } = await supabaseAdmin
    .from('sleep_config')
    .select('*')
    .lte('effective_from', dateStr)
    .order('effective_from', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { id: 0, ...DEFAULT_SLEEP_CONFIG };
  return {
    id: data.id,
    sleepProbabilityThreshold: Number(data.sleep_probability_threshold),
    minSleepWindows: data.min_sleep_windows,
    windowSizeMinutes: data.window_size_minutes,
    awakeProbabilityThreshold: Number(data.awake_probability_threshold),
    minAwakeWindows: data.min_awake_windows,
  };
}

export async function getAgeBands(): Promise<AgeBand[]> {
  const { data, error } = await supabaseAdmin.from('sleep_age_bands').select('*').order('min_age', { ascending: true });
  if (error) throw error;
  if (!data?.length) return DEFAULT_AGE_BANDS;
  return data.map((b: any) => ({
    minAge: b.min_age,
    maxAge: b.max_age,
    targetMinHours: Number(b.target_min_hours),
    targetMaxHours: Number(b.target_max_hours),
  }));
}

/**
 * There's no per-user timezone stored yet, so "the night belonging to
 * date D" is defined in UTC as D-1 18:00 to D 12:00 — wide enough to
 * cover a normal evening-to-morning sleep window without needing a
 * timezone field on `users`. Documented limitation, not a silent
 * assumption: a user in a very different UTC offset than this window
 * assumes may see their session mis-bucketed a day off, or a session
 * that only partially fits the window on stored data.
 */
function getNightRange(dateStr: string): { nightStart: Date; nightEnd: Date } {
  const date = parseDate(dateStr);
  const nightStart = new Date(addDays(date, -1));
  nightStart.setUTCHours(18, 0, 0, 0);
  const nightEnd = new Date(date);
  nightEnd.setUTCHours(12, 0, 0, 0);
  return { nightStart, nightEnd };
}

export async function ingestSleepSamples(userId: number, samples: SleepSample[]) {
  if (!samples.length) return;
  const rows = samples.map((s) => ({
    user_id: userId,
    timestamp: s.timestamp,
    screen_activity: s.screenActivity,
    touch_activity: s.touchActivity,
    motion_activity: s.motionActivity,
    app_activity: s.appActivity,
    charging: s.charging,
    source: s.source,
  }));
  const { error } = await supabaseAdmin.from('sleep_raw_samples').insert(rows);
  if (error) throw error;
}

async function getRawSamplesForNight(userId: number, dateStr: string): Promise<SleepSample[]> {
  const { nightStart, nightEnd } = getNightRange(dateStr);
  const { data, error } = await supabaseAdmin
    .from('sleep_raw_samples')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', nightStart.toISOString())
    .lt('timestamp', nightEnd.toISOString())
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    timestamp: r.timestamp,
    screenActivity: Number(r.screen_activity),
    touchActivity: Number(r.touch_activity),
    motionActivity: Number(r.motion_activity),
    appActivity: Number(r.app_activity),
    charging: r.charging,
    source: r.source as SleepSource,
  }));
}

async function deleteRawSamplesForNight(userId: number, dateStr: string) {
  const { nightStart, nightEnd } = getNightRange(dateStr);
  // Privacy minimization (§18): raw samples are only needed to compute
  // the session once — after scoring, only the aggregated sleep_sessions
  // row is kept long-term.
  const { error } = await supabaseAdmin
    .from('sleep_raw_samples')
    .delete()
    .eq('user_id', userId)
    .gte('timestamp', nightStart.toISOString())
    .lt('timestamp', nightEnd.toISOString());
  if (error) throw error;
}

async function getUserAge(userId: number): Promise<number | null> {
  const { data, error } = await supabaseAdmin.from('users').select('age').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data?.age ?? null;
}

async function getRecentSleepSessions(userId: number, beforeDateStr: string, nights = 7) {
  const start = formatDate(addDays(parseDate(beforeDateStr), -nights));
  const { data, error } = await supabaseAdmin
    .from('sleep_sessions')
    .select('date, sleep_end, estimated_sleep_minutes')
    .eq('user_id', userId)
    .gte('date', start)
    .lt('date', beforeDateStr)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function wakeTimeMinutesSinceMidnight(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * The confidence gate (§22): below 60 no normal score is shown at all
 * (LOW_CONFIDENCE), 60-74 is a labeled estimate, 75+ reads as GOOD. This
 * status governs what the UI is allowed to present — a low-confidence
 * night must never render a bare, seemingly-precise number.
 */
function statusFromConfidence(confidenceScore: number): 'LOW_CONFIDENCE' | 'ESTIMATED' | 'GOOD' {
  if (confidenceScore < 60) return 'LOW_CONFIDENCE';
  if (confidenceScore < 75) return 'ESTIMATED';
  return 'GOOD';
}

/** Runs the full window→session→score pipeline for one night and upserts sleep_sessions. */
export async function recomputeSleepSession(userId: number, dateStr: string) {
  const [config, ageBands, age, samples] = await Promise.all([
    getEffectiveSleepConfig(dateStr),
    getAgeBands(),
    getUserAge(userId),
    getRawSamplesForNight(userId, dateStr),
  ]);

  const { nightStart, nightEnd } = getNightRange(dateStr);
  const windows = bucketSamplesIntoWindows(samples, nightStart, nightEnd, config.windowSizeMinutes);
  const session = calculateSleepSession(windows, config);

  // Majority source among real (non-gap) samples — falls back to
  // 'phone_sensor' (the only source this deployment can actually collect
  // today) when there were no real samples at all.
  const source: SleepSource =
    samples.length > 0
      ? (Object.entries(
          samples.reduce((acc: Record<string, number>, s) => {
            acc[s.source] = (acc[s.source] ?? 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0][0] as SleepSource)
      : 'phone_sensor';

  const confidence = calculateConfidence(windows, source);
  const status = statusFromConfidence(confidence.confidenceScore);

  const band = findAgeBand(age, ageBands);
  const targetMinMinutes = Math.round(band.targetMinHours * 60);
  const targetMaxMinutes = Math.round(band.targetMaxHours * 60);
  const durationScore = calculateDurationScore(session.estimatedSleepMinutes, targetMinMinutes, targetMaxMinutes);

  const history = await getRecentSleepSessions(userId, dateStr);
  const recentDurations = history.map((h: any) => h.estimated_sleep_minutes).filter((n: number) => n > 0);
  const recentWakeTimes = history
    .map((h: any) => wakeTimeMinutesSinceMidnight(h.sleep_end))
    .filter((n: number | null): n is number => n != null);

  const consistencyScore = calculateConsistencyScore(recentDurations);
  const regularityScore = calculateWakeRegularity(recentWakeTimes);

  const sleepScore = calculateSleepScore({
    durationScore,
    consistencyScore,
    regularityScore,
    confidenceScore: confidence.confidenceScore,
  });

  const { error } = await supabaseAdmin.from('sleep_sessions').upsert(
    {
      user_id: userId,
      date: dateStr,
      sleep_start: session.sleepStart,
      sleep_end: session.sleepEnd,
      time_in_bed_minutes: session.timeInBedMinutes,
      estimated_sleep_minutes: session.estimatedSleepMinutes,
      awake_minutes: session.awakeMinutes,
      interruptions: session.interruptions,
      source,
      confidence_score: confidence.confidenceScore,
      duration_score: durationScore,
      // Genuinely null (not 0) when there isn't enough history yet — a
      // stored 0 here would be silently read back as "perfectly
      // inconsistent" instead of "unknown", corrupting the same
      // missing-data fairness rule the rest of the scoring engine relies
      // on (see migration 0004_sleep_nullable_scores.sql).
      consistency_score: consistencyScore,
      regularity_score: regularityScore,
      sleep_score: sleepScore,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;

  // Only the aggregated row above is kept — raw samples for this night
  // are no longer needed once scored (§18 minimization). Only clear
  // nights that are actually finished (not today's still-accumulating
  // samples), so a session isn't wiped mid-collection.
  if (dateStr < todayStr()) {
    await deleteRawSamplesForNight(userId, dateStr);
  }

  return getSleepSession(userId, dateStr);
}

export async function getSleepSession(userId: number, dateStr: string) {
  const { data, error } = await supabaseAdmin
    .from('sleep_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSleepHistory(userId: number, days: number) {
  const start = formatDate(addDays(parseDate(todayStr()), -days));
  const { data, error } = await supabaseAdmin
    .from('sleep_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Combines the sleep session with the existing activity summary into the
 * new top-level Daily Score (§16) and persists it onto daily_scores.
 * Mirrors _shared/scoring/service.ts's getSummary: always recomputes
 * live so it reflects the latest synced data, rather than serving a
 * possibly-stale cached row.
 */
export async function getSleepSummary(userId: number, dateStr: string = todayStr()) {
  const [session, activitySummary] = await Promise.all([
    recomputeSleepSession(userId, dateStr),
    getActivitySummary(userId, dateStr),
  ]);

  const activityScore = activitySummary.today?.activity_score ?? null;
  const stepsValue = activitySummary.today?.steps_value ?? null;
  const { data: scoringConfigRow } = await supabaseAdmin
    .from('scoring_config')
    .select('steps_goal')
    .lte('effective_from', dateStr)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  const stepsGoal = scoringConfigRow?.steps_goal ?? null;
  const stepsScore = stepsValue != null && stepsGoal ? calculateStepsScore(stepsValue, stepsGoal) : null;

  const dailyScore = calculateDailyScore({
    activityScore,
    sleepScore: session?.sleep_score ?? null,
    stepsScore,
    consistencyScore: session?.consistency_score ?? null,
  });

  const { error } = await supabaseAdmin
    .from('daily_scores')
    .update({ daily_score: dailyScore })
    .eq('user_id', userId)
    .eq('date', dateStr);
  if (error) throw error;

  return { session, activityScore, stepsScore, dailyScore };
}

export async function updateSleepConfig(body: any, currentConfig: SleepConfigValues) {
  const next = {
    sleep_probability_threshold: body.sleep_probability_threshold ?? currentConfig.sleepProbabilityThreshold,
    min_sleep_windows: body.min_sleep_windows ?? currentConfig.minSleepWindows,
    window_size_minutes: body.window_size_minutes ?? currentConfig.windowSizeMinutes,
    awake_probability_threshold: body.awake_probability_threshold ?? currentConfig.awakeProbabilityThreshold,
    min_awake_windows: body.min_awake_windows ?? currentConfig.minAwakeWindows,
  };
  const { data, error } = await supabaseAdmin
    .from('sleep_config')
    .insert({ effective_from: body.effective_from || todayStr(), ...next })
    .select()
    .single();
  if (error) throw error;
  return data;
}
