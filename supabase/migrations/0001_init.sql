-- Ported from server/db.js (SQLite) to Postgres. Same shape, with proper
-- boolean/date/jsonb types and a real ON CONFLICT-friendly unique
-- constraint on raw_daily_metrics for the (user, date, source) upsert.
--
-- RLS: enabled on every table with NO client-facing policies. Only the
-- service_role key (held server-side by the Edge Functions, never the
-- browser) can read/write these — the same trust model the Express app
-- used (all access went through the API, never direct DB access from the
-- client). The anon/publishable key gets nothing on these tables by
-- default with RLS on and no policies.

create extension if not exists pgcrypto;

create table schools (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table classes (
  id bigint generated always as identity primary key,
  school_id bigint not null references schools(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table users (
  id bigint generated always as identity primary key,
  phone text unique not null,
  username text not null,
  department text not null default '',
  role text not null default 'employee',
  status text not null default 'active',
  password_hash text,
  biometric_enabled boolean not null default false,
  points integer not null default 0,
  weekly_activity integer not null default 0,
  class_id bigint references classes(id),
  created_at timestamptz not null default now()
);

-- Versioned: a new row per admin change, never mutated, so historical
-- scores stay reproducible under whatever config was effective that day.
create table scoring_config (
  id bigint generated always as identity primary key,
  effective_from date not null,
  steps_goal integer not null default 10000,
  steps_weight numeric not null default 40,
  active_minutes_goal integer not null default 60,
  active_minutes_weight numeric not null default 30,
  distance_goal_km numeric not null default 6,
  distance_weight numeric not null default 15,
  vigorous_minutes_goal integer not null default 20,
  vigorous_weight numeric not null default 15,
  created_at timestamptz not null default now()
);

insert into scoring_config
  (effective_from, steps_goal, steps_weight, active_minutes_goal, active_minutes_weight, distance_goal_km, distance_weight, vigorous_minutes_goal, vigorous_weight)
values
  ('2020-01-01', 10000, 40, 60, 30, 6, 15, 20, 15);

-- One row per ingestion event (an adapter reporting a reading for a date).
-- The unique constraint is what makes the (user,date,source) upsert in
-- the sync endpoint a plain ON CONFLICT — the app's duplicate-prevention
-- mechanism.
create table raw_daily_metrics (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  date date not null,
  source text not null check (source in ('device_sensor','apple_health','health_connect','fitbit','garmin','manual')),
  steps integer,
  active_minutes integer,
  distance_km numeric,
  vigorous_minutes integer,
  active_energy_kcal numeric,
  sync_batch_id text,
  ingested_at timestamptz not null default now(),
  unique (user_id, date, source)
);

create table daily_scores (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  date date not null,
  steps_value integer,
  steps_missing boolean not null default false,
  steps_score numeric not null default 0,
  active_minutes_value integer,
  active_minutes_missing boolean not null default false,
  active_minutes_score numeric not null default 0,
  distance_value numeric,
  distance_missing boolean not null default false,
  distance_score numeric not null default 0,
  vigorous_value integer,
  vigorous_missing boolean not null default false,
  vigorous_score numeric not null default 0,
  raw_total numeric not null default 0,
  max_possible numeric not null default 0,
  activity_score numeric,
  scoring_config_id bigint references scoring_config(id),
  quality_flags jsonb,
  calculated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table data_quality_events (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  date date not null,
  metric text not null,
  flag_type text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table schools enable row level security;
alter table classes enable row level security;
alter table users enable row level security;
alter table scoring_config enable row level security;
alter table raw_daily_metrics enable row level security;
alter table daily_scores enable row level security;
alter table data_quality_events enable row level security;
