// Stub adapters — same shape as deviceSensorAdapter.js, so
// useActivitySync.js can call any of them interchangeably once they're
// real. None of these can actually be implemented from a plain website
// today:
//
// - Apple Health / HealthKit: Apple exposes HealthKit only to native
//   iOS apps (Swift/Obj-C or a native wrapper like Capacitor/React
//   Native with a HealthKit plugin). There is no web API, ever — this
//   isn't a missing credential, it's a platform restriction.
// - Google Health Connect: also native-only (Android SDK). No web API.
// - Fitbit / Garmin: both DO have real REST APIs, but need a registered
//   developer app, OAuth client credentials, and a backend to hold
//   refresh tokens — none of which exist in this project yet.
//
// Each stub reports itself unavailable rather than silently returning
// fake data, matching how the onboarding "connect activity source"
// screen already handles this honestly.

function makeStubAdapter(id) {
  return function useStubAdapter() {
    return {
      id,
      available: false,
      reading: null,
      status: 'unsupported',
      requestPermission: async () => false,
    };
  };
}

export const useAppleHealthAdapter = makeStubAdapter('apple_health');
export const useHealthConnectAdapter = makeStubAdapter('health_connect');
export const useFitbitAdapter = makeStubAdapter('fitbit');
export const useGarminAdapter = makeStubAdapter('garmin');
