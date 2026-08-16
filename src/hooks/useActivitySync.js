import { useEffect, useRef } from 'react';
import { useDeviceSensorAdapter } from '../lib/healthAdapters/deviceSensorAdapter.js';
import { api } from '../lib/api.js';

// Throttle: the sensor can update every render, but there's no reason to
// hit the network more than about once every 30s.
const MIN_SYNC_INTERVAL_MS = 30000;

/**
 * Watches the live device-sensor reading and pushes it to
 * POST /api/activity/sync whenever it changes meaningfully — the
 * dashboard doesn't need to poll; it just re-fetches the summary after a
 * sync lands. Returns the adapter's own status so the caller can still
 * show the "enable pedometer" permission banner.
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

  return device;
}
