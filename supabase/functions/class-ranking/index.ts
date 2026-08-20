// Class step-total ranking for the standalone "אתגר כיתתי" screen
// (src/routes/app/ClassRanking.jsx). Sums each student's merged,
// validated daily steps (daily_scores.steps_value — the same
// already-deduplicated-across-sources number the personal dashboard
// uses) over the current calendar week.
//
// Scoped to the viewer's own school, and further to their own grade
// when their class has one set — comparing a class against every class
// in every school regardless of age group isn't a meaningful ranking.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import { todayStr, parseDate, formatDate, startOfWeek } from '../_shared/scoring/dates.ts';
import { getUserWithClass } from '../_shared/challenges/service.ts';

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
  const userId = getUserIdFromRequest(req);
  const { userClass } = await getUserWithClass(userId);

  // No class (e.g. an employee account) — there's no "my school" to
  // scope to, so there's nothing meaningful to rank.
  if (!userClass) return json({ ranking: [] });

  const today = todayStr();
  const start = formatDate(startOfWeek(parseDate(today)));

  let classesQuery = supabaseAdmin.from('classes').select('id, name').eq('school_id', userClass.school_id);
  if (userClass.grade) classesQuery = classesQuery.eq('grade', userClass.grade);
  const { data: classes, error: classesError } = await classesQuery;
  if (classesError) throw classesError;

  const classIds = (classes ?? []).map((c: any) => c.id);
  if (!classIds.length) return json({ ranking: [] });

  const { data: students, error: studentsError } = await supabaseAdmin
    .from('users')
    .select('id, class_id')
    .eq('role', 'student')
    .in('class_id', classIds);
  if (studentsError) throw studentsError;

  const studentIds = (students ?? []).map((s: any) => s.id);
  const stepsByUser = new Map<number, number>();
  if (studentIds.length) {
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from('daily_scores')
      .select('user_id, steps_value')
      .in('user_id', studentIds)
      .gte('date', start)
      .lte('date', today);
    if (scoresError) throw scoresError;
    for (const row of scores ?? []) {
      if (row.steps_value == null) continue;
      stepsByUser.set(row.user_id, (stepsByUser.get(row.user_id) ?? 0) + row.steps_value);
    }
  }

  const classIdByUser = new Map<number, number>();
  for (const s of students ?? []) classIdByUser.set(s.id, s.class_id as number);

  const stepsByClass = new Map<number, number>();
  for (const [uid, classId] of classIdByUser) {
    const steps = stepsByUser.get(uid) ?? 0;
    stepsByClass.set(classId, (stepsByClass.get(classId) ?? 0) + steps);
  }

  const ranking = (classes ?? [])
    .map((c: any) => ({ id: c.id, name: c.name, steps: stepsByClass.get(c.id) ?? 0 }))
    .sort((a, b) => b.steps - a.steps);

  return json({ ranking, start, end: today });
}
