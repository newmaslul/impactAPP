-- Implements the confirmed "מנגנון האתגרים" scheme: scope (who the
-- challenge is computed over) and recurrence (how its period regenerates)
-- become real, separate fields — replacing `audience`, which was always
-- just a display label with no computational effect.

alter table challenges add column scope text not null default 'personal'
  check (scope in ('personal', 'class', 'cross_grade'));

alter table challenges add column recurrence text not null default 'once'
  check (recurrence in ('once', 'daily', 'weekly', 'monthly'));

-- "תחום בזמן" — optional cutoff date after which a recurring challenge
-- stops regenerating. Null = recurs indefinitely. Meaningless for
-- recurrence='once', which already has its own fixed end_date.
alter table challenges add column recurrence_bound_until date;

-- start_date/end_date only make sense for recurrence='once' now — a
-- daily/weekly/monthly challenge's period is computed from today, not
-- stored. Existing rows are all 'once' (the default) with real dates
-- already set, so relaxing NOT NULL is safe and lossless.
alter table challenges alter column start_date drop not null;
alter table challenges alter column end_date drop not null;

alter table challenges add constraint challenges_period_presence_check check (
  (recurrence = 'once' and start_date is not null and end_date is not null)
  or (recurrence <> 'once')
);
