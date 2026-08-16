// Ported from server/routes/activity.js.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import { upsertRawMetrics, recomputeDailyScore, getDailyScore, getHistory, getSummary, getEffectiveConfig } from '../_shared/scoring/service.ts';
import { todayStr } from '../_shared/scoring/dates.ts';

const SOURCES = ['device_sensor', 'apple_health', 'health_connect', 'fitbit', 'garmin', 'manual'];

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const path = new URL(req.url).pathname;

  try {
    if (path.endsWith('/sync') && req.method === 'POST') return await handleSync(req);
    if (path.endsWith('/today') && req.method === 'GET') return await handleToday(req);
    if (path.endsWith('/history') && req.method === 'GET') return await handleHistory(req);
    if (path.endsWith('/summary') && req.method === 'GET') return await handleSummary(req);
    if (path.endsWith('/config') && req.method === 'GET') return await handleGetConfig();
    if (path.endsWith('/config') && req.method === 'PUT') return await handleUpdateConfig(req);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleSync(req: Request) {
  const userId = getUserIdFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { date, source, steps, active_minutes, distance_km, vigorous_minutes, active_energy_kcal } = body;
  const dateStr = date || todayStr();

  if (!SOURCES.includes(source)) {
    return json({ error: `source חייב להיות אחד מ: ${SOURCES.join(', ')}` }, 400);
  }
  if (steps == null && active_minutes == null && distance_km == null && vigorous_minutes == null) {
    return json({ error: 'נדרש לפחות מדד אחד' }, 400);
  }

  await upsertRawMetrics({
    user_id: userId, date: dateStr, source,
    steps: steps ?? null, active_minutes: active_minutes ?? null, distance_km: distance_km ?? null,
    vigorous_minutes: vigorous_minutes ?? null, active_energy_kcal: active_energy_kcal ?? null,
  });

  const daily = await recomputeDailyScore(userId, dateStr);
  return json({ dailyScore: daily });
}

async function handleToday(req: Request) {
  const userId = getUserIdFromRequest(req);
  const dateStr = todayStr();
  const daily = (await getDailyScore(userId, dateStr)) || (await recomputeDailyScore(userId, dateStr));
  return json({ dailyScore: daily });
}

async function handleHistory(req: Request) {
  const userId = getUserIdFromRequest(req);
  const url = new URL(req.url);
  const days = Math.min(Number(url.searchParams.get('days')) || 30, 365);
  return json({ history: await getHistory(userId, days) });
}

async function handleSummary(req: Request) {
  const userId = getUserIdFromRequest(req);
  return json(await getSummary(userId));
}

async function handleGetConfig() {
  return json({ config: await getEffectiveConfig(todayStr()) });
}

// NOTE: intentionally open, same caveat as the Express version — needs
// an admin-role gate before this is anything but a prototype.
async function handleUpdateConfig(req: Request) {
  const current = await getEffectiveConfig(todayStr());
  const body = await req.json().catch(() => ({}));
  const {
    steps_goal, steps_weight, active_minutes_goal, active_minutes_weight,
    distance_goal_km, distance_weight, vigorous_minutes_goal, vigorous_weight, effective_from,
  } = body;

  const next = {
    steps_goal: steps_goal ?? current.steps_goal,
    steps_weight: steps_weight ?? current.steps_weight,
    active_minutes_goal: active_minutes_goal ?? current.active_minutes_goal,
    active_minutes_weight: active_minutes_weight ?? current.active_minutes_weight,
    distance_goal_km: distance_goal_km ?? current.distance_goal_km,
    distance_weight: distance_weight ?? current.distance_weight,
    vigorous_minutes_goal: vigorous_minutes_goal ?? current.vigorous_minutes_goal,
    vigorous_weight: vigorous_weight ?? current.vigorous_weight,
  };

  const totalWeight = next.steps_weight + next.active_minutes_weight + next.distance_weight + next.vigorous_weight;
  if (Math.round(totalWeight) !== 100) {
    return json({ error: `סכום המשקלים חייב להיות 100 (כרגע: ${totalWeight})` }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from('scoring_config')
    .insert({ effective_from: effective_from || todayStr(), ...next })
    .select()
    .single();
  if (error) throw error;

  return json({ config: data }, 201);
}
