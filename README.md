# מסלול IMPACT

> Move · Connect · Impact — הופכים פעילות אישית להשפעה משותפת

React + Vite app implementing the mobile + admin screens from [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), backed by **Supabase** (Postgres + Edge Functions) in [supabase/](./supabase).

## Backend: Supabase

- **Database**: Postgres, schema in [supabase/migrations](./supabase/migrations). RLS is enabled on every table with no client-facing policies — only the Edge Functions (using the service_role key, never shipped to the browser) can read/write. The anon/publishable key gets nothing on these tables directly.
- **Auth**: phone + password (not Supabase's built-in email/OTP-phone auth — kept custom to match the product's phone+password requirement). Password hashing via bcryptjs, sessions via a self-issued JWT (`JWT_SECRET` function secret).
- **Edge Functions** ([supabase/functions](./supabase/functions)): `auth` (register/login/biometric-login/forgot-password/me), `activity` (sync/today/history/summary/config), `admin-employees`, `admin-schools`, `admin-classes`. Shared scoring logic lives in `supabase/functions/_shared/scoring/` — pure functions (`engine.ts`) plus a Postgres-backed service layer (`service.ts`).
- **Scoring**: see `_shared/scoring/engine.ts` for the activity-score formula (steps/active-minutes/distance/vigorous-minutes, weighted, config-driven) and `_shared/scoring/validation.ts` for anti-manipulation checks (clamping, jump detection, cross-metric consistency).

### Deploying backend changes

```bash
export SUPABASE_ACCESS_TOKEN=<personal access token>
supabase db push                          # apply new migrations
supabase functions deploy <function-name> --no-verify-jwt
supabase secrets set JWT_SECRET=<value>   # only needed once / on rotation
```

## Frontend

```bash
npm install
npm run dev
```

Talks to Supabase by default (see `src/lib/api.js`); no local backend process needed. Copy `.env.example` to `.env` to point at a different Supabase project.

## Deploy (frontend)

```bash
npm run deploy
```

Builds and publishes `dist/` to the `gh-pages` branch, which GitHub Pages serves at the live URL.

## Legacy: server/ (Express + SQLite, Fly.io)

[server/](./server) is an earlier, fully-working iteration of this same API (Node/Express + SQLite, deployed to Fly.io) — superseded by the Supabase functions above but left in the repo for reference. The live frontend no longer talks to it.
