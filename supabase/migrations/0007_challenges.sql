-- Real backend for the admin "צור אתגר" form (previously local-state-only
-- mock data in AdminChallenges.jsx) plus a `grade` field on classes,
-- needed so a 'grade' (שכבה)-typed challenge can roll multiple classes
-- up into one leaderboard the same way 'class' (כיתה) rolls students up
-- into one class.

alter table classes add column grade text;

create table challenges (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null check (type in ('steps', 'distance', 'sleep', 'class', 'grade')),
  start_date date not null,
  end_date date not null,
  goal numeric not null,
  -- Which audience category this challenge is scoped to, e.g. {'grade'},
  -- {'school'}, or both — same "category flags, no specific-value picker"
  -- shape the admin form already used for company/departments/groups.
  audience text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table challenges enable row level security;
