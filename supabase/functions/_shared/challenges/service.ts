// Core mechanism for the "מנגנון האתגרים" scheme: two independent axes —
// `type` (what's measured: steps/distance/sleep) and `scope` (who it's
// summed over: personal/class/cross_grade) — plus `recurrence`, which
// decides how a challenge's "current period" is computed. There is no
// stored "instances" table: the period is a pure function of today, the
// same way the standalone class-ranking screen already computed "this
// week" before this rewrite.

import { supabaseAdmin } from '../supabaseAdmin.ts';
import { todayStr, parseDate, formatDate, addDays, startOfWeek, startOfMonth, endOfMonth } from '../scoring/dates.ts';

export type Challenge = {
  id: number;
  name: string;
  type: 'steps' | 'distance' | 'sleep';
  scope: 'personal' | 'class' | 'cross_grade';
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  start_date: string | null;
  end_date: string | null;
  recurrence_bound_until: string | null;
  goal: number;
};

export type Period = { start: string; end: string };

/**
 * The challenge's currently-active date range, or null if it isn't
 * live right now — either a 'once' challenge whose fixed range doesn't
 * include today, or a recurring one whose "תחום בזמן" cutoff has passed.
 * A recurring challenge with no cutoff is always live: its period is
 * always "today" / "this week" / "this month", recomputed fresh.
 */
export function resolvePeriod(challenge: Challenge, today: string): Period | null {
  if (challenge.recurrence === 'once') {
    if (!challenge.start_date || !challenge.end_date) return null;
    if (today < challenge.start_date || today > challenge.end_date) return null;
    return { start: challenge.start_date, end: challenge.end_date };
  }

  if (challenge.recurrence_bound_until && today > challenge.recurrence_bound_until) return null;

  const day = parseDate(today);
  if (challenge.recurrence === 'daily') return { start: today, end: today };
  if (challenge.recurrence === 'weekly') {
    const start = startOfWeek(day);
    return { start: formatDate(start), end: formatDate(addDays(start, 6)) };
  }
  if (challenge.recurrence === 'monthly') {
    return { start: formatDate(startOfMonth(day)), end: formatDate(endOfMonth(day)) };
  }
  return null;
}

/**
 * Lifecycle label, independent of whether it's live right now — used
 * for the admin table and for deciding which tab (active/completed) a
 * challenge belongs to. 'once' has a real end; recurring challenges are
 * either still recurring or permanently done once their bound passes.
 */
export function statusFor(challenge: Challenge, today: string): 'scheduled' | 'active' | 'ended' {
  if (challenge.recurrence === 'once') {
    if (!challenge.end_date || challenge.end_date < today) return 'ended';
    if (challenge.start_date && challenge.start_date > today) return 'scheduled';
    return 'active';
  }
  if (challenge.recurrence_bound_until && challenge.recurrence_bound_until < today) return 'ended';
  return 'active';
}

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

const VALUE_COLUMN: Record<Challenge['type'], { table: string; column: string }> = {
  steps: { table: 'daily_scores', column: 'steps_value' },
  distance: { table: 'daily_scores', column: 'distance_value' },
  sleep: { table: 'sleep_sessions', column: 'estimated_sleep_minutes' },
};

/** Sums one type's value across a set of users over a period — the one
 *  primitive every scope (personal = 1 user, class/cross_grade = many)
 *  is built from. */
export async function sumForUsers(type: Challenge['type'], userIds: number[], period: Period) {
  if (!userIds.length) return 0;
  const { table, column } = VALUE_COLUMN[type];
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(`user_id, ${column}`)
    .in('user_id', userIds)
    .gte('date', period.start)
    .lte('date', period.end);
  if (error) throw error;
  return (data ?? []).reduce((sum: number, row: any) => sum + (row[column] ?? 0), 0);
}

export async function getClassmateIds(classId: number) {
  const { data, error } = await supabaseAdmin.from('users').select('id').eq('role', 'student').eq('class_id', classId);
  if (error) throw error;
  return (data ?? []).map((u: any) => u.id);
}

/** Every student in every class sharing this grade, within one school —
 *  cross-grade competition stays inside a school (see scheme decision #1),
 *  it never pools the same grade label across different schools. */
export async function getGradeStudentIds(grade: string, schoolId: number) {
  const { data: classes, error: classError } = await supabaseAdmin
    .from('classes')
    .select('id')
    .eq('grade', grade)
    .eq('school_id', schoolId);
  if (classError) throw classError;
  const classIds = (classes ?? []).map((c: any) => c.id);
  if (!classIds.length) return [];
  const { data: users, error } = await supabaseAdmin.from('users').select('id').eq('role', 'student').in('class_id', classIds);
  if (error) throw error;
  return (users ?? []).map((u: any) => u.id);
}

/**
 * The number shown on a challenge's card/progress bar for one viewer:
 * personal is their own value; class/cross_grade is their OWN class's
 * (or own grade's) total — "how is my team doing" — distinct from the
 * full ranking (every class/grade compared), which is what the class-
 * ranking screen shows when the viewer taps into the challenge's detail.
 */
export async function computeCurrent(userId: number, userClass: any, challenge: Challenge, period: Period) {
  if (challenge.scope === 'personal') return sumForUsers(challenge.type, [userId], period);
  if (challenge.scope === 'class') {
    if (!userClass) return 0;
    return sumForUsers(challenge.type, await getClassmateIds(userClass.id), period);
  }
  if (challenge.scope === 'cross_grade') {
    if (!userClass?.grade) return 0;
    return sumForUsers(challenge.type, await getGradeStudentIds(userClass.grade, userClass.school_id), period);
  }
  return 0;
}

const TYPE_META: Record<Challenge['type'], { icon: string; unit: string }> = {
  steps: { icon: '👣', unit: 'צעדים' },
  distance: { icon: '📏', unit: 'ק"מ' },
  sleep: { icon: '😴', unit: 'דק׳ שינה' },
};

const RECURRENCE_LABEL: Record<Challenge['recurrence'], string> = {
  once: '',
  daily: 'יומי',
  weekly: 'שבועי',
  monthly: 'חודשי',
};

export function iconFor(type: Challenge['type']) {
  return TYPE_META[type]?.icon ?? '🏆';
}

export function unitFor(type: Challenge['type']) {
  return TYPE_META[type]?.unit ?? '';
}

export function subtitleFor(challenge: Challenge) {
  const n = Number(challenge.goal).toLocaleString('he-IL');
  const unit = TYPE_META[challenge.type]?.unit ?? '';
  const cadence = RECURRENCE_LABEL[challenge.recurrence];
  const goalPhrase = `יעד${cadence ? ' ' + cadence : ''}: ${n} ${unit}`;
  if (challenge.scope === 'class') return `כיתתי — ${goalPhrase}`;
  if (challenge.scope === 'cross_grade') return `בין־שכבתי — ${goalPhrase}`;
  return goalPhrase;
}

export { todayStr };
