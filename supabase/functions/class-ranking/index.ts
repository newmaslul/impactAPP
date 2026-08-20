// Class/grade step-total ranking for a challenge's detail screen
// (src/routes/app/ClassRanking.jsx). Sums each student's merged,
// validated daily steps (daily_scores.steps_value — the same
// already-deduplicated-across-sources number the personal dashboard
// uses, not a raw re-read).
//
// Without a ?challengeId=, defaults to "every class, current calendar
// week" (its original standalone behavior). With ?challengeId=, scopes
// to that specific challenge's date range, and — for a 'grade'-typed
// challenge — groups by grade (rolling multiple classes together)
// instead of by individual class.

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
  getUserIdFromRequest(req); // any authenticated user (student or employee) may view the ranking

  const challengeId = new URL(req.url).searchParams.get('challengeId');

  let start: string;
  let end: string;
  let groupByGrade = false;

  if (challengeId) {
    const { data: challenge, error } = await supabaseAdmin
      .from('challenges')
      .select('start_date, end_date, type')
      .eq('id', challengeId)
      .maybeSingle();
    if (error) throw error;
    if (!challenge) return json({ error: 'האתגר לא נמצא' }, 404);
    start = challenge.start_date;
    end = challenge.end_date;
    groupByGrade = challenge.type === 'grade';
  } else {
    const today = todayStr();
    start = formatDate(startOfWeek(parseDate(today)));
    end = today;
  }

  const { data: students, error: studentsError } = await supabaseAdmin
    .from('users')
    .select('id, class_id')
    .eq('role', 'student')
    .not('class_id', 'is', null);
  if (studentsError) throw studentsError;

  const studentIds = (students ?? []).map((s: any) => s.id);
  const stepsByUser = new Map<number, number>();
  if (studentIds.length) {
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from('daily_scores')
      .select('user_id, steps_value')
      .in('user_id', studentIds)
      .gte('date', start)
      .lte('date', end);
    if (scoresError) throw scoresError;
    for (const row of scores ?? []) {
      if (row.steps_value == null) continue;
      stepsByUser.set(row.user_id, (stepsByUser.get(row.user_id) ?? 0) + row.steps_value);
    }
  }

  if (groupByGrade) {
    const { data: classes, error: classesError } = await supabaseAdmin.from('classes').select('id, grade');
    if (classesError) throw classesError;
    const gradeByClass = new Map<number, string>();
    for (const c of classes ?? []) {
      if (c.grade) gradeByClass.set(c.id, c.grade);
    }

    const stepsByGrade = new Map<string, number>();
    for (const s of students ?? []) {
      const grade = gradeByClass.get(s.class_id as number);
      if (!grade) continue;
      const steps = stepsByUser.get(s.id) ?? 0;
      stepsByGrade.set(grade, (stepsByGrade.get(grade) ?? 0) + steps);
    }

    const ranking = [...stepsByGrade.entries()]
      .map(([grade, steps]) => ({ id: grade, name: `שכבה ${grade}`, steps }))
      .sort((a, b) => b.steps - a.steps);

    return json({ ranking, start, end });
  }

  const { data: classes, error: classesError } = await supabaseAdmin.from('classes').select('id, name');
  if (classesError) throw classesError;

  const classIdByUser = new Map<number, number>();
  for (const s of students ?? []) classIdByUser.set(s.id, s.class_id as number);

  const stepsByClass = new Map<number, number>();
  for (const [userId, classId] of classIdByUser) {
    const steps = stepsByUser.get(userId) ?? 0;
    stepsByClass.set(classId, (stepsByClass.get(classId) ?? 0) + steps);
  }

  const ranking = (classes ?? [])
    .map((c: any) => ({ id: c.id, name: c.name, steps: stepsByClass.get(c.id) ?? 0 }))
    .sort((a, b) => b.steps - a.steps);

  return json({ ranking, start, end });
}
