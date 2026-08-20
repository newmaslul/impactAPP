import { useEffect, useState } from 'react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Detects when a newer build has been deployed while this tab still has
 * an older one open. GitHub Pages gives us no control over HTTP
 * cache-control headers, so index.html — unlike the hashed JS/CSS files
 * it references, which can never go stale under a new name — can end up
 * served stale by a browser (or especially an "Add to Home Screen" PWA
 * shell) long after a new version is actually live. This was the root
 * cause of a real report: a user saw an old, already-fixed bug because
 * their browser was still running yesterday's bundle.
 *
 * Polls a small, unhashed version.json (written fresh on every build —
 * see vite.config.js) with cache: 'no-store', and compares it to the
 * version baked into this running bundle at build time (__APP_VERSION__,
 * also injected by vite.config.js). No service worker involved — this is
 * a plain fetch-and-compare, deliberately simple.
 */
export function useAppUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const check = () => {
      fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.version && data.version !== __APP_VERSION__) {
            setUpdateAvailable(true);
          }
        })
        .catch(() => {
          // Best-effort — a failed check just means we try again next interval.
        });
    };

    check();
    const intervalId = setInterval(check, CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return updateAvailable;
}
