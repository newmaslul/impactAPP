-- Sleep Estimation Engine schema. See supabase/functions/_shared/sleep/README.md
-- for the full design, formulas, and platform-constraint notes. This is
-- explicitly a Sleep Estimation Engine, not a medical device — phone-only
-- results must always ship with a confidence score and be labeled
-- "שינה משוערת" in the UI, never presented as a certain measurement.

alter table users add column age integer;

-- Versioned, mirrors scoring_config: a new row per admin change, history
-- never mutated.
create table sleep_config (
  id bigint generated always as identity primary key,
  effective_from date not null,
  sleep_probability_threshold numeric not null default 0.75,
  min_sleep_windows integer not null default 4,
  window_size_minutes integer not null default 5,
  awake_probability_threshold numeric not null default 0.60,
  min_awake_windows integer not null default 2,
  created_at timestamptz not null default now()
);

insert into sleep_config (effective_from) values ('2020-01-01');

-- Externalized sleep-goal ranges by age (§11) — editable without a code
-- change. 19-120 is this implementation's addition (not in the original
-- two bands) so the same engine covers adult employee accounts, not just
-- the two child bands given.
create table sleep_age_bands (
  id bigint generated always as identity primary key,
  min_age integer not null,
  max_age integer not null,
  target_min_hours numeric not null,
  target_max_hours numeric not null,
  created_at timestamptz not null default now()
);

insert into sleep_age_bands (min_age, max_age, target_min_hours, target_max_hours) values
  (6, 12, 9, 12),
  (13, 18, 8, 10),
  (19, 120, 7, 9);

-- Raw samples from whatever provider is active (§2-3). Deleted once a
-- session is scored — only the aggregated sleep_sessions row is kept
-- long-term (privacy minimization, §18).
create table sleep_raw_samples (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  "timestamp" timestamptz not null,
  screen_activity numeric not null default 0,
  touch_activity numeric not null default 0,
  motion_activity numeric not null default 0,
  app_activity numeric not null default 0,
  charging boolean,
  source text not null check (source in ('phone_sensor','healthkit','health_connect','wearable','manual')),
  created_at timestamptz not null default now()
);

create index sleep_raw_samples_user_time_idx on sleep_raw_samples (user_id, "timestamp");

-- §20 field list, exactly.
create table sleep_sessions (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  date date not null,
  sleep_start timestamptz,
  sleep_end timestamptz,
  time_in_bed_minutes integer not null default 0,
  estimated_sleep_minutes integer not null default 0,
  awake_minutes integer not null default 0,
  interruptions integer not null default 0,
  source text not null check (source in ('phone_sensor','healthkit','health_connect','wearable','manual')),
  confidence_score integer not null default 0,
  duration_score numeric not null default 0,
  consistency_score numeric not null default 0,
  regularity_score numeric not null default 0,
  sleep_score numeric,
  status text not null check (status in ('LOW_CONFIDENCE','ESTIMATED','GOOD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- The new top-level composite (§16), alongside the existing per-metric
-- columns on the same (user, date) row rather than a parallel table.
alter table daily_scores add column daily_score numeric;

alter table sleep_config enable row level security;
alter table sleep_age_bands enable row level security;
alter table sleep_raw_samples enable row level security;
alter table sleep_sessions enable row level security;
