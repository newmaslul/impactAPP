-- Fixes a missing-data fairness bug found during live verification of the
-- sleep engine: consistency_score/regularity_score were NOT NULL DEFAULT
-- 0, which forced a genuine "no history yet" (null, meant to be excluded
-- from sleepScore/dailyScore per the same fairness rule used everywhere
-- else in this app) to be silently stored and read back as a real 0 —
-- unfairly dragging a new user's first-ever sleepScore/dailyScore down.
-- Both columns become nullable so "missing" and "zero" are distinguishable again.

alter table sleep_sessions alter column consistency_score drop not null;
alter table sleep_sessions alter column consistency_score drop default;
alter table sleep_sessions alter column regularity_score drop not null;
alter table sleep_sessions alter column regularity_score drop default;
