-- Adds a school access code + a student registration quota. A student
-- registering must enter the code matching the school their chosen class
-- belongs to, and registration is blocked once that school's registered
-- student count reaches its quota. Both columns are nullable so existing
-- schools keep working unchanged until an admin sets a code for them —
-- a school with no code simply can't be matched by any entered code
-- (registration for it is blocked until one is set, not broken data);
-- a school with no quota set is treated as unlimited.

alter table schools add column code text;
alter table schools add column student_quota integer;

-- Case-insensitive-friendly uniqueness would need a functional index;
-- codes are compared trimmed (not lowercased) at the application layer,
-- matching how every other free-text admin field in this app is
-- validated (title/name fields), so a plain unique index over the raw
-- value is enough here.
create unique index schools_code_unique_idx on schools (code) where code is not null;
