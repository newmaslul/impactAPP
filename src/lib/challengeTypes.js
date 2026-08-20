// Shared between the admin create-challenge form (ChallengeForm.jsx),
// the admin challenge list (AdminChallenges.jsx), and the student/
// employee-facing Challenges screen — one source of truth so the type
// list can't drift between the screen that creates a challenge and the
// screens that display it.
//
// כיתה/שכבה are deliberately NOT challenge types here — class/grade
// ranking is its own standalone screen (ClassRanking.jsx, reached from
// the class-challenge preview card, not from an admin-created
// challenge). A challenge's "type" is only ever what's being measured.

export const CHALLENGE_TYPES = [
  { id: 'steps', label: 'צעדים', icon: '👣' },
  { id: 'distance', label: 'מרחק', icon: '📏' },
  { id: 'sleep', label: 'שינה', icon: '😴' },
];

export const CHALLENGE_AUDIENCE_OPTIONS = [
  { id: 'grade', label: 'שכבה' },
  { id: 'school', label: 'ביה"ס' },
];

// Fixed grade choices for both a class's own grade (AdminSchools.jsx)
// and a challenge's grade-scoped audience — א' through י', the range
// explicitly requested (not the full א'-יב' school range).
export const GRADE_OPTIONS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];

export function challengeTypeMeta(id) {
  return CHALLENGE_TYPES.find((t) => t.id === id) ?? CHALLENGE_TYPES[0];
}
