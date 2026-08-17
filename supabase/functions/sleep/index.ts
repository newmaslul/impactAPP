// Sleep Estimation Engine API. Same internal-routing shape as
// activity/index.ts: one Deno.serve function, path + method dispatch.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import { todayStr } from '../_shared/scoring/dates.ts';
import {
  ingestSleepSamples,
  getSleepSession,
  recomputeSleepSession,
  getSleepHistory,
  getSleepSummary,
  getEffectiveSleepConfig,
  getAgeBands,
  updateSleepConfig,
} from '../_shared/sleep/service.ts';

const SOURCES = ['phone_sensor', 'healthkit', 'health_connect', 'wearable', 'manual'];

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const path = new URL(req.url).pathname;

  try {
    if (path.endsWith('/samples') && req.method === 'POST') return await handleSamples(req);
    if (path.endsWith('/today') && req.method === 'GET') return await handleToday(req);
    if (path.endsWith('/history') && req.method === 'GET') return await handleHistory(req);
    if (path.endsWith('/summary') && req.method === 'GET') return await handleSummary(req);
    if (path.endsWith('/config') && req.method === 'GET') return await handleGetConfig(req);
    if (path.endsWith('/config') && req.method === 'PUT') return await handleUpdateConfig(req);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleSamples(req: Request) {
  const userId = getUserIdFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const samples = Array.isArray(body.samples) ? body.samples : [];

  if (!samples.length) return json({ error: 'נדרש לפחות sample אחד' }, 400);
  for (const s of samples) {
    if (!s.timestamp || !SOURCES.includes(s.source)) {
      return json({ error: `כל sample חייב timestamp ו-source מתוך: ${SOURCES.join(', ')}` }, 400);
    }
  }

  await ingestSleepSamples(userId, samples);
  return json({ ok: true, count: samples.length });
}

async function handleToday(req: Request) {
  const userId = getUserIdFromRequest(req);
  const dateStr = todayStr();
  const session = (await getSleepSession(userId, dateStr)) || (await recomputeSleepSession(userId, dateStr));
  return json({ session });
}

async function handleHistory(req: Request) {
  const userId = getUserIdFromRequest(req);
  const url = new URL(req.url);
  const days = Math.min(Number(url.searchParams.get('days')) || 30, 365);
  return json({ history: await getSleepHistory(userId, days) });
}

async function handleSummary(req: Request) {
  const userId = getUserIdFromRequest(req);
  return json(await getSleepSummary(userId));
}

async function handleGetConfig(req: Request) {
  void req;
  const [config, ageBands] = await Promise.all([getEffectiveSleepConfig(todayStr()), getAgeBands()]);
  return json({ config, ageBands });
}

// NOTE: intentionally open, same caveat as activity's config endpoint —
// needs an admin-role gate before this is anything but a prototype.
async function handleUpdateConfig(req: Request) {
  const current = await getEffectiveSleepConfig(todayStr());
  const body = await req.json().catch(() => ({}));
  const config = await updateSleepConfig(body, current);
  return json({ config }, 201);
}
