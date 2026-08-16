-- Admin-uploaded content (videos etc.) that students watch for bonus
-- points. Points from content are added to users.points (the existing
-- general points/achievements tally) rather than folded into the 0-100
-- daily activity_score — that formula's four weights were specified
-- precisely and sum to exactly 100, so a fifth input doesn't have a
-- principled place in it without changing weights the product owner set.

create table content_items (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  video_url text not null,
  points_reward integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per (user, content) — the unique constraint is what makes
-- "mark watched" idempotent: re-claiming an already-watched item is a
-- no-op instead of a duplicate points award.
create table content_views (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  content_id bigint not null references content_items(id),
  points_awarded integer not null default 0,
  viewed_at timestamptz not null default now(),
  unique (user_id, content_id)
);

alter table content_items enable row level security;
alter table content_views enable row level security;
