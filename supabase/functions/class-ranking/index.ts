// Ranking for a 'class' or 'cross_grade'-scoped challenge's detail
// screen (src/routes/app/ClassRanking.jsx). Requires ?challengeId= — the
// standalone "always this week, always steps" screen has been absorbed
// into the challenge mechanism (see docs artifact "מנגנון האתגרים").
//
// 'class' scope ranks classes within the viewer's own grade + school;
// 'cross_grade' ranks grades within the viewer's own school (never
// across schools — see scheme decision #1). Both sum the challenge's own
// `type` (steps/distance/sleep), not steps unconditionally.

import { corsHeaders, handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getUserIdFromRequest, AuthError } from '../_shared/auth.ts';
import { resolvePeriod, getUserWithClass, sumForUsers, unitFor, todayStr, type Challenge } from '../_shared/challenges/service.ts';

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

  const challengeId = new URL(req.url).searchParams.get('challengeId');
  if (!challengeId) return json({ error: 'נדרש challengeId' }, 400);

  const { data: challengeRow, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle();
  if (challengeError) throw challengeError;
  if (!challengeRow) return json({ error: 'האתגר לא נמצא' }, 404);

  const challenge = challengeRow as Challenge;
  if (challenge.scope !== 'class' && challenge.scope !== 'cross_grade') {
    return json({ error: 'לאתגר אישי אין דירוג קבוצתי' }, 400);
  }

  const unit = unitFor(challenge.type);
  const period = resolvePeriod(challenge, todayStr());
  if (!period) return json({ ranking: [], start: null, end: null, unit });

  // No class (e.g. an employee account) — there's no "my school" to
  // scope a class/grade ranking to.
  if (!userClass) return json({ ranking: [], start: period.start, end: period.end, unit });

  if (challenge.scope === 'cross_grade') {
    const { data: classes, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('id, grade')
      .eq('school_id', userClass.school_id)
      .not('grade', 'is', null);
    if (classesError) throw classesError;

    const gradeGroups = new Map<string, number[]>();
    for (const c of classes ?? []) {
      const list = gradeGroups.get(c.grade as string) ?? [];
      list.push(c.id);
      gradeGroups.set(c.grade as string, list);
    }

    const ranking = [];
    for (const [grade, classIds] of gradeGroups) {
      const { data: students, error: studentsError } = await supabaseAdmin
        .from('users').select('id').eq('role', 'student').in('class_id', classIds);
      if (studentsError) throw studentsError;
      const value = await sumForUsers(challenge.type, (students ?? []).map((s: any) => s.id), period);
      ranking.push({ id: grade, name: `שכבה ${grade}`, value });
    }
    ranking.sort((a, b) => b.value - a.value);
    return json({ ranking, start: period.start, end: period.end, unit });
  }

  // scope === 'class': every class sharing the viewer's grade + school.
  let classesQuery = supabaseAdmin.from('classes').select('id, name').eq('school_id', userClass.school_id);
  if (userClass.grade) classesQuery = classesQuery.eq('grade', userClass.grade);
  const { data: classes, error: classesError } = await classesQuery;
  if (classesError) throw classesError;

  const ranking = [];
  for (const c of classes ?? []) {
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('users').select('id').eq('role', 'student').eq('class_id', c.id);
    if (studentsError) throw studentsError;
    const value = await sumForUsers(challenge.type, (students ?? []).map((s: any) => s.id), period);
    ranking.push({ id: c.id, name: c.name, value });
  }
  ranking.sort((a, b) => b.value - a.value);
  return json({ ranking, start: period.start, end: period.end, unit });
}
