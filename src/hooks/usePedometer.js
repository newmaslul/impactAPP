import { useCallback, useEffect, useRef, useState } from 'react';

// Steps are counted live from the phone's own accelerometer via the
// DeviceMotion API — there is no portable browser "step counter" API, so
// this runs a small peak-detection pedometer on the motion signal itself:
// low-pass filter to track gravity, watch the leftover (dynamic) motion
// cross a walking-strength threshold, debounce so one footfall isn't
// double-counted. Today's count is persisted to localStorage so it
// survives a refresh.

const GRAVITY_SMOOTHING = 0.9; // how slowly the gravity baseline adapts
// m/s² of leftover motion to register as a step. Lowered from an initial
// 1.2 after real-device testing showed hand-held walking (phone actively
// watched, not pocketed) produces a gentler signal than the original
// value assumed — this is a best-effort tuning, not a calibrated value;
// adjust further based on real feedback.
const STEP_THRESHOLD = 0.9;
const STEP_DEBOUNCE_MS = 300; // minimum time between two counted steps
const STORAGE_PREFIX = 'maslul:steps:';
const AUTO_ENABLE_KEY = 'maslul:pedometerAutoEnable';

function todayKey() {
  return STORAGE_PREFIX + new Date().toISOString().slice(0, 10);
}

function loadStoredSteps() {
  try {
    return Number(localStorage.getItem(todayKey())) || 0;
  } catch {
    return 0;
  }
}

function saveStoredSteps(n) {
  try {
    localStorage.setItem(todayKey(), String(n));
  } catch {
    /* private-browsing or storage disabled — steps just won't persist */
  }
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

export function usePedometer() {
  const [steps, setSteps] = useState(loadStoredSteps);
  // 'unsupported' | 'idle' | 'denied' | 'active'
  const [status, setStatus] = useState(() =>
    typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? 'idle' : 'unsupported'
  );

  const gravity = useRef(null);
  const lastStepAt = useRef(0);
  const wasBelowThreshold = useRef(true);
  const receivedReading = useRef(false);

  const handleMotion = useCallback((event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null) return;
    receivedReading.current = true;

    const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

    if (gravity.current === null) {
      gravity.current = magnitude;
      return;
    }
    gravity.current = GRAVITY_SMOOTHING * gravity.current + (1 - GRAVITY_SMOOTHING) * magnitude;

    const delta = Math.abs(magnitude - gravity.current);
    const now = Date.now();

    if (delta > STEP_THRESHOLD) {
      if (wasBelowThreshold.current && now - lastStepAt.current > STEP_DEBOUNCE_MS) {
        lastStepAt.current = now;
        setSteps((prev) => {
          const next = prev + 1;
          saveStoredSteps(next);
          return next;
        });
      }
      wasBelowThreshold.current = false;
    } else {
      wasBelowThreshold.current = true;
    }
  }, []);

  useEffect(() => {
    if (status !== 'active') return undefined;

    receivedReading.current = false;
    window.addEventListener('devicemotion', handleMotion);

    // Permission can be "granted" by a browser that still never delivers
    // real readings (e.g. a desktop with no motion hardware) — if nothing
    // arrives shortly after activating, report it honestly instead of
    // leaving the UI stuck showing a live count that never moves.
    const noSignalTimer = setTimeout(() => {
      if (!receivedReading.current) setStatus('unsupported');
    }, 4000);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      clearTimeout(noSignalTimer);
    };
  }, [status, handleMotion]);

  // Reset the counter if the app is left open across midnight.
  useEffect(() => {
    const id = setInterval(() => {
      const stored = loadStoredSteps();
      setSteps((prev) => (stored === 0 && prev !== 0 ? 0 : prev));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const requestPermission = useCallback(async () => {
    if (status === 'unsupported') return;

    // iOS 13+ gates motion access behind an explicit, user-gesture-triggered prompt.
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

  // Once the user has enabled the pedometer once, remember that choice and
  // re-activate automatically on every future visit — no need to tap
  // "הפעל מד צעדים" again each session. On platforms that gate motion
  // access behind an explicit user gesture (iOS Safari), this attempt can
  // still be silently refused by the browser since it isn't triggered by a
  // tap; when that happens the permission banner reappears so there's
  // still a one-tap way to re-enable for that session.
  useEffect(() => {
    if (status === 'idle' && wantsAutoEnable()) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return { steps, status, requestPermission };
}
