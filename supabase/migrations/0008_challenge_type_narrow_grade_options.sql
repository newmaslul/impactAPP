-- 1) כיתה/שכבה are no longer challenge types (that comparison lives in
--    the standalone class-ranking screen instead — see class-ranking
--    Edge Function). Adds a second, stricter check constraint rather
--    than dropping+recreating the original — Postgres ANDs multiple
--    CHECK constraints on the same column, so the net effect is
--    identical without needing to know the original's auto-generated
--    name.
alter table challenges add constraint challenges_type_narrowed_check
  check (type in ('steps', 'distance', 'sleep'));

-- 2) A class's grade is now chosen from a fixed list (א'-י') in the UI
--    instead of free text — enforce the same list at the DB level.
alter table classes add constraint classes_grade_check
  check (grade is null or grade in ('א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'));
