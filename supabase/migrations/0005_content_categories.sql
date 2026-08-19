-- Extends content_items (0002_content.sql) for the "למידה" (Learning)
-- screen: category tabs, a thumbnail image, a duration label, a
-- difficulty level, and a short benefits checklist. Additive only —
-- nothing existing is renamed or removed, and points_reward/video_url
-- keep working exactly as before (XP shown in the new UI is this same
-- points_reward column, just relabeled client-side).

alter table content_items add column category text not null default 'workout'
  check (category in ('workout', 'tip', 'yoga', 'lecture'));

alter table content_items add column thumbnail_url text;

-- Free text (e.g. "5 דקות") rather than seconds — display-only, admin-entered.
alter table content_items add column duration_label text;

alter table content_items add column level text not null default 'קל'
  check (level in ('קל', 'בינוני', 'קשה'));

alter table content_items add column benefits text[] not null default '{}';
