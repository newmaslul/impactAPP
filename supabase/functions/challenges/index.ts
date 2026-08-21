// Student/employee-facing challenge list + detail (src/routes/app/Home.jsx,
// HomeStudent.jsx, Challenges.jsx, ChallengeDetail.jsx). Every currently-
// valid challenge the viewer is "in scope" for gets its own card — no
// picking a single "the" daily/weekly/class challenge — with real
// progress computed per the type × scope × recurrence mechanism in
// _shared/challenges/service.ts.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import {
  resolvePeriod, statusFor, computeCurrent, iconFor, subtitleFor, getUserWithClass, todayStr,
  type Challenge,
} from '../_shared/challenges/service.ts';

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

  const { data: challenges, error } = await supabaseAdmin.from('challenges').select('*');
  if (error) throw error;

  const active: any[] = [];
  const completed: any[] = [];

  for (const c of (challenges ?? []) as Challenge[]) {
    const status = statusFor(c, today);
    if (status === 'ended') {
      // A recurring challenge simply stops appearing once its bound
      // passes — there's no single fixed period left to summarize, so
      // (unlike 'once') it doesn't get a "completed" card either.
      if (c.recurrence !== 'once') continue;
      const period = { start: c.start_date!, end: c.end_date! };
      const current = await computeCurrent(userId, userClass, c, period);
      completed.push({
        id: c.id, icon: iconFor(c.type), title: c.name, subtitle: subtitleFor(c),
        current, goal: c.goal, done: true,
      });
      continue;
    }

    const period = resolvePeriod(c, today)!; // status !== 'ended' guarantees a period here
    const current = await computeCurrent(userId, userClass, c, period);
    const daysLeft = Math.max(0, Math.round((new Date(period.end).getTime() - new Date(today).getTime()) / 86_400_000));
    active.push({
      id: c.id, icon: iconFor(c.type), title: c.name, subtitle: subtitleFor(c),
      current, goal: c.goal, daysLeft,
    });
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

  const challenge = c as Challenge;
  const status = statusFor(challenge, today);
  const period = resolvePeriod(challenge, today) ?? { start: challenge.start_date ?? today, end: challenge.end_date ?? today };
  const current = await computeCurrent(userId, userClass, challenge, period);

  return json({
    challenge: {
      id: challenge.id,
      type: challenge.type,
      scope: challenge.scope,
      title: challenge.name,
      subtitle: subtitleFor(challenge),
      icon: iconFor(challenge.type),
      current,
      goal: challenge.goal,
      startDate: period.start,
      endDate: period.end,
      status,
    },
  });
}
