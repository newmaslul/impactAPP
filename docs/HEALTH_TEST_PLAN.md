# Health Integration Test Plan

Each scenario is marked with what's actually been verified vs. what still
needs a real device/environment this development setup doesn't have (no
Java/Android SDK, no Mac — see `CAPACITOR.md`). "Verified" means run and
observed to behave as described; "code-reviewed" means the logic exists
and was read through against the requirement but not executed end-to-end;
"not yet" means genuinely untested.

## Web

| Scenario | Status | Notes |
|---|---|---|
| User not connected (pedometer never enabled) | **Verified** | `PedometerBanner.jsx`'s `idle` state, exercised throughout this session |
| User connected (pedometer active) | **Verified** | Live on production; confirmed against real device motion earlier this session |
| No health API available (this is the expected web state) | **Verified** | `nativeHealthAdapter.js` reports `available: false` immediately when `Capacitor.isNativePlatform()` is false — code-reviewed and confirmed via `npm run build` producing unchanged behavior |
| Manual steps entry | **Not yet** | No manual-entry UI exists today; `raw_daily_metrics.source = 'manual'` is a valid, already-whitelisted value, but nothing in the UI currently writes it |
| Sync (accelerometer → backend) | **Verified** | `useActivitySync.js`'s throttled sync, live on production |
| Duplicate sync | **Verified** | `unique(user_id, date, source)` + `ON CONFLICT` upsert, exercised by the existing activity engine's own verification pass earlier this session |
| Invalid/implausible steps | **Verified** | `_shared/scoring/validation.ts`'s clamp+flag logic, unit-tested and curl-verified during the original activity-engine build |

## Android (Health Connect)

| Scenario | Status | Notes |
|---|---|---|
| Health Connect installed, permission flow | **Code-reviewed, not yet** | `nativeHealthAdapter.js`'s `requestPermission()` → `Health.isAvailable()` → `Health.requestAuthorization()` path is implemented per the plugin's real API (checked against its `.d.ts`), but never run on a device |
| Health Connect NOT installed | **Code-reviewed, not yet** | `Health.isAvailable()` returning `available: false` is handled (`status → 'denied'`), but never observed against a real device missing the app |
| Permission granted | **Not yet** | Needs a real permission-sheet interaction |
| Permission denied | **Not yet** | Needs a real permission-sheet interaction |
| No step data for today | **Code-reviewed, not yet** | `queryAggregated`'s empty-result path (`samples[0]?.value ?? 0`) is handled defensively but not observed live |
| Real step data present | **Not yet** | This is the actual point of the whole integration — needs a device build, see `CAPACITOR.md` |
| Sync of native reading into `raw_daily_metrics` | **Code-reviewed, not yet** | Same `useActivitySync.js` path already verified for the web adapter; the native adapter feeds the identical code path, so this is lower-risk than a from-scratch sync, but still unexecuted |

## iPhone (HealthKit)

| Scenario | Status | Notes |
|---|---|---|
| HealthKit available | **Not started** | iOS platform not yet added to the project — needs a Mac, see `docs/APPLE_HEALTH_IMPLEMENTATION.md` |
| Permission granted | **Not started** | |
| Permission denied | **Not started** | |
| No data | **Not started** | |
| Data present | **Not started** | |
| Sync | **Not started** | Same underlying code path as Android once the platform exists — the risk here is almost entirely in the native project setup (entitlements, Apple Developer enrollment), not the adapter logic |

## What "code-reviewed, not yet" actually means here

Every Android scenario above shares one real code path with the
already-*verified* web sync (`useActivitySync.js` → `api.activitySync()`
→ `/activity/sync` → validation → scoring), which lowers the real risk
meaningfully — the untested part is specifically the native
permission/read layer (`nativeHealthAdapter.js`'s calls into
`@capgo/capacitor-health`), not the rest of the pipeline. This is why the
plan this integration followed prioritized reusing the existing,
already-proven sync/scoring path over building a parallel one.

## Recommended next verification step

Run `npm run cap:sync && npm run cap:open:android` on a machine with
Android Studio installed, build to a device or emulator with Health
Connect present, and walk the Android table above top to bottom — that
single pass would move the majority of "not yet" rows to "verified."
