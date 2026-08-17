# Apple Health / HealthKit Implementation

**Status: deferred, not yet built.** The dependency (`@capacitor/ios`) is
installed and `capacitor.config.json` covers both platforms, but
`npx cap add ios` has not been run — it requires Xcode/CocoaPods, i.e. a
Mac, which wasn't available while this was built. This document is the
specification for whoever picks that up next; it is not a description of
working code (contrast with [`HEALTH_CONNECT_IMPLEMENTATION.md`](HEALTH_CONNECT_IMPLEMENTATION.md),
which documents real, shipped Android code).

The good news: almost none of the *application* code needs writing from
scratch. `src/lib/healthAdapters/nativeHealthAdapter.js` already targets
`@capgo/capacitor-health`, which is a **single, unified plugin** covering
both HealthKit and Health Connect — the adapter's own platform branch
(`Capacitor.getPlatform() === 'ios' ? 'apple_health' : 'health_connect'`)
already picks the right source id. What's missing is purely the native
project + entitlements + a physical device to test on.

## What HealthKit requires

- **`HKQuantityTypeIdentifierStepCount`** — the step-count quantity type.
  `@capgo/capacitor-health` abstracts this behind its own
  `HealthDataType: 'steps'` — the adapter code never needs to reference
  the raw HealthKit identifier directly.
- **Entitlement**: the Xcode project needs the HealthKit capability
  enabled (Signing & Capabilities → + Capability → HealthKit).
- **`Info.plist` usage strings**: `NSHealthShareUsageDescription` (why
  the app reads health data) is required — App Review checks that this
  is a clear, honest, specific sentence, not boilerplate. Suggested text
  (Hebrew, matching the app's language): *"מסלול IMPACT קורא את מספר
  הצעדים היומי שלך מאפליקציית הבריאות כדי לחשב את ציון הפעילות שלך."*
- **Real device required for testing**: the iOS Simulator does not
  produce real HealthKit step data — verification needs a physical
  iPhone.

## Permissions flow

`nativeHealthAdapter.js`'s `requestPermission()` already implements the
correct sequence for either platform:

1. `Health.isAvailable()` — checks the native SDK is reachable at all.
2. `Health.requestAuthorization({ read: ['steps'] })` — triggers iOS's
   native HealthKit permission sheet. iOS has a real quirk here worth
   knowing: **HealthKit read permission is deliberately opaque** — even
   after a user grants it, `requestAuthorization`'s resolved status for
   *read* access can't always be trusted to reflect "granted" vs. "denied"
   the way it can on Android/Health Connect (Apple does this on purpose
   for privacy — an app is never supposed to be able to tell whether a
   user has data they're withholding vs. genuinely has none). In
   practice, this means: don't treat an empty/zero step read as
   equivalent to "denied" — a genuinely-granted permission with a
   legitimately-zero step count today looks identical to a silently
   ungranted one at the data layer. `nativeHealthAdapter.js`'s status
   model already reflects this: `status` tracks the *authorization
   request's own resolution*, not "did we ever see a nonzero read."

## Reading today's steps

Already implemented (once iOS is added) via
`Health.queryAggregated({ dataType: 'steps', startDate: <local midnight>, endDate: <now>, bucket: 'day', aggregation: 'sum' })`
— see `src/health/dateUtils.js` for the local-midnight boundary (§ below on timezone).

## Aggregation

HealthKit can report steps from multiple sources (iPhone's own motion
coprocessor, a paired Apple Watch, a third-party app that also writes to
HealthKit) — `queryAggregated`'s `sum` aggregation over a day bucket
already merges these into one total the same way Apple's own Health app
does, so the adapter doesn't need any manual cross-source merging on the
HealthKit side (contrast with `raw_daily_metrics`'s own
cross-*adapter*-source merge in `_shared/scoring/service.ts`, which is a
separate concern — merging *our own* sources, e.g. web accelerometer vs.
native, not HealthKit's internal multi-device merge).

## Timezone

HealthKit itself is timezone-aware (it stores real instants and a
device's calendar interprets "today" locally) — the client-side risk is
in *this app's* boundary calculation, not HealthKit's. `src/health/dateUtils.js`
computes "start of today" using the device's own local `Date`, not UTC —
critical, since the backend's `_shared/scoring/dates.ts` is deliberately
UTC-safe for *server-side* date math (correct there, since it operates on
an already-resolved `date` string), but "what does 'today' mean for a
step count" has to be resolved on the device, in the device's own
timezone, before that string is sent.

## Background sync

Not implemented. Today's sync model (`useActivitySync.js`) is
foreground-only, matching the existing accelerometer pedometer's own
behavior — the app only syncs while actually open. A true background
sync would need either a native background task (iOS Background App
Refresh, with its own entitlement and OS-level throttling) or a
HealthKit "observer query," both meaningfully more native code than this
phase's scope. Flagged as a real, deliberate limitation, not an
oversight — see `HEALTH_TEST_PLAN.md`'s "not tested" list.

## Auth against Supabase

No new mechanism — `Health.queryAggregated`'s result flows into the
exact same `useActivitySync.js` → `api.activitySync()` →
`POST /activity/sync` path already used by the web accelerometer
adapter, authenticated by the same JWT already stored from login
(`src/lib/api.js`'s `getToken()`). Nothing HealthKit-specific touches
auth at all.

## Sending data to the sync endpoint

Already the existing `/activity/sync` route — see
[`HEALTH_INTEGRATION_ARCHITECTURE.md`](HEALTH_INTEGRATION_ARCHITECTURE.md) §4/§6 for the full path. No new
endpoint is being built for this integration (confirmed decision, see
that document).

## Remaining work, concretely

1. `npx cap add ios` on a Mac.
2. Enable HealthKit capability + add `Info.plist` usage string in Xcode.
3. Enroll in the Apple Developer Program.
4. `npx cap sync ios`, build, run on a real device.
5. Grant the permission prompt, confirm a real step count appears in the
   dashboard's step tile the same way it already does on Android.
6. No `nativeHealthAdapter.js` code changes expected — if the plugin's
   iOS path returns data in an unexpected shape, that's the one place to
   check.
