import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken } from '../lib/api.js';

const CurrentUserContext = createContext({ user: null, loading: true, error: null });

export function CurrentUserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setLoading(false);
      return undefined;
    }
    api.me()
      .then(({ user }) => { if (!cancelled) setUser(user); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <CurrentUserContext.Provider value={{ user, loading, error }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// Falls back to a demo user when no one is signed in (e.g. visiting
// /app/home directly without registering first) so the screens still have
// something sensible to render.
const DEMO_USER = { username: 'איתי', department: null };

export function useCurrentUser() {
  const { user, loading, error } = useContext(CurrentUserContext);
  return { user: user ?? DEMO_USER, isRealUser: !!user, loading, error };
}
