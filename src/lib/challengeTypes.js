// Shared between the admin create-challenge form (ChallengeForm.jsx),
// the admin challenge list (AdminChallenges.jsx), and the student/
// employee-facing Challenges screen — one source of truth so these
// lists can't drift between the screen that creates a challenge and the
// screens that display it.
//
// Two independent axes, per the confirmed "מנגנון האתגרים" scheme:
// TYPE is what's measured; SCOPE is who it's summed over. A challenge is
// e.g. type=sleep + scope=class — "how many minutes did my class sleep,
// combined" — not "class challenges only measure steps".

export const CHALLENGE_TYPES = [
  { id: 'steps', label: 'צעדים', icon: '👣' },
  { id: 'distance', label: 'מרחק', icon: '📏' },
  { id: 'sleep', label: 'שינה', icon: '😴' },
];

export const CHALLENGE_SCOPES = [
  { id: 'personal', label: 'אישי' },
  { id: 'class', label: 'כיתתי' },
  { id: 'cross_grade', label: 'בין־שכבתי' },
];

export const CHALLENGE_RECURRENCES = [
  { id: 'once', label: 'פעם אחת' },
  { id: 'daily', label: 'יומי' },
  { id: 'weekly', label: 'שבועי' },
  { id: 'monthly', label: 'חודשי' },
];

// Fixed grade choices for both a class's own grade (AdminSchools.jsx)
// and cross-grade challenge scoping — א' through י'.
export const GRADE_OPTIONS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];

export function challengeTypeMeta(id) {
  return CHALLENGE_TYPES.find((t) => t.id === id) ?? CHALLENGE_TYPES[0];
}

export function scopeLabel(scope) {
  return CHALLENGE_SCOPES.find((s) => s.id === scope)?.label ?? '—';
}

export function recurrenceLabel(recurrence) {
  return CHALLENGE_RECURRENCES.find((r) => r.id === recurrence)?.label ?? '—';
}
