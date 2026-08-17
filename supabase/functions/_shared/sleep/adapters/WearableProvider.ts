// Fitbit / Garmin (and similar wearables) DO expose real sleep-stage REST
// APIs, unlike HealthKit/Health Connect — but reaching them needs a
// registered developer app, an OAuth client, and a backend to hold
// refresh tokens, none of which exist in this project yet (same
// conclusion already reached for step data in stubAdapters.js). Ships as
// a stub rather than a fake integration; becomes real once that OAuth
// infrastructure is built.

import type { SleepStageProvider } from './types.ts';

export const WearableProvider: SleepStageProvider = {
  id: 'wearable',
  available: false,
  reason: 'חיבור לשעון חכם (Fitbit/Garmin) דורש הרשמת אפליקציית OAuth ותשתית שרת לאחסון טוקנים — טרם נבנה.',
  async fetchLatest() {
    return null;
  },
};
