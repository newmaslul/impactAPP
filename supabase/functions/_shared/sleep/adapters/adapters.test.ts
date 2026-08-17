// Covers the "HealthKit / Health Connect stub data" scenario: both
// report themselves honestly unavailable rather than returning fake
// sleep-stage data, matching the src/lib/healthAdapters/stubAdapters.js
// pattern already used for step data.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { AppleHealthKitProvider } from './AppleHealthKitProvider.ts';
import { AndroidHealthConnectProvider } from './AndroidHealthConnectProvider.ts';
import { WearableProvider } from './WearableProvider.ts';

for (const provider of [AppleHealthKitProvider, AndroidHealthConnectProvider, WearableProvider]) {
  Deno.test(`${provider.id}: reports unavailable with an honest reason, never fake data`, async () => {
    assertEquals(provider.available, false);
    assertEquals(typeof provider.reason, 'string');
    assertEquals((provider.reason.length ?? 0) > 0, true);
    assertEquals(await provider.fetchLatest(), null);
  });
}
