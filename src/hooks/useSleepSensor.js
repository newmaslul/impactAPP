import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

// Best-effort sleep sensing from the browser, per the Sleep Estimation
// Engine's data model (screenActivity/touchActivity/motionActivity/
// appActivity, each 0..1, no audio ever). Same permission-gate shape as
// usePedometer.js (motion needs an explicit iOS-gesture prompt), but this
// is its own independent hook/permission state rather than sharing
// usePedometer's — each Data Adapter manages its own consent, same as
// every other adapter in this app.
//
// IMPORTANT (see supabase/functions/_shared/sleep/README.md's
// platform-constraints section): a browser tab is throttled or fully
// suspended once the screen locks or the app is backgrounded — exactly
// what happens during real sleep. This hook cannot collect anything while
// suspended; it sends a small "heartbeat" sample every few minutes
// whenever the tab IS active so the backend sees real, low-activity data
// instead of an unobserved gap (gaps are still handled gracefully
// server-side, but real samples give a meaningfully higher confidence
// score) — keeping this running through a whole night requires the tab
// to stay open and the screen to stay on, which most phones won't do on
// their own. This is a phone-only estimate, not a continuous
// measurement, and the UI must always present it as "שינה משוערת".

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // matches the backend's default 5-minute window
const TOUCH_SATURATION_COUNT = 20; // touches per interval that count as "fully active"
const MOTION_SMOOTHING = 0.9; // same shape as usePedometer's GRAVITY_SMOOTHING
const AUTO_ENABLE_KEY = 'maslul:sleepSensorAutoEnable';

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function wantsAutoEnable() {
  try {
    return localStorage.getItem(AUTO_ENABLE_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberAutoEnable() {
  try {
    localStorage.setItem(AUTO_ENABLE_KEY, 'true');
  } catch {
    /* private-browsing or storage disabled — choice just won't persist */
  }
}

export function useSleepSensor() {
  const [status, setStatus] = useState(() =>
    typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? 'idle' : 'unsupported'
  );

  const touchCount = useRef(0);
  const gravity = useRef(null);
  const activityLevel = useRef(0);
  const charging = useRef(null); // null = unknown — Battery Status API is deprecated/removed in most current browsers

  const handleMotion = useCallback((event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null) return;
    const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    if (gravity.current === null) {
      gravity.current = magnitude;
      return;
    }
    gravity.current = MOTION_SMOOTHING * gravity.current + (1 - MOTION_SMOOTHING) * magnitude;
    const delta = Math.abs(magnitude - gravity.current);
    // Rolling activity level, not a step count — a smoothed 0..1 read of
    // how much motion has been happening lately, documented best-effort
    // scaling (delta of ~2 m/s² leftover motion reads as "fully active").
    activityLevel.current = clamp01(0.9 * activityLevel.current + 0.1 * clamp01(delta / 2));
  }, []);

  const handleTouch = useCallback(() => {
    touchCount.current += 1;
  }, []);

  useEffect(() => {
    if (status !== 'active') return undefined;

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('pointerdown', handleTouch, { passive: true });

    // Feature-detected best-effort — unsupported in most current browsers
    // (Chrome dropped it, Safari never shipped it), so this silently
    // no-ops there and `charging` stays the honest 'unknown' (null).
    let batteryCleanup = () => {};
    if (navigator.getBattery) {
      navigator
        .getBattery()
        .then((battery) => {
          const update = () => {
            charging.current = battery.charging;
          };
          update();
          battery.addEventListener('chargingchange', update);
          batteryCleanup = () => battery.removeEventListener('chargingchange', update);
        })
        .catch(() => {});
    }

    const sendHeartbeat = () => {
      const sample = {
        timestamp: new Date().toISOString(),
        screenActivity: document.visibilityState === 'visible' ? 1 : 0,
        touchActivity: clamp01(touchCount.current / TOUCH_SATURATION_COUNT),
        motionActivity: activityLevel.current,
        appActivity: 0, // never observable from a website — see README
        charging: charging.current,
        source: 'phone_sensor',
      };
      touchCount.current = 0;
      api.syncSleepSamples([sample]).catch(() => {
        // Best-effort background sync — a dropped heartbeat just means a
        // slightly wider gap for that window server-side.
      });
    };

    const heartbeatId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('pointerdown', handleTouch);
      clearInterval(heartbeatId);
      batteryCleanup();
    };
  }, [status, handleMotion, handleTouch]);

  const requestPermission = useCallback(async () => {
    if (status === 'unsupported') return;

    const needsPermission = typeof window.DeviceMotionEvent?.requestPermission === 'function';
    if (!needsPermission) {
      setStatus('active');
      rememberAutoEnable();
      return;
    }

    try {
      const result = await window.DeviceMotionEvent.requestPermission();
      if (result === 'granted') {
        setStatus('active');
        rememberAutoEnable();
      } else {
        setStatus('denied');
      }
    } catch {
      setStatus('denied');
    }
  }, [status]);

  // Same persisted-choice convention as usePedometer.js: once enabled,
  // stay enabled on future visits without asking again.
  useEffect(() => {
    if (status === 'idle' && wantsAutoEnable()) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return { status, requestPermission };
}
