import { useEffect, useRef } from 'react';
import { useDeviceSensorAdapter } from '../lib/healthAdapters/deviceSensorAdapter.js';
import { useNativeHealthAdapter } from '../lib/healthAdapters/nativeHealthAdapter.js';
import { api } from '../lib/api.js';

// Throttle: the sensor can update every render, but there's no reason to
// hit the network more than about once every few seconds. Kept short (not
// 30s+) so the synced score doesn't lag noticeably behind someone
// actually watching the number while they walk.
const MIN_SYNC_INTERVAL_MS = 6000;

/**
 * Watches the live device-sensor reading and pushes it to
 * POST /api/activity/sync whenever it changes meaningfully — the
 * dashboard doesn't need to poll; it just re-fetches the summary after a
 * sync lands. Returns the adapter's own status (for the permission
 * banner) plus liveSteps — the raw on-device count, unthrottled, so the
 * UI can show it instantly instead of waiting on a round trip to the
 * server and back.
 *
 * Both adapters are called unconditionally, every render — React's rules
 * of hooks (same reasoning already documented in routes/app/Home.jsx for
 * why HomeStudent/HomeEmployee are split into separate components).
 * `useNativeHealthAdapter` reports itself unavailable immediately unless
 * running inside the Capacitor native shell (see CAPACITOR.md), so this
 * is a safe no-op for anyone using the plain website — the accelerometer
 * fallback below is unchanged in that case.
 */
export function useActivitySync() {
  const native = useNativeHealthAdapter();
  const device = useDeviceSensorAdapter();
  // Real OS-level step data beats the in-browser accelerometer estimate
  // whenever it's actually reachable (native shell + authorized).
  const active = native.available ? native : device;

  const lastSyncedSteps = useRef(null);
  const lastSyncAt = useRef(0);

  useEffect(() => {
    if (!active.reading) return;
    const now = Date.now();
    const stepsChanged = active.reading.steps !== lastSyncedSteps.current;
    const throttleOk = now - lastSyncAt.current > MIN_SYNC_INTERVAL_MS;
    if (!stepsChanged || !throttleOk) return;

    lastSyncedSteps.current = active.reading.steps;
    lastSyncAt.current = now;
    api.activitySync({ source: active.id, ...active.reading }).catch(() => {
      // Best-effort background sync — a failed sync just means the
      // dashboard shows slightly stale data until the next successful one.
    });
  }, [active.reading, active.id]);

  return { ...active, liveSteps: active.reading?.steps ?? null };
}
