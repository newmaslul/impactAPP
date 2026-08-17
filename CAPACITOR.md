# Native wrapper (Capacitor)

Wraps this same web app in a native shell so it can read real step data
from HealthKit (iOS) / Health Connect (Android) — a website has no web
API for either, ever, so the browser-only build (`npm run build` /
`npm run deploy`, unchanged, still deployed to GitHub Pages) keeps using
the accelerometer-based estimate in `src/hooks/usePedometer.js`. Only the
Capacitor build gets real device totals.

## What's here today

- **Android**: fully scaffolded and wired. Needs Android Studio to
  actually build/run — **not available in the environment this was built
  in** (no Java/Android SDK/Gradle installed there), so this has been
  verified as far as "produces a well-formed project + syncs cleanly" but
  **not** as "runs on a device and shows a real step count." That last
  step is on you.
- **iOS**: dependencies (`@capacitor/ios`) are installed and
  `capacitor.config.json` covers both platforms, but `npx cap add ios`
  has **not** been run — it needs Xcode/CocoaPods, i.e. a Mac, which
  wasn't available. See [iOS steps](#ios-steps-once-you-have-a-mac) below.

## Building & running Android

```bash
npm run cap:sync        # builds the web app for the native shell + copies it into android/
npm run cap:open:android  # opens the android/ folder in Android Studio
```

From Android Studio: let Gradle sync finish, then Run ▶ on a connected
device or emulator. **The device (or emulator image) needs the Health
Connect app installed** — it's a separate Google-provided app, not
bundled with every Android build; on unsupported/old devices the app
should prompt to install it (`Health.isAvailable()` / the plugin's
`openHealthConnectSettings()` cover this, already wired into
`src/lib/healthAdapters/nativeHealthAdapter.js`'s `requestPermission`
flow going through `Health.isAvailable()` first).

First run: tapping "הפעילו מד צעדים" on the dashboard triggers
`Health.requestAuthorization({ read: ['steps'] })` — Android shows its
Health Connect permission sheet. Grant it, then the step tile should
start reflecting the real device total (refreshed once a minute — see
`REFRESH_INTERVAL_MS` in `nativeHealthAdapter.js`) instead of the
accelerometer estimate.

## What changed vs. the plain website

- **`vite.config.js`**: `base`/`outDir` are now conditional on a
  `CAP_BUILD` env var. `npm run build` (GitHub Pages) is completely
  unaffected — verified byte-for-byte equivalent output (same asset
  content, same `/impactAPP/` base) before and after this change.
- **`capacitor.config.json`** (new): `appId: com.maslulimpact.app`,
  `webDir: dist-capacitor`.
- **`android/`** (new, committed): the native Android project. Capacitor
  scaffolds its own `android/.gitignore` covering build output,
  `local.properties` (machine-specific SDK path), and Gradle caches — you
  don't need to touch it.
- **`src/lib/healthAdapters/nativeHealthAdapter.js`** (new): reports
  `available: false` immediately unless
  `Capacitor.isNativePlatform()` is true, so it's a complete no-op on the
  website. Reports its `id` as `'apple_health'` or `'health_connect'`
  (whichever the running platform actually is) — those two source
  strings were already reserved in `supabase/functions/activity/index.ts`'s
  `SOURCES` allow-list, so no backend change was needed.
- **`src/hooks/useActivitySync.js`**: now calls both
  `useNativeHealthAdapter()` and the existing `useDeviceSensorAdapter()`
  unconditionally every render (required by the rules of hooks), and
  prefers the native reading whenever it's available. Zero behavior
  change when running as a website.

## What's deliberately NOT done yet

- Only `steps` is read from the native plugin so far. `@capgo/capacitor-health`
  (already installed) also supports `distance`, `exerciseTime`,
  and `sleep` — natural next steps once this pattern is proven, not
  bundled in here to keep this change reviewable.
- No wiring into the sleep engine (`src/hooks/useSleepSensor.js`) yet —
  same plugin could eventually replace that hook's best-effort browser
  sensing with real sleep data, but that's a separate follow-up.
- No app icons/splash screen customization — Capacitor's defaults are in
  place; cosmetic, not blocking.
- No signing config / release build — this is a debug-buildable dev
  scaffold only.

## Distribution (not started — needs a decision first)

- **Sideload only** (fastest/cheapest to start): a debug APK installs
  directly on a test device with no store account needed at all.
- **Play Store**: one-time $25 Google Play Console registration, plus a
  privacy policy and a data-safety declaration (Health Connect apps are
  scrutinized specifically for this).
- **App Store / TestFlight** (iOS): needs the $99/year Apple Developer
  Program — required even for internal TestFlight testing, not just
  public release.

## iOS steps (once you have a Mac)

1. `npx cap add ios` — scaffolds the Xcode project (needs CocoaPods,
   which is macOS-only).
2. Add the HealthKit capability + entitlement in Xcode, and a usage
   description string in `Info.plist` (Apple requires a clear,
   human-readable explanation of why the app reads health data — App
   Review checks this).
3. Enroll in the Apple Developer Program ($99/year) — required before you
   can build a HealthKit-entitled app on a real device at all, even for
   your own testing.
4. `npx cap sync ios`, open in Xcode, run on a real device (HealthKit
   doesn't work in the iOS Simulator for step data).

`src/lib/healthAdapters/nativeHealthAdapter.js` needs no code changes for
iOS — `@capgo/capacitor-health` is the same unified API on both
platforms; the `Capacitor.getPlatform() === 'ios' ? 'apple_health' : 'health_connect'`
branch already picks the right source id automatically.
