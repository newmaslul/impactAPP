// Class step-total ranking for the "אתגר כיתתי" (class challenge) detail
// screen (src/routes/app/ClassRanking.jsx). Sums each student's merged,
// validated daily steps (daily_scores.steps_value — the same
// already-deduplicated-across-sources number the personal dashboard
// uses, not a raw re-read) across the current calendar week, then rolls
// that up per class via users.class_id.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import { todayStr, parseDate, formatDate, startOfWeek } from '../_shared/scoring/dates.ts';

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method === 'GET') return await handleRanking(req);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401);
    console.error(err);
    return json({ error: 'שגיאת שרת' }, 500);
  }
});

async function handleRanking(req: Request) {
  getUserIdFromRequest(req); // any authenticated user (student or employee) may view the class ranking

  const today = todayStr();
  const weekStart = formatDate(startOfWeek(parseDate(today)));

  const { data: classes, error: classesError } = await supabaseAdmin.from('classes').select('id, name');
  if (classesError) throw classesError;

  const { data: students, error: studentsError } = await supabaseAdmin
    .from('users')
    .select('id, class_id')
    .eq('role', 'student')
    .not('class_id', 'is', null);
  if (studentsError) throw studentsError;

  const classIdByUser = new Map<number, number>();
  for (const s of students ?? []) classIdByUser.set(s.id, s.class_id as number);

  const studentIds = (students ?? []).map((s: any) => s.id);
  const stepsByUser = new Map<number, number>();
  if (studentIds.length) {
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from('daily_scores')
      .select('user_id, steps_value')
      .in('user_id', studentIds)
      .gte('date', weekStart)
      .lte('date', today);
    if (scoresError) throw scoresError;
    for (const row of scores ?? []) {
      if (row.steps_value == null) continue;
      stepsByUser.set(row.user_id, (stepsByUser.get(row.user_id) ?? 0) + row.steps_value);
    }
  }

  const stepsByClass = new Map<number, number>();
  for (const [userId, classId] of classIdByUser) {
    const steps = stepsByUser.get(userId) ?? 0;
    stepsByClass.set(classId, (stepsByClass.get(classId) ?? 0) + steps);
  }

  const ranking = (classes ?? [])
    .map((c: any) => ({ id: c.id, name: c.name, steps: stepsByClass.get(c.id) ?? 0 }))
    .sort((a, b) => b.steps - a.steps);

  return json({ ranking, weekStart, weekEnd: today });
}
