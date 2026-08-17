# Health Data Privacy

Health data is sensitive, and a meaningful share of this app's users are
children (students). This document explains what's collected, why,
where it lives, and how it's removed — for the step/activity integration
specifically. The sleep engine has its own, more extensive privacy
section: [`supabase/functions/_shared/sleep/README.md`](../supabase/functions/_shared/sleep/README.md#privacy-safeguards-18).

## What is collected

Exactly four numbers per day, per source: `steps`, `active_minutes`,
`distance_km`, `vigorous_minutes` (plus `active_energy_kcal`, stored for
reference but never used in scoring — see
`supabase/functions/_shared/scoring/engine.ts`'s header comment). That's
it. **Never collected**: raw HealthKit/Health Connect sample records,
GPS/location, heart rate, sleep stages from a health API (the sleep
engine's own phone-sensor data is a separate system with its own,
stricter rules — no microphone/audio there either), workout details, or
any other health metric the native plugin could technically read but
this app doesn't request (`nativeHealthAdapter.js` only ever calls
`Health.requestAuthorization({ read: ['steps'] })` — no other data type
is ever asked for).

## Why it's collected

To compute the existing activity score (`_shared/scoring/engine.ts`) —
steps is one of four weighted metrics that make up that score, alongside
active minutes, distance, and vigorous-activity minutes. Nothing here
adds a new *use* of health data; it only adds a more accurate *source*
(a real device pedometer instead of an in-browser accelerometer
estimate) for a number the app already collects and scores today.

## Where it's stored

`raw_daily_metrics` (Postgres, via Supabase) — one row per
(user, date, source), with `source` recording exactly which adapter
reported it (`apple_health`, `health_connect`, `device_sensor`, etc.).
RLS is enabled with **no client-facing policies**: only the
`service_role` key, held server-side inside Edge Functions and never
shipped to the browser, can read or write this table. The `anon` key the
frontend does ship gets nothing on this table directly — verified
earlier in this project by comparing an `anon`-key query (returns `[]`)
against a `service_role`-key query (returns real data) against the same
endpoint.

Every read/write on this table is scoped to the requesting user's own id,
derived from their JWT (`_shared/auth.ts`'s `getUserIdFromRequest`) —
never a client-supplied id — so one user's health data is never reachable
through another user's session.

## Retention

Rows are upserted per (user, date, source) — a source re-syncing today's
count replaces its own prior row for that day rather than accumulating
duplicates. There is currently no automatic deletion of old rows (same as
every other metric this app already stores); if you want a retention
policy (e.g. auto-delete raw metrics older than N days once they've fed
into `daily_scores`), that's a small additive change, not yet built —
flagged here rather than silently assumed.

## How a user disconnects / deletes their data

- **Revoking the native permission** (iOS Settings → Health app →
  Sharing → Apps → מסלול IMPACT, or Android's Health Connect app →
  App permissions) immediately stops this app from being able to read
  new data — no code in this app can read health data without that
  OS-level grant, by construction.
- **Deleting stored data**: a plain authenticated delete on the user's
  own `raw_daily_metrics` rows — no separate mechanism is needed, the
  same authorization model (§ above) that prevents reading another
  user's data also scopes a delete to the requesting user's own rows.
  This delete endpoint is not yet built as a dedicated UI action (today,
  admin user-removal cascades through the existing admin tooling); adding
  a self-service "disconnect and delete my health history" button is a
  small, clearly-scoped follow-up if wanted.

## What's explicitly never done

- No raw HealthKit/Health Connect sample export or long-term raw-sample
  storage — only the four aggregated daily numbers.
- No cross-user comparison or leaderboard built from raw health data
  (the existing "Personal Progress Score" compares a user only against
  their own recent history — `computePersonalProgress` in
  `_shared/scoring/engine.ts`).
- No location data of any kind, ever.
- No sharing of health data with any third party — it stays inside this
  app's own Supabase project.
