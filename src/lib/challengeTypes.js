// Shared between the admin create-challenge form (ChallengeForm.jsx),
// the admin challenge list (AdminChallenges.jsx), and the student/
// employee-facing Challenges screen — one source of truth so the type
// list can't drift between the screen that creates a challenge and the
// screens that display it.

export const CHALLENGE_TYPES = [
  { id: 'steps', label: 'צעדים', icon: '👣' },
  { id: 'distance', label: 'מרחק', icon: '📏' },
  { id: 'sleep', label: 'שינה', icon: '😴' },
  { id: 'class', label: 'כיתה', icon: '👥' },
  { id: 'grade', label: 'שכבה', icon: '🎓' },
];

export const CHALLENGE_AUDIENCE_OPTIONS = [
  { id: 'grade', label: 'שכבה' },
  { id: 'school', label: 'ביה"ס' },
];

export function challengeTypeMeta(id) {
  return CHALLENGE_TYPES.find((t) => t.id === id) ?? CHALLENGE_TYPES[0];
}
