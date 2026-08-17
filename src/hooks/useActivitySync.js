import { useEffect, useRef } from 'react';
import { useDeviceSensorAdapter } from '../lib/healthAdapters/deviceSensorAdapter.js';
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
 */
export function useActivitySync() {
  const device = useDeviceSensorAdapter();
  const lastSyncedSteps = useRef(null);
  const lastSyncAt = useRef(0);

  useEffect(() => {
    if (!device.reading) return;
    const now = Date.now();
    const stepsChanged = device.reading.steps !== lastSyncedSteps.current;
    const throttleOk = now - lastSyncAt.current > MIN_SYNC_INTERVAL_MS;
    if (!stepsChanged || !throttleOk) return;

    lastSyncedSteps.current = device.reading.steps;
    lastSyncAt.current = now;
    api.activitySync({ source: device.id, ...device.reading }).catch(() => {
      // Best-effort background sync — a failed sync just means the
      // dashboard shows slightly stale data until the next successful one.
    });
  }, [device.reading, device.id]);

  return { ...device, liveSteps: device.reading?.steps ?? null };
}
