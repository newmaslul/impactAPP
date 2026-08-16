import { usePedometer } from '../../hooks/usePedometer.js';

// The Data Adapter layer: each adapter exposes the same shape (a React
// hook returning { available, reading, status, requestPermission }) so
// useActivitySync.js can treat every source identically and new adapters
// can be added without touching the sync logic. `reading` always has all
// four scoring metrics as keys — fields the adapter can't supply stay
// `null` (missing), never 0, per the scoring engine's fairness rule.
//
// This is the one REAL adapter today: it wraps the existing
// usePedometer.js accelerometer-based step counter. It can only supply
// steps — active minutes/distance/vigorous minutes aren't derivable from
// raw accelerometer peaks alone, so they stay missing from this source.
export function useDeviceSensorAdapter() {
  const { steps, status, requestPermission } = usePedometer();

  const available = status !== 'unsupported';
  const reading = status === 'active'
    ? { steps, active_minutes: null, distance_km: null, vigorous_minutes: null, active_energy_kcal: null }
    : null;

  return { id: 'device_sensor', available, reading, status, requestPermission };
}
