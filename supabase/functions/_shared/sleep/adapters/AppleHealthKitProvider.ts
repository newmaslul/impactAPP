// HealthKit sleep-analysis data (HKCategoryTypeIdentifierSleepAnalysis)
// exists only inside a native iOS app — there is no web API, ever. Same
// conclusion already reached for step data (src/lib/healthAdapters/
// stubAdapters.js): this isn't a missing credential, it's a platform
// restriction. Ships as an honest, clearly-labeled stub so the pipeline
// (and future native wrapping) has a real slot to plug into, typed to
// return actual sleep-stage data once real integration exists — never
// guessed from phone data alone (§17).

import type { SleepStageProvider } from './types.ts';

export const AppleHealthKitProvider: SleepStageProvider = {
  id: 'healthkit',
  available: false,
  reason: 'HealthKit נגיש רק מאפליקציה native ל-iOS — אין API דרך אתר אינטרנט.',
  async fetchLatest() {
    return null;
  },
};
