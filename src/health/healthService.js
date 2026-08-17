// Thin, hook-free wrapper around the existing adapter layer
// (src/lib/healthAdapters/*), giving it the general-purpose function
// names this integration asked for. This does NOT call HealthKit/Health
// Connect/any browser sensor API directly — it never could, since plain
// functions can't call React hooks. Every function here takes the
// already-resolved adapter object a component got from
// useActivitySync()/useNativeHealthAdapter()/useDeviceSensorAdapter() (or
// mocked props of the same shape, for testing) and just reads/reshapes
// it. The actual sensing lives entirely in the adapter hooks, same as
// before this file existed — this is a naming/shape layer on top, not a
// parallel implementation.
//
// `connecting`/`syncing` are passed in by the caller because only the
// component itself knows whether its own requestPermission()/syncNow()
// promise is currently in flight — nothing below tracks that state
// itself.

import { CONNECTION_STATUS, HEALTH_SOURCES } from './healthTypes.js';

const ADAPTER_ID_TO_SOURCE = {
  device_sensor: HEALTH_SOURCES.WEB,
  apple_health: HEALTH_SOURCES.APPLE_HEALTH,
  health_connect: HEALTH_SOURCES.HEALTH_CONNECT,
  manual: HEALTH_SOURCES.MANUAL,
};

/**
 * Maps an adapter's own `status` (`unsupported`|`idle`|`denied`|`active`,
 * shared by every hook in src/lib/healthAdapters/) onto the UI-facing
 * ConnectionStatus vocabulary.
 * @param {{status: string}} adapter
 * @param {{connecting?: boolean, syncing?: boolean}} [flags]
 * @returns {import('./healthTypes.js').ConnectionStatus}
 */
export function getHealthConnectionStatus(adapter, flags = {}) {
  if (!adapter || adapter.status === 'unsupported') return CONNECTION_STATUS.UNSUPPORTED;
  if (flags.connecting) return CONNECTION_STATUS.CONNECTING;
  if (adapter.status === 'denied') return CONNECTION_STATUS.ERROR;
  if (adapter.status === 'idle') return CONNECTION_STATUS.NOT_CONNECTED;
  // status === 'active' from here on.
  return flags.syncing ? CONNECTION_STATUS.SYNCING : CONNECTION_STATUS.CONNECTED;
}

/** Triggers the adapter's own permission flow (iOS/Android native prompt, or the web motion-permission gesture). */
export function connectHealth(adapter) {
  return adapter?.requestPermission?.();
}

/**
 * There is no JS API on any platform that can programmatically revoke a
 * granted HealthKit/Health Connect permission — only the user can do
 * that, in the OS's own health-app settings (see docs/HEALTH_PRIVACY.md).
 * This function is honest about that limit rather than faking a
 * disconnect: it returns instructions for the caller to surface, and
 * does not mutate any state (there is currently nothing analogous to
 * usePedometer.js's "remember my choice" flag on the native adapter to
 * clear — it always re-prompts on request, never silently
 * auto-reconnects).
 * @returns {{ ok: false, instructions: string }}
 */
export function disconnectHealth() {
  return {
    ok: false,
    instructions:
      'כדי לנתק לגמרי, יש לבטל את ההרשאה בהגדרות אפליקציית הבריאות של המכשיר (iOS: הגדרות ← בריאות ← שיתוף ← אפליקציות. אנדרואיד: אפליקציית Health Connect ← הרשאות אפליקציה).',
  };
}

/** @returns {number|null} today's step count, or null if not yet read. */
export function getTodaySteps(adapter) {
  return adapter?.reading?.steps ?? null;
}

/** @returns {import('./healthTypes.js').HealthSourceId|null} */
export function getHealthSource(adapter) {
  if (!adapter?.id) return null;
  return ADAPTER_ID_TO_SOURCE[adapter.id] ?? adapter.id;
}
