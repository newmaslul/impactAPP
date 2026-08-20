// Real per-user progress computation for challenges (§ "חבר את מסך
// אתגרים למסך הזה"). Shared by the public `challenges` function
// (student/employee-facing list + detail) and `class-ranking` (which
// needs the same class/grade rollups, scoped to a specific challenge's
// dates instead of "this week").

import { supabaseAdmin } from '../supabaseAdmin.ts';

export async function getUserWithClass(userId: number) {
  const { data: user, error } = await supabaseAdmin.from('users').select('id, role, class_id').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!user || !user.class_id) return { user, userClass: null };

  const { data: userClass, error: classError } = await supabaseAdmin
    .from('classes')
    .select('id, name, grade, school_id')
    .eq('id', user.class_id)
    .maybeSingle();
  if (classError) throw classError;
  return { user, userClass };
}

async function sumColumn(table: string, column: string, filterFn: (q: any) => any, start: string, end: string) {
  const { data, error } = await filterFn(supabaseAdmin.from(table).select(column).gte('date', start).lte('date', end));
  if (error) throw error;
  return (data ?? []).reduce((sum: number, row: any) => sum + (row[column] ?? 0), 0);
}

export async function sumUserSteps(userId: number, start: string, end: string) {
  return sumColumn('daily_scores', 'steps_value', (q) => q.eq('user_id', userId), start, end);
}

export async function sumUserDistance(userId: number, start: string, end: string) {
  return sumColumn('daily_scores', 'distance_value', (q) => q.eq('user_id', userId), start, end);
}

export async function sumUserSleepMinutes(userId: number, start: string, end: string) {
  return sumColumn('sleep_sessions', 'estimated_sleep_minutes', (q) => q.eq('user_id', userId), start, end);
}

export async function sumStepsForUserIds(userIds: number[], start: string, end: string) {
  if (!userIds.length) return 0;
  const { data, error } = await supabaseAdmin
    .from('daily_scores')
    .select('steps_value')
    .in('user_id', userIds)
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.steps_value ?? 0), 0);
}

export async function getClassmateIds(classId: number) {
  const { data, error } = await supabaseAdmin.from('users').select('id').eq('role', 'student').eq('class_id', classId);
  if (error) throw error;
  return (data ?? []).map((u: any) => u.id);
}

/** Every student in every class sharing this grade value, across all schools. */
export async function getGradeStudentIds(grade: string) {
  const { data: classes, error: classError } = await supabaseAdmin.from('classes').select('id').eq('grade', grade);
  if (classError) throw classError;
  const classIds = (classes ?? []).map((c: any) => c.id);
  if (!classIds.length) return [];
  const { data: users, error } = await supabaseAdmin.from('users').select('id').eq('role', 'student').in('class_id', classIds);
  if (error) throw error;
  return (users ?? []).map((u: any) => u.id);
}

/** Real progress for one user against one challenge, per its type. */
export async function computeProgress(userId: number, userClass: any, challenge: { type: string; start_date: string; end_date: string }) {
  const { type, start_date, end_date } = challenge;
  if (type === 'steps') return sumUserSteps(userId, start_date, end_date);
  if (type === 'distance') return sumUserDistance(userId, start_date, end_date);
  if (type === 'sleep') return sumUserSleepMinutes(userId, start_date, end_date);
  if (type === 'class') {
    if (!userClass) return 0;
    const ids = await getClassmateIds(userClass.id);
    return sumStepsForUserIds(ids, start_date, end_date);
  }
  if (type === 'grade') {
    if (!userClass?.grade) return 0;
    const ids = await getGradeStudentIds(userClass.grade);
    return sumStepsForUserIds(ids, start_date, end_date);
  }
  return 0;
}

export function statusFor(challenge: { start_date: string; end_date: string }, today: string): 'scheduled' | 'active' | 'ended' {
  if (challenge.end_date < today) return 'ended';
  if (challenge.start_date > today) return 'scheduled';
  return 'active';
}

const TYPE_META: Record<string, { icon: string }> = {
  steps: { icon: '👣' },
  distance: { icon: '📏' },
  sleep: { icon: '😴' },
  class: { icon: '👥' },
  grade: { icon: '🎓' },
};

export function iconFor(type: string) {
  return TYPE_META[type]?.icon ?? '🏆';
}

export function subtitleFor(type: string, goal: number) {
  const n = Number(goal).toLocaleString('he-IL');
  switch (type) {
    case 'steps': return `הליכה של ${n} צעדים`;
    case 'distance': return `הליכה/ריצה של ${n} ק"מ`;
    case 'sleep': return `${n} דקות שינה מצטברות`;
    case 'class': return `יעד כיתתי: ${n} צעדים`;
    case 'grade': return `יעד שכבתי: ${n} צעדים`;
    default: return '';
  }
}
