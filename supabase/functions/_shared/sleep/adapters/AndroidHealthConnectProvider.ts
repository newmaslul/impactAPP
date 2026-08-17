// Health Connect's SleepSessionRecord is exposed only through the Android
// SDK inside a native/wrapped app — no web API. Same shape and honesty as
// AppleHealthKitProvider.ts.

import type { SleepStageProvider } from './types.ts';

export const AndroidHealthConnectProvider: SleepStageProvider = {
  id: 'health_connect',
  available: false,
  reason: 'Health Connect נגיש רק מאפליקציה native לאנדרואיד — אין API דרך אתר אינטרנט.',
  async fetchLatest() {
    return null;
  },
};
