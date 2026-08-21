import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Every currently-valid challenge the viewer is in scope for — personal
 * and group alike, per the "מנגנון האתגרים" scheme (no picking a single
 * "the" daily/weekly/class challenge; whatever's live gets a card).
 * Used by both Home.jsx and HomeStudent.jsx. Fails silently (empty list)
 * so a challenges outage doesn't block the rest of the home screen.
 */
export function useMyChallenges() {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    api.listChallenges().then(({ active }) => setChallenges(active)).catch(() => {});
  }, []);

  return challenges;
}
