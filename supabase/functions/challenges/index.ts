// Student/employee-facing challenge list + detail (src/routes/app/Challenges.jsx,
// src/routes/app/ChallengeDetail.jsx) — replaces the local hardcoded mock
// arrays those screens used to render. Backed by the real `challenges`
// table (created via the admin "צור אתגר" form / admin-challenges) with
// real per-user progress computed from the same activity/sleep data the
// personal dashboard already uses.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import { todayStr } from '../_shared/scoring/dates.ts';
import { getUserWithClass, computeProgress, statusFor, iconFor, subtitleFor } from '../_shared/challenges/service.ts';

function restSegments(req: Request): string[] {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('challenges');
  return idx >= 0 ? segments.slice(idx + 1) : [];
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const rest = restSegments(req);

  try {
    if (rest.length === 0 && req.method === 'GET') return await handleList(req);
    if (rest.length === 1 && req.method === 'GET') return await handleDetail(req, rest[0]);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleList(req: Request) {
  const userId = getUserIdFromRequest(req);
  const { userClass } = await getUserWithClass(userId);
  const today = todayStr();

  const { data: challenges, error } = await supabaseAdmin.from('challenges').select('*').order('start_date', { ascending: true });
  if (error) throw error;

  const active: any[] = [];
  const completed: any[] = [];

  for (const c of challenges ?? []) {
    const status = statusFor(c, today);
    const current = await computeProgress(userId, userClass, c);
    const item = {
      id: c.id,
      icon: iconFor(c.type),
      title: c.name,
      subtitle: subtitleFor(c.type, c.goal),
      current,
      goal: c.goal,
    };
    if (status === 'ended') {
      completed.push({ ...item, done: true });
    } else {
      const daysLeft = Math.max(0, Math.round((new Date(c.end_date).getTime() - new Date(today).getTime()) / 86_400_000));
      active.push({ ...item, daysLeft });
    }
  }

  return json({ active, completed });
}

async function handleDetail(req: Request, id: string) {
  const userId = getUserIdFromRequest(req);
  const { userClass } = await getUserWithClass(userId);
  const today = todayStr();

  const { data: c, error } = await supabaseAdmin.from('challenges').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!c) return json({ error: 'האתגר לא נמצא' }, 404);

  const current = await computeProgress(userId, userClass, c);
  const status = statusFor(c, today);

  return json({
    challenge: {
      id: c.id,
      type: c.type,
      title: c.name,
      subtitle: subtitleFor(c.type, c.goal),
      icon: iconFor(c.type),
      current,
      goal: c.goal,
      startDate: c.start_date,
      endDate: c.end_date,
      status,
    },
  });
}
