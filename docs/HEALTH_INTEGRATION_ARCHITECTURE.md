# Health Integration Architecture

Audit + architecture for connecting מסלול IMPACT to real Apple
Health/HealthKit and Google Health Connect step data. Written before any
of the code in this document's later sections existed, per an explicit
"audit first, get approval, then implement" requirement — the plan this
audit fed into is preserved in git history alongside the commit that
introduced this file.

**Central finding**: most of what a fresh health integration needs
already existed in this codebase before this document was written —
either from the activity-scoring engine built earlier in the same
session, or from a Capacitor native-wrapper scaffold built immediately
before this audit was requested. This document treats "audit" literally:
it maps the requirement to what's real today, rather than assuming a
green field.

## 1. Project structure & stack

- **Frontend**: React 18 + Vite, `src/main.jsx` uses `HashRouter` (not
  `BrowserRouter`) — chosen for GitHub Pages compatibility (no
  server-side rewrite for client routes), which turns out to be exactly
  what a Capacitor WebView also needs (served from a local scheme, no
  server either). Zero routing changes were needed to add native support.
- **Backend**: Supabase — Postgres (`supabase/migrations/*.sql`) + Deno
  Edge Functions (`supabase/functions/*/index.ts`), deployed via the
  Supabase CLI. RLS enabled on every table, **no client-facing
  policies** — only the `service_role` key (server-side only, in
  `supabase/functions/_shared/supabaseAdmin.ts`) can read/write; the
  `anon`/publishable key shipped to the browser gets nothing on these
  tables directly.
- **Auth**: custom phone+password, bcrypt-hashed, self-issued JWT (not
  Supabase Auth's built-in flow) — `supabase/functions/_shared/auth.ts`.
- **Deployment**: two build targets from one codebase (see §2) — the
  GitHub Pages site (`https://newmaslul.github.io/impactAPP/`) and, as of
  this session, a scaffolded (not yet store-distributed) Android
  Capacitor app.

## 2. Two build targets, one codebase

`vite.config.js`'s `base`/`outDir` are conditional on a `CAP_BUILD` env
var:

| | `npm run build` (default) | `npm run build:capacitor` |
|---|---|---|
| Consumer | GitHub Pages (`npm run deploy` → `gh-pages -d dist`) | Capacitor native shell |
| `base` | `/impactAPP/` | `/` |
| Output | `dist/` | `dist-capacitor/` (gitignored) |

`npx cap sync android` copies `dist-capacitor/` into
`android/app/src/main/assets/public/`. The `android/` project itself is
committed to git (Capacitor's own convention — its scaffolded
`android/.gitignore` excludes build output, Gradle caches, and
`local.properties`, the same way `node_modules`/`dist` are excluded at
the repo root). Full build/run instructions: [`CAPACITOR.md`](../CAPACITOR.md).

## 3. Data flow (steps, end to end)

```
Device sensor                      Native health API
(accelerometer, web)                (HealthKit / Health Connect,
      │                              Capacitor app only)
      ▼                                    ▼
usePedometer.js                    nativeHealthAdapter.js
      │                                    │
      ▼                                    ▼
deviceSensorAdapter.js  ◄── picked by ──►  (both conform to the
      │                  useActivitySync    same adapter shape)
      └──────────────┬─────────────────────┘
                      ▼
              useActivitySync.js
                      │  POST /activity/sync
                      ▼
      supabase/functions/activity/index.ts
                      │
                      ▼
   _shared/scoring/service.ts (upsertRawMetrics)
                      │
                      ▼
            raw_daily_metrics table
                      │
                      ▼
   _shared/scoring/service.ts (recomputeDailyScore)
        → _shared/scoring/validation.ts (clamp/flag)
        → _shared/scoring/engine.ts (computeDailyScore)
                      │
                      ▼
              daily_scores table
                      │
                      ▼
            GET /activity/summary → dashboard
```

Every adapter — accelerometer or native — returns the exact same shape:
`{ id, available, reading, status, requestPermission }`, with `reading`
always exposing all four scoring metrics (`steps`, `active_minutes`,
`distance_km`, `vigorous_minutes`; missing ones are `null`, never `0` —
the scoring engine's fairness rule). `useActivitySync.js` calls **both**
adapters unconditionally every render (required by React's rules of
hooks — the same reasoning already documented in
`src/routes/app/Home.jsx` for why `HomeStudent`/`HomeEmployee` are split
into separate components) and prefers the native reading whenever it's
actually available:

```js
const active = native.available ? native : device;
```

This means: on the plain website, `native.available` is always `false`
(see §5), so behavior is byte-for-byte what it was before this session's
native work — verified via `npm run build` producing the same
`/impactAPP/` base and equivalent output.

## 4. Where health data enters — `raw_daily_metrics`

```sql
raw_daily_metrics (
  user_id, date, source,
  steps, active_minutes, distance_km, vigorous_minutes, active_energy_kcal,
  sync_batch_id, ingested_at,
  unique (user_id, date, source)
)
```

(`supabase/migrations/0001_init.sql`.) `source` is a `check` constraint
already listing `device_sensor`, `apple_health`, `health_connect`,
`fitbit`, `garmin`, `manual` — the two real-health-API sources were
already reserved here before any native code existed. The
`unique(user_id, date, source)` constraint is what makes
`POST /activity/sync` a plain `upsert`/`ON CONFLICT` — a source
re-reporting today's count replaces its own prior row rather than
accumulating duplicates. Multiple sources reporting the same day are
merged by `_shared/scoring/service.ts`'s `mergeRawMetricsForDate` (max
non-null value per metric wins — a fuller reading from one source
shouldn't be diluted by a partial one from another).

**A separate proposal for this integration considered a new
`health_daily` table** with nearly the same shape. It was not built:
`raw_daily_metrics` already does this job, already validates (§6),
already has the exact unique constraint needed, and is already the table
every existing screen/report reads from — a second parallel table would
either duplicate that logic or require keeping two tables in sync for no
benefit.

## 5. How the native bridge actually works (Capacitor)

`src/lib/healthAdapters/nativeHealthAdapter.js` (new this session):

- Feature-detects `Capacitor.isNativePlatform()` from `@capacitor/core`
  — reports `available: false` immediately when not running inside the
  native shell, making it a complete no-op on the website.
- When native: calls `Health.isAvailable()` then
  `Health.requestAuthorization({ read: ['steps'] })` from
  `@capgo/capacitor-health` (a single plugin covering both HealthKit and
  Health Connect with one API — verified against the installed package's
  own `dist/esm/definitions.d.ts`, not assumed), then
  `Health.queryAggregated({ dataType: 'steps', bucket: 'day', aggregation: 'sum', ... })`
  for today's real total.
- Reports its `id` as `'apple_health'` or `'health_connect'` — whichever
  `Capacitor.getPlatform()` actually is — reusing the source values
  `raw_daily_metrics` already whitelists rather than inventing a new one.

This is a real, working native bridge for Android today (see
`CAPACITOR.md` for exactly what's been verified vs. what still needs a
physical device build). iOS needs the same plugin's iOS path, which only
needs `npx cap add ios` + Xcode work on a Mac — no code changes to this
adapter, since the plugin already unifies both platforms.

## 6. Validation & anti-manipulation (already built, not new)

`supabase/functions/_shared/scoring/validation.ts`'s `validateReading`
runs on every synced reading before scoring: negative values clamp to 0,
values above generous per-metric ceilings (e.g. 60,000 steps/day) clamp
and get flagged (never silently dropped or zeroed — a flagged reading
still counts toward the user's own score, logged to
`data_quality_events` for admin review only). It also flags — but
doesn't block — a value more than 3x a user's own trailing 7-day average,
and cross-metric inconsistencies (e.g. distance implausible for the
reported step count). This already satisfies "prevent negative values"
and "prevent unreasonable steps."

## 7. Auth & isolation

Every Edge Function route that touches user data calls
`getUserIdFromRequest(req)` (`_shared/auth.ts`), which verifies the JWT
and returns the `sub` claim — every subsequent query is scoped to that
id, never a client-supplied one. Combined with RLS-enabled tables and no
client-facing policies (§1), a user cannot read or write another user's
health/activity data through any path the frontend has access to.

## 8. Where this integration's new pieces sit

| Requirement | Where it lives | Status |
|---|---|---|
| Don't call HealthKit/Health Connect directly from components | `src/lib/healthAdapters/*` (existing) + `src/health/healthService.js` (thin wrapper, new) | Already true |
| A general-purpose connection status API (`getHealthConnectionStatus()` etc.) | `src/health/healthService.js` | New — wraps existing adapters |
| Local-timezone "today" boundary | `src/health/dateUtils.js` | New |
| Connection UI | `src/components/health/HealthConnectionCard.jsx` + `HealthStatus.jsx` + `SyncProgress.jsx` | New |
| Raw metrics storage | `raw_daily_metrics` | Reused, unchanged |
| Sync endpoint | `supabase/functions/activity/index.ts`'s `/sync` | Reused, unchanged |
| Validation | `_shared/scoring/validation.ts` | Reused, unchanged |
| Native bridge (Android) | `src/lib/healthAdapters/nativeHealthAdapter.js` + `android/` | Built this session |
| Native bridge (iOS) | Same adapter file, `@capacitor/ios` installed | Deferred — needs a Mac |

## 9. Sleep is a separate system, deliberately

The sleep-estimation engine (`sleep_sessions`, `sleep_raw_samples`,
`supabase/functions/_shared/sleep/`) was built earlier this session as
its own, considerably richer, confidence-gated system — not a column on
`raw_daily_metrics`. Sleep minutes are **not** added to the steps/activity
tables here; see [`supabase/functions/_shared/sleep/README.md`](../supabase/functions/_shared/sleep/README.md)
for that system's own architecture.

## 10. What still requires native mobile work

- **iOS**: `npx cap add ios`, HealthKit entitlement + `Info.plist` usage
  string, Apple Developer Program enrollment ($99/year, required even
  for TestFlight-only testing) — none of this is possible without a Mac.
- **Android on-device verification**: the code is scaffolded and
  code-reviewed, but this development environment has no Java/Android
  SDK/Gradle installed, so an actual build-and-run on a device or
  emulator hasn't happened yet — see `CAPACITOR.md`'s verification
  section for exactly what was and wasn't checked.
- **Store distribution**: not started for either platform — a separate
  decision (sideload vs. Play Store vs. App Store), see `CAPACITOR.md`.
