// Ported from server/scoring/service.js — same logic, async because
// Postgres calls over supabase-js are async where node:sqlite was
// synchronous. engine.ts/validation.ts are untouched pure functions.

import { supabaseAdmin } from '../supabaseAdmin.ts';
import {
  computeDailyScore,
  computeWeeklyAverage,
  computePreviousWeekAverage,
  computeMonthlyAverage,
  computeStreak,
  computePersonalProgress,
} from './engine.ts';
import { validateReading } from './validation.ts';
import { todayStr, addDays, parseDate, formatDate } from './dates.ts';

export async function getEffectiveConfig(dateStr: string) {
  const { data, error } = await supabaseAdmin
    .from('scoring_config')
    .select('*')
    .lte('effective_from', dateStr)
    .order('effective_from', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * A source reporting a reading for a date replaces its own previous
 * reading for that (user, date, source) rather than accumulating
 * duplicate rows — this is the app's duplicate-prevention mechanism,
 * backed by the unique(user_id,date,source) constraint on the table.
 */
export async function upsertRawMetrics(reading: any) {
  const { error } = await supabaseAdmin.from('raw_daily_metrics').upsert(
    {
      user_id: reading.user_id,
      date: reading.date,
      source: reading.source,
      steps: reading.steps ?? null,
      active_minutes: reading.active_minutes ?? null,
      distance_km: reading.distance_km ?? null,
      vigorous_minutes: reading.vigorous_minutes ?? null,
      active_energy_kcal: reading.active_energy_kcal ?? null,
      sync_batch_id: reading.sync_batch_id ?? null,
      ingested_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date,source' }
  );
  if (error) throw error;
}

/** Merges readings across sources for one day: the max non-null value per
 *  metric wins (a phone and a watch both reporting partial step counts
 *  for the day shouldn't cancel each other out; the fuller reading should). */
async function mergeRawMetricsForDate(userId: number, date: string) {
  const { data, error } = await supabaseAdmin
    .from('raw_daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);
  if (error) throw error;

  const merged: Record<string, number | null> = {
    steps: null, active_minutes: null, distance_km: null, vigorous_minutes: null, active_energy_kcal: null,
  };
  for (const row of data ?? []) {
    for (const key of Object.keys(merged)) {
      if (row[key] != null && (merged[key] == null || row[key] > (merged[key] as number))) merged[key] = row[key];
    }
  }
  return merged;
}

async function getTrailingAverages(userId: number, beforeDateStr: string, days = 7) {
  const before = parseDate(beforeDateStr);
  const start = formatDate(addDays(before, -days));
  const { data, error } = await supabaseAdmin
    .from('daily_scores')
    .select('steps_value, active_minutes_value, distance_value, vigorous_value')
    .eq('user_id', userId)
    .gte('date', start)
    .lt('date', beforeDateStr);
  if (error) throw error;

  const rows = data ?? [];
  const avg = (values: (number | null)[]) => {
    const nums = values.filter((v) => v != null) as number[];
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };
  return {
    steps: avg(rows.map((r) => r.steps_value)),
    active_minutes: avg(rows.map((r) => r.active_minutes_value)),
    distance_km: avg(rows.map((r) => r.distance_value)),
    vigorous_minutes: avg(rows.map((r) => r.vigorous_value)),
  };
}

/** Validates, scores, and persists one user's daily_scores row for a date. */
export async function recomputeDailyScore(userId: number, dateStr: string) {
  const merged = await mergeRawMetricsForDate(userId, dateStr);
  const trailingAverages = await getTrailingAverages(userId, dateStr);
  const { clamped, flags } = validateReading(merged, trailingAverages);
  const config = await getEffectiveConfig(dateStr);
  const { perMetric, rawTotal, maxPossible, activityScore } = computeDailyScore(clamped, config);

  const { error: upsertError } = await supabaseAdmin.from('daily_scores').upsert(
    {
      user_id: userId,
      date: dateStr,
      steps_value: perMetric.steps.value,
      steps_missing: perMetric.steps.missing,
      steps_score: perMetric.steps.score,
      active_minutes_value: perMetric.active_minutes.value,
      active_minutes_missing: perMetric.active_minutes.missing,
      active_minutes_score: perMetric.active_minutes.score,
      distance_value: perMetric.distance_km.value,
      distance_missing: perMetric.distance_km.missing,
      distance_score: perMetric.distance_km.score,
      vigorous_value: perMetric.vigorous_minutes.value,
      vigorous_missing: perMetric.vigorous_minutes.missing,
      vigorous_score: perMetric.vigorous_minutes.score,
      raw_total: rawTotal,
      max_possible: maxPossible,
      activity_score: activityScore,
      scoring_config_id: config.id,
      quality_flags: flags.length ? flags : null,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  );
  if (upsertError) throw upsertError;

  if (flags.length) {
    const events = flags.map((f: any) => ({
      user_id: userId, date: dateStr, metric: f.metric, flag_type: f.flag_type, details: f.details,
    }));
    const { error: eventsError } = await supabaseAdmin.from('data_quality_events').insert(events);
    if (eventsError) throw eventsError;
  }

  return getDailyScore(userId, dateStr);
}

export async function getDailyScore(userId: number, dateStr: string) {
  const { data, error } = await supabaseAdmin
    .from('daily_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getHistory(userId: number, days: number) {
  const start = formatDate(addDays(parseDate(todayStr()), -days));
  const { data, error } = await supabaseAdmin
    .from('daily_scores')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getSummary(userId: number, dateStr: string = todayStr()) {
  const today = await recomputeDailyScore(userId, dateStr); // live: always reflects the latest synced data
  const yesterdayStr = formatDate(addDays(parseDate(dateStr), -1));
  const yesterday = await getDailyScore(userId, yesterdayStr);

  const { data: history, error } = await supabaseAdmin
    .from('daily_scores')
    .select('date, activity_score')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(90);
  if (error) throw error;

  const weeklyAverage = computeWeeklyAverage(history ?? [], dateStr);
  const previousWeekAverage = computePreviousWeekAverage(history ?? [], dateStr);
  const monthlyAverage = computeMonthlyAverage(history ?? [], dateStr);
  const streak = computeStreak(history ?? []);
  const personalProgress = computePersonalProgress(weeklyAverage, previousWeekAverage);

  return {
    today,
    deltaVsYesterday:
      yesterday?.activity_score != null && today.activity_score != null
        ? today.activity_score - yesterday.activity_score
        : null,
    weeklyAverage,
    monthlyAverage,
    streak,
    personalProgress,
  };
}
