import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

// Real HealthKit (iOS) / Health Connect (Android) step data — only
// reachable once the app is running inside the Capacitor native shell
// (see CAPACITOR.md); a plain website has no way to read either
// platform's real pedometer, which is why deviceSensorAdapter.js's
// accelerometer-based counter exists as the web fallback. This adapter
// reports itself unavailable immediately (safe no-op) unless
// Capacitor.isNativePlatform() is true, so nothing changes for anyone
// using the plain website.
//
// Only `steps` is populated today, via Health.queryAggregated (see
// node_modules/@capgo/capacitor-health/dist/esm/definitions.d.ts for the
// real plugin API — checked directly rather than guessed). Active
// minutes/distance/vigorous minutes stay `null` (missing, not zero, per
// the scoring engine's fairness rule) until a later pass maps the
// plugin's other supported HealthDataType values (`distance`,
// `exerciseTime`, etc.).

const REFRESH_INTERVAL_MS = 60_000; // a native read is a real query, not a live sensor — no need for pedometer-grade polling

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useNativeHealthAdapter() {
  const isNative = Capacitor.isNativePlatform();
  // Report as the platform-specific source the backend already
  // whitelists (supabase/functions/activity/index.ts's SOURCES) rather
  // than inventing a new generic id — 'apple_health'/'health_connect'
  // were already reserved there for exactly this integration.
  const sourceId = Capacitor.getPlatform() === 'ios' ? 'apple_health' : 'health_connect';
  // 'unsupported' (not running natively — the plain website) | 'idle' | 'denied' | 'active'
  const [status, setStatus] = useState(isNative ? 'idle' : 'unsupported');
  const [steps, setSteps] = useState(null);
  const pollRef = useRef(null);

  const fetchSteps = useCallback(async () => {
    try {
      const { samples } = await Health.queryAggregated({
        dataType: 'steps',
        startDate: startOfTodayISO(),
        endDate: new Date().toISOString(),
        bucket: 'day',
        aggregation: 'sum',
      });
      setSteps(samples[0]?.value ?? 0);
    } catch {
      // Best-effort — a failed read just means the UI keeps showing the last known value.
    }
  }, []);

  useEffect(() => {
    if (status !== 'active') return undefined;
    fetchSteps();
    pollRef.current = setInterval(fetchSteps, REFRESH_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [status, fetchSteps]);

  const requestPermission = useCallback(async () => {
    if (!isNative) return;
    try {
      const { available } = await Health.isAvailable();
      if (!available) {
        setStatus('denied');
        return;
      }
      const result = await Health.requestAuthorization({ read: ['steps'] });
      setStatus(result.readAuthorized.includes('steps') ? 'active' : 'denied');
    } catch {
      setStatus('denied');
    }
  }, [isNative]);

  const available = status !== 'unsupported';
  const reading =
    status === 'active' && steps != null
      ? { steps, active_minutes: null, distance_km: null, vigorous_minutes: null, active_energy_kcal: null }
      : null;

  return { id: sourceId, available, reading, status, requestPermission };
}
