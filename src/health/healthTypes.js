// Shared vocabulary for the health-connection layer. Kept separate from
// src/lib/healthAdapters/*'s own internal `status` values (`idle` |
// `denied` | `active` | `unsupported`, shared by every adapter hook) —
// this file's `ConnectionStatus` is the UI-facing vocabulary
// HealthConnectionCard.jsx renders, mapped from adapter status by
// healthService.js's getHealthConnectionStatus().

/**
 * @typedef {'web' | 'apple_health' | 'health_connect' | 'manual'} HealthSourceId
 * Mirrors (a subset of) the `source` check-constraint on the
 * `raw_daily_metrics` table (supabase/migrations/0001_init.sql) — that
 * table also allows `device_sensor`/`fitbit`/`garmin` for other adapters
 * this layer doesn't cover. `'web'` here means "the plain browser
 * accelerometer estimate," i.e. what the table calls `device_sensor`.
 */
export const HEALTH_SOURCES = {
  WEB: 'web',
  APPLE_HEALTH: 'apple_health',
  HEALTH_CONNECT: 'health_connect',
  MANUAL: 'manual',
};

/**
 * @typedef {'not_connected' | 'connecting' | 'connected' | 'syncing' | 'error' | 'unsupported'} ConnectionStatus
 */
export const CONNECTION_STATUS = {
  NOT_CONNECTED: 'not_connected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SYNCING: 'syncing',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported',
};

/**
 * @typedef {object} HealthDailyReading
 * @property {number|null} steps
 * @property {number|null} active_minutes
 * @property {number|null} distance_km
 * @property {number|null} vigorous_minutes
 * A missing metric is `null`, never `0` — the scoring engine's fairness
 * rule (supabase/functions/_shared/scoring/engine.ts).
 */
