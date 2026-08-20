// Real per-user progress computation for challenges (§ "חבר את מסך
// אתגרים למסך הזה"). A challenge's type is only ever what's being
// measured (steps/distance/sleep) — class/grade comparison is its own
// standalone screen (class-ranking Edge Function), not a challenge type.

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

/** Real progress for one user against one challenge, per its type. */
export async function computeProgress(userId: number, challenge: { type: string; start_date: string; end_date: string }) {
  const { type, start_date, end_date } = challenge;
  if (type === 'steps') return sumUserSteps(userId, start_date, end_date);
  if (type === 'distance') return sumUserDistance(userId, start_date, end_date);
  if (type === 'sleep') return sumUserSleepMinutes(userId, start_date, end_date);
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
    default: return '';
  }
}
