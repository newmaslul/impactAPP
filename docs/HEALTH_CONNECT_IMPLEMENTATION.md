# Google Health Connect Implementation

**Status: built and scaffolded, not yet device-verified.** Unlike the
iOS document, this describes real, shipped code — `src/lib/healthAdapters/nativeHealthAdapter.js`,
`android/` (the scaffolded Capacitor project), and `@capgo/capacitor-health`
are all already in the repo. What's missing is purely running it on an
actual device or emulator: this development environment has no Java,
Android SDK, or Gradle installed, so `npm run cap:open:android` →
build → grant permission → confirm a real step count has not been
performed here. See [`CAPACITOR.md`](../CAPACITOR.md) for exact commands.

## What Health Connect requires

- **`StepsRecord`** — Health Connect's step-count record type.
  `@capgo/capacitor-health` abstracts this behind `HealthDataType: 'steps'`,
  same as HealthKit — the adapter code is platform-agnostic.
- **The Health Connect app itself** must be present on the device — it's
  a separate Google-provided app (pre-installed on many recent Android
  phones, but not guaranteed, and not part of AOSP itself). If it's
  missing, `Health.isAvailable()` returns `available: false`, which
  `nativeHealthAdapter.js`'s `requestPermission()` already handles by
  setting `status: 'denied'` rather than throwing. The plugin also
  exposes `openHealthConnectSettings()` for directing a user to install
  or manage it — not yet wired into a UI prompt in this phase (a
  reasonable follow-up once real devices are available to test the
  actual prompt copy against).
- **Minimum SDK**: Health Connect needs Android 8.0+ (API 26+); the
  plugin's own Android module declares this floor.

## Permissions

- `Health.requestAuthorization({ read: ['steps'] })` triggers Android's
  Health Connect permission sheet (a system UI, not this app's own —
  consistent look across every Health Connect–integrated app on the
  device).
- Health Connect caps reads to roughly the last 30 days by default. The
  plugin supports requesting the additional
  `READ_HEALTH_DATA_HISTORY` permission (`requestHistoryAccess: true`)
  for older data — **not requested in this phase**, since the app only
  ever needs *today's* total; this is flagged here in case a future
  "steps history" feature needs it, which would also require declaring
  `<uses-permission android:name="android.permission.health.READ_HEALTH_DATA_HISTORY" />`
  in `android/app/src/main/AndroidManifest.xml` (not present today).
- The base `steps` read/write permission itself does **not** need a
  manual `AndroidManifest.xml` entry from this app — Health Connect
  permissions are declared by the plugin's own Android library manifest
  and merged in automatically by Gradle's manifest merger (verified by
  reading `android/app/src/main/AndroidManifest.xml` after `cap add
  android`: it only lists `INTERNET`, confirming the plugin manages its
  own permission declarations rather than requiring this app to
  duplicate them).

## Reading today's steps

`Health.queryAggregated({ dataType: 'steps', startDate: <local midnight>, endDate: <now>, bucket: 'day', aggregation: 'sum' })`
— already implemented in `nativeHealthAdapter.js`'s `fetchSteps()`,
polled every 60 seconds while `status === 'active'`.

## Aggregation

Health Connect can hold step records from multiple contributing apps
(the phone's own Fit/Health app, a fitness tracker's companion app,
etc.) — `queryAggregated`'s `sum` aggregation over a day bucket handles
this the same way Android's own Health Connect UI totals a day, so no
manual merge is needed on the Health Connect side (same note as the
HealthKit doc — this is separate from `raw_daily_metrics`'s own
cross-*adapter* merge).

## Timezone

Same principle as the HealthKit doc: Health Connect stores real instants
and Android resolves "today" using the device's own timezone;
`src/health/dateUtils.js` computes the local-midnight boundary on the
device before querying, rather than relying on any UTC assumption (the
backend's own date math in `_shared/scoring/dates.ts` is intentionally
UTC-safe, but that's a different, server-side concern — see
`HEALTH_INTEGRATION_ARCHITECTURE.md` §5).

## Background sync

Not implemented — same foreground-only model as the rest of this app
(see the Apple Health doc's equivalent section). A real background sync
would need Android's WorkManager plus a Health Connect background-read
declaration; out of scope for this phase.

## Auth against Supabase

No new mechanism — flows through the same `useActivitySync.js` →
`api.activitySync()` → `POST /activity/sync` path as every other source,
authenticated by the JWT already stored from login. See
`HEALTH_INTEGRATION_ARCHITECTURE.md` §3/§7.

## Sending data to the sync endpoint

The existing `/activity/sync` route, unchanged — see
`HEALTH_INTEGRATION_ARCHITECTURE.md` §4/§6.

## Remaining work, concretely

1. Install Android Studio + the Android SDK + a JDK on a machine that has
   them (this dev environment doesn't).
2. `npm run cap:sync`, `npm run cap:open:android`, let Gradle sync.
3. Run on an emulator with Health Connect installed, or a real device.
4. Tap "הפעילו מד צעדים" (the connection banner), grant the Health
   Connect permission sheet.
5. Confirm the step tile shows a real device total instead of the
   accelerometer estimate, and that it updates roughly once a minute.
6. If the Health Connect app isn't present on the test device/emulator,
   confirm the adapter falls back to `status: 'denied'` cleanly rather
   than crashing — this specific path (`Health.isAvailable()` returning
   `false`) is implemented but not yet exercised against a real "Health
   Connect not installed" device.
