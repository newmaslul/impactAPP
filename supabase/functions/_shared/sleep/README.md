# Sleep Estimation Engine

Estimates nightly sleep (onset, wake, duration, interruptions) from browser
sensor signals, scores it with a confidence-gated Sleep Score, and combines
it with the existing activity engine into a new top-level Daily Score.
Shown on **both** the student and employee home screens.

**This is a Sleep *Estimation* Engine, not a medical device.** Every result
carries a confidence score and is always labeled "שינה משוערת" (estimated
sleep) in the UI — never presented as a certain measurement. No
microphone, no audio, ever.

## Why phone-only confidence is usually MEDIUM/LOW, not GOOD

This is a website, not an installed app with background permissions. A
browser tab is throttled or fully suspended once the screen locks or the
app is backgrounded — exactly what happens during real sleep. The engine
can only see what the tab is actually alive to observe, and the [`config
default`](#configuration) night window (18:00 → next 12:00 UTC, 18 hours —
chosen because there's no per-user timezone/bedtime stored yet) is wider
than any real sleep span, so some fraction of it is *always* unobserved.

Two things make this workable rather than broken:

1. **An unobserved window isn't a data hole — it's treated as weak,
   sleep-favoring evidence** (`windows.ts`'s gap-fill), so the algorithm
   can still run a full night rather than stalling on missing data.
2. **`confidence.ts`'s `sensorQuality`/`signalContinuity`** measure
   exactly how much of that fill was real vs. assumed, so a heavily
   gap-filled night is *correctly* downgraded — the `LOW_CONFIDENCE` /
   `ESTIMATED` / `GOOD` gate (§22) exists precisely so an uncertain
   estimate is never shown as a trustworthy number.

**Practical implication for `useSleepSensor.js`**: it sends a small
heartbeat sample (screen/touch/motion snapshot) every 5 minutes *whenever
the tab is actually foregrounded*, not just on motion/touch events — a
still phone that's still reporting real (non-gap) quiet samples scores far
better on `sensorQuality` than genuine silence. Verified live (see
[Verification](#verification-performed) below): a synthetic night with
real samples spanning almost the whole configured window reached
`confidence_score: 83` / `GOOD`; the same night with data only during the
active hours (a ~10-hour unobserved gap either side) landed at
`LOW_CONFIDENCE`. **Expect MEDIUM/LOW confidence to be the norm for most
real nights** — that's correct, honest behavior, not a bug.

## Architecture

Mirrors the existing activity-scoring engine's shape exactly (per the
"reuse modules, don't change architecture" instruction) — pure logic
modules, one Postgres-backed service layer, one Edge Function:

```
supabase/functions/_shared/sleep/
  types.ts        shared TypeScript types (SleepSample, SleepWindow, SleepSessionResult, ...)
  config.ts        pure: default thresholds/age-bands, findAgeBand(), getTargetSleepMinutes()
  windows.ts        pure: buckets raw samples into 5-min windows, sleepProbability/awakeProbability
  session.ts        pure: calculateSleepSession() — onset/wake run-detection, movementOnly, duration math
  confidence.ts      pure: calculateConfidence() — the 5-factor confidence score + HIGH/GOOD/MEDIUM/LOW band
  scores.ts        pure: duration/consistency/wake-regularity scores, calculateSleepScore()
  dailyScore.ts      pure: calculateDailyScore() — the new top-level composite
  service.ts        I/O: the only file that talks to Postgres — orchestrates the pure modules above
  adapters/         HealthKit/Health Connect/Wearable stage-data stubs (honestly unavailable today)
  *.test.ts         Deno.test files, colocated with each pure module

supabase/functions/sleep/index.ts   Edge Function — same internal-routing shape as activity/index.ts
supabase/migrations/0003_sleep.sql              tables + seeded config/age-bands
supabase/migrations/0004_sleep_nullable_scores.sql  fairness fix (see Errors Found below)

src/hooks/useSleepSensor.js     browser sensing (screen/touch/motion), same shape as useActivitySync.js
src/components/SleepCard.jsx    shared UI, used on both HomeStudent.jsx and Home.jsx (employee)
```

## Data model

- **`users.age`** (nullable) — selects the age band (falls back to the
  13-18 band when unset, since a student with no age recorded is more
  likely a minor than an adult).
- **`sleep_config`** — versioned like `scoring_config`: a new row per
  admin change, `effective_from` date, history never mutated.
  `sleep_probability_threshold=0.75`, `min_sleep_windows=4`,
  `window_size_minutes=5`, `awake_probability_threshold=0.60`,
  `min_awake_windows=2`.
- **`sleep_age_bands`** — externalized sleep-goal ranges: 6-12 → 9-12h,
  13-18 → 8-10h, 19-120 (this implementation's addition, covering adult
  employee accounts) → 7-9h.
- **`sleep_raw_samples`** — one row per ingested sample. Deleted once a
  finished night is scored (§18 minimization) — only the aggregated
  session is kept long-term. Today's still-accumulating samples are never
  deleted mid-collection.
- **`sleep_sessions`** — one row per (user, date): `sleep_start`,
  `sleep_end`, `time_in_bed_minutes`, `estimated_sleep_minutes`,
  `awake_minutes`, `interruptions`, `source`, `confidence_score`,
  `duration_score`, `consistency_score`, `regularity_score` (the latter
  two are nullable — see below), `sleep_score`, `status`.
- **`daily_scores.daily_score`** — the new composite, alongside the
  existing per-metric activity columns on the same row.

## Formulas

**`sleepProbability` / `awakeProbability`** (per 5-min window) — the spec
fixes the four inputs (screen/touch/motion/app, each 0..1) but not a
single canonical weighting; documented here rather than invented
silently:

```
awakeProbability = 0.40·screenActivity + 0.25·touchActivity + 0.20·motionActivity + 0.15·appActivity
sleepProbability = 1 − awakeProbability
```

Phone use (screen/touch/app) is the strongest awake signal; motion alone
is weaker, since movement without phone use is common in light sleep
(handled separately as `movementOnly`, below). An unobserved window is
gap-filled at `awakeProbability = 0.15` (sleep-favoring, not neutral).

**Sleep onset**: ≥4 consecutive windows (20 min) with `sleepProbability ≥
0.75`.

**Wake**: ≥2 consecutive windows (10 min) with `awakeProbability ≥ 0.60`
**and** real phone use (`screen ≥ 0.30` or `touch ≥ 0.30` or `app ≥
0.30`) — motion alone never counts as a wake.

**`movementOnly`** (rolling over in bed): `motion > 0.60` and
`screen/touch/app < 0.10` — flagged for observability, never ends a
session or counts as an interruption.

**Duration math**: `estimatedSleepMinutes = max(0, timeInBed −
awakeMinutes)` — never negative.

**Confidence** (`confidence.ts`) — the spec fixes the five weights, not
each sub-score's formula; documented interpretation:

```
confidenceScore = 100 · (0.30·sensorQuality + 0.25·signalContinuity + 0.20·screenReliability + 0.15·usageReliability + 0.10·chargingReliability)
```

- `sensorQuality` — fraction of windows backed by a real (non-gap) sample.
- `signalContinuity` — `1 − (longest consecutive gap run / total windows)` — one long blackout hurts more than the same total gap spread thin.
- `screenReliability` — agreement rate between screen and touch activity among real windows.
- `usageReliability` — capped at a neutral 0.5 for phone-only sources (appActivity has no web API — see below), full credit once a real app-usage source exists.
- `chargingReliability` — fraction of real windows where charging state was actually known (the Battery Status API is deprecated/removed in most current browsers, so this is usually 0 — itself only 10% of the total, so it never single-handedly tanks the score).

Gate: **`< 60` → `LOW_CONFIDENCE`** (UI shows "אין מספיק נתונים", never a
bare number) · **`60–74` → `ESTIMATED`** · **`≥ 75` → `GOOD`**.

**Duration Score** — full marks inside the age band's [min,max] target
range; scaled down linearly on either side (both under- and over-sleeping
lose points), floored at 0. **Consistency Score** — 7-night rolling
stdDev of duration (0 min stdDev = 100, ≥120 min stdDev = 0). **Wake
Regularity** — same shape, but on wake *time-of-day* using a circular
stdDev (so 23:50 vs. 00:10 reads as 20 min apart, not ~23.5h). Both need
≥2 nights of history — with fewer, they're `null` and **excluded** from
`calculateSleepScore`, not defaulted to 0 (this exact fairness rule is
what migration `0004` had to go back and fix — see below).

```
sleepScore  = (60%·duration + 20%·consistency + 10%·regularity + 10%·confidence)   [missing inputs excluded, rescaled to /100]
dailyScore  = (40%·activityScore + 30%·sleepScore + 20%·stepsScore + 10%·consistencyScore)  [same rescale rule]
```

Two things are deliberate, not oversights: **`stepsScore`** is a
standalone steps/goal ratio, separate from the steps sub-metric already
inside `activityScore` (the given formula double-counts steps on
purpose). **`dailyScore`'s "Consistency"** reuses the sleep consistency
score — the spec doesn't define a separate activity-consistency metric.

**`getTargetSleepMinutes(age)`** = midpoint of the age band's [min,max]
hour range × 60 (the spec gives a range, not a single target).

## API (`supabase/functions/sleep/index.ts`)

| Route | Method | Notes |
|---|---|---|
| `/sleep/samples` | POST | `{ samples: SleepSample[] }`, auth required |
| `/sleep/today` | GET | today's session (computes it if missing) |
| `/sleep/history` | GET | `?days=N`, default 30 |
| `/sleep/summary` | GET | session + `dailyScore` (combines with the activity engine) |
| `/sleep/config` | GET | thresholds + age bands |
| `/sleep/config` | PUT | admin-editable thresholds (age bands are read-only via the API today — see Admin UI) — **intentionally open, same prototype caveat as `/activity/config`: needs an admin-role gate before production.** |

## Adapters (`adapters/`)

`AppleHealthKitProvider.ts`, `AndroidHealthConnectProvider.ts`,
`WearableProvider.ts` — all `available: false` with an honest reason,
same pattern as `src/lib/healthAdapters/stubAdapters.js`:

- **HealthKit / Health Connect**: native-only, no web API, ever — not a
  missing credential, a platform restriction.
- **Wearables (Fitbit/Garmin)**: do have real REST APIs, but need a
  registered OAuth app + a backend to hold refresh tokens, neither of
  which exists yet.

None guess sleep stages (light/core/deep/REM) from phone data — §17
explicitly prohibits that; stages only ever come from a real integration
that reports them directly.

## Privacy safeguards (§18)

- **No microphone or audio, anywhere in this module — not requested, not referenced.**
- No message/app-content storage — `appActivity` is a flag (always 0 from a website today), never content.
- No location data of any kind.
- `sleep_raw_samples` are deleted once a finished night is scored — only the aggregated `sleep_sessions` row is kept.
- Deleting a session is a plain authenticated delete on the user's own row — same mechanism as any other user data, no special case needed.
- Identity (`users`) and sleep data stay in separate tables (`sleep_sessions.user_id` FK only) — same separation the rest of the app already uses.

## iOS / Android permissions required

- **Motion** (`DeviceMotionEvent`) — iOS 13+ gates this behind an
  explicit tap-triggered `requestPermission()` prompt (same flow as
  `usePedometer.js`); Android doesn't prompt. No permission is needed for
  screen-visibility or touch/pointer signals — those are always available
  to a foregrounded tab.
- **Battery/charging** — best-effort only; most current browsers no
  longer expose the Battery Status API at all (Chrome removed it, Safari
  never shipped it), so `charging` is usually `unknown`, not denied.

## Phone-only measurement limitations

- Nothing is collected while the tab is backgrounded or the screen is
  locked — real sleep is exactly when that happens, so expect real
  samples to cluster at the edges of the night with a gap in between.
- `appActivity` (usage of *other* apps) cannot be observed from a website
  at all, ever — it's a permanently-0, explicitly-flagged input.
- Sleep *stages* (light/core/deep/REM) are never estimated from phone
  sensors alone — only a real HealthKit/Health Connect/wearable
  integration (not built yet) can report those.
- The 18-hour night window has no per-user timezone/bedtime, so a user in
  an unusual UTC offset may see a session bucketed a day off, or only
  partially captured.

## Configuration

Admin-editable at **Admin → הגדרת ציון פעילות** (bottom section):
sleep/awake probability thresholds, minimum consecutive windows, window
size. Age bands are shown for reference but are edit-via-database only
today (same "prototype, not production-hardened" caveat as the rest of
the admin config surface).

## Example calculation (from live verification)

A synthetic night — real samples 21:00→06:00 (9h, screen/touch/motion all
near-zero) plus real "awake" samples both before and after (clearing the
wake threshold) — produced, against the live deployed function:

```
sleep_start: 21:00, sleep_end: 06:00, estimated_sleep_minutes: 540 (9h)
interruptions: 0, confidence_score: 83 (GOOD)
duration_score: 100 (9h falls inside the fallback 13-18 band's 8-10h target)
sleep_score: 98  → (100·0.6 + 83·0.1) / 0.7  [consistency/regularity excluded — first night, no history]
daily_score: 98  → (98·0.3) / 0.3  [only sleepScore present — no activity/steps data for this test account]
```

## Verification performed

- **44 `Deno.test` cases** across every pure module (`deno test` from
  `supabase/functions/_shared/sleep/`), covering all 18 required
  scenarios: 9h/8h/6h clean sleep, a fully-still night, mid-night phone
  use with resumed sleep (interruption), movement-without-screen
  (`movementOnly`, never ends a session), a real final wake, multiple
  wake-ups, a no-data night, a mostly gap-filled/low-confidence night,
  HealthKit/Health Connect stub data, midnight-crossing, timezone-safety
  (UTC-instant arithmetic), 7-vs-fewer nights of history, ≥30% missing
  data, and implausible data (a session that never finds a closing wake
  run — verified to stay unclosed rather than guessing one, and to never
  go negative). All 44 pass.
- **Live end-to-end verification** against the deployed Supabase project:
  registered real test accounts, POSTed synthetic nights to
  `/sleep/samples`, and inspected `/sleep/today`, `/sleep/summary`,
  `/sleep/history`, `/sleep/config`. This run **found and fixed a real
  bug** (see below) that the unit tests, which construct `SleepWindow[]`
  directly, couldn't have caught.

### Bug found during live verification (fixed)

`sleep_sessions.consistency_score`/`regularity_score` were declared `NOT
NULL DEFAULT 0` in the original migration. `calculateSleepScore`/
`calculateDailyScore` are supposed to *exclude* a missing metric (no
history yet) and rescale the remaining weights — but the DB column
silently turned a real `null` into a stored `0`, which was then read back
as "confirmed perfectly inconsistent" instead of "unknown," pulling a new
user's very first `sleepScore`/`dailyScore` down. Confirmed live: the same
9h test session read `daily_score: 73` while the bug was live, and
`daily_score: 98` (correct) immediately after `migrations/
0004_sleep_nullable_scores.sql` made both columns nullable and
`service.ts` was fixed to stop coercing `null → 0`.

## How to run

**Tests**: `deno test --node-modules-dir=none .` from
`supabase/functions/_shared/sleep/` (Deno must be installed —
`deno --version` to check).

**Deploy**: `supabase functions deploy sleep --project-ref
qhkeqzulojmuguwzkknx --no-verify-jwt` (after `supabase db push` for any
pending migration).

**Frontend**: `useSleepSensor()` in a component starts sensing once
`requestPermission()` is called from a tap (same UX pattern as the
pedometer banner); `<SleepCard session sensorStatus requestPermission
/>` renders the result — used in both `HomeStudent.jsx` and `Home.jsx`.
