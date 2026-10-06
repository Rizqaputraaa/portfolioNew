-- Client Workspace (/workspace/[slug]) — run once in Supabase SQL Editor.
-- All access goes through server API routes using the service-role key, so RLS is enabled
-- with NO policies: anon/authenticated roles cannot read or write these tables directly.

create table if not exists public.ws_projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  month_label   text,                       -- e.g. "Oktober 2026"
  target_feeds  integer not null default 10,
  created_at    timestamptz not null default now()
);

create table if not exists public.ws_members (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.ws_projects(id) on delete cascade,
  role             text not null check (role in ('designer', 'gozi', 'client')),
  name             text not null,
  pin_hash         text not null,           -- scrypt "salt:hash"
  failed_attempts  integer not null default 0,
  locked_until     timestamptz,
  unique (project_id, role)
);

create table if not exists public.ws_feeds (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.ws_projects(id) on delete cascade,
  number      integer not null,
  title       text not null default '',
  status      text not null default 'brief'
              check (status in ('brief', 'design', 'review', 'revision', 'approved', 'posted')),
  post_date   date,
  caption     text,
  created_by  text not null check (created_by in ('designer', 'gozi', 'client')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, number)
);

-- Brief per slide. Max 3 slides per feed (enforced by the position check + unique).
create table if not exists public.ws_slides (
  id         uuid primary key default gen_random_uuid(),
  feed_id    uuid not null references public.ws_feeds(id) on delete cascade,
  position   integer not null check (position between 1 and 3),
  headline   text not null default '',
  body       text not null default '',
  highlight  text not null default '',
  unique (feed_id, position)
);

-- Files: raw briefs (docx / images from client or Gozi) and designer deliverables.
create table if not exists public.ws_files (
  id          uuid primary key default gen_random_uuid(),
  feed_id     uuid not null references public.ws_feeds(id) on delete cascade,
  kind        text not null check (kind in ('brief', 'design')),
  version     integer,                      -- design files only (v1, v2, ...)
  slide       integer check (slide between 1 and 3),   -- design files only
  path        text not null,                -- storage path in the private "workspace" bucket
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by text not null check (uploaded_by in ('designer', 'gozi', 'client')),
  created_at  timestamptz not null default now()
);

-- Comments, revision requests and the activity trail in one table.
create table if not exists public.ws_comments (
  id          uuid primary key default gen_random_uuid(),
  feed_id     uuid not null references public.ws_feeds(id) on delete cascade,
  role        text not null check (role in ('designer', 'gozi', 'client', 'system')),
  kind        text not null default 'comment'
              check (kind in ('comment', 'revision', 'approval', 'system')),
  visibility  text not null default 'internal' check (visibility in ('internal', 'all')),
  body        text not null,
  version     integer,
  created_at  timestamptz not null default now()
);

create index if not exists ws_feeds_project_idx    on public.ws_feeds (project_id, number);
create index if not exists ws_files_feed_idx       on public.ws_files (feed_id, kind, version);
create index if not exists ws_comments_feed_idx    on public.ws_comments (feed_id, created_at);

alter table public.ws_projects enable row level security;
alter table public.ws_members  enable row level security;
alter table public.ws_feeds    enable row level security;
alter table public.ws_slides   enable row level security;
alter table public.ws_files    enable row level security;
alter table public.ws_comments enable row level security;

-- Private bucket for briefs + deliverables (served only through signed URLs).
insert into storage.buckets (id, name, public)
values ('workspace', 'workspace', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- ── v2 ───────────────────────────────────────────────────────────────────────
-- Reference links per feed (Drive, Instagram, etc.) with free-form labels.
create table if not exists public.ws_links (
  id          uuid primary key default gen_random_uuid(),
  feed_id     uuid not null references public.ws_feeds(id) on delete cascade,
  label       text not null,
  url         text not null,
  added_by    text not null check (added_by in ('designer', 'gozi', 'client')),
  created_at  timestamptz not null default now()
);
create index if not exists ws_links_feed_idx on public.ws_links (feed_id, created_at);
alter table public.ws_links enable row level security;

-- Optimised preview next to the original file (design images are shown small, downloaded full).
alter table public.ws_files add column if not exists preview_path text;

-- PIN-only login: lockout is tracked per project instead of per role.
alter table public.ws_projects add column if not exists failed_attempts integer not null default 0;
alter table public.ws_projects add column if not exists locked_until timestamptz;

notify pgrst, 'reload schema';

-- ── v3: brief goes to the client for review before it reaches the designer ────
alter table public.ws_feeds drop constraint if exists ws_feeds_status_check;
alter table public.ws_feeds add constraint ws_feeds_status_check
  check (status in ('brief', 'brief_review', 'design', 'review', 'revision', 'approved', 'posted'));

-- Gozi is now shown as "Danta" (the internal role key stays 'gozi').
update public.ws_members  set name = 'Danta' where role = 'gozi' and name = 'Gozi';
update public.ws_comments set body = replace(body, 'Gozi', 'Danta') where body like '%Gozi%';

notify pgrst, 'reload schema';

-- ── v4: client brief revisions (a proposal Danta applies or handles manually) + "new" badges ──
create table if not exists public.ws_brief_revisions (
  id           uuid primary key default gen_random_uuid(),
  feed_id      uuid not null references public.ws_feeds(id) on delete cascade,
  title        text not null default '',
  slides       jsonb not null default '[]'::jsonb,   -- the client's proposed slides (max 3)
  note         text,
  status       text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
-- At most one open proposal per feed; the client updates it until Danta handles it.
create unique index if not exists ws_brief_revisions_one_pending
  on public.ws_brief_revisions (feed_id) where status = 'pending';
alter table public.ws_brief_revisions enable row level security;

-- When each role last looked at each feed (drives the "baru" badge).
create table if not exists public.ws_reads (
  feed_id  uuid not null references public.ws_feeds(id) on delete cascade,
  role     text not null check (role in ('designer', 'gozi', 'client')),
  seen_at  timestamptz not null,
  primary key (feed_id, role)
);
alter table public.ws_reads enable row level security;

notify pgrst, 'reload schema';

-- Internal-only activity (draft designs, Danta's drafts) must not light up the client's badge:
-- updated_at = changes the client may see, team_updated_at = anything at all.
alter table public.ws_feeds add column if not exists team_updated_at timestamptz not null default now();
notify pgrst, 'reload schema';

-- v5: "Brief sudah sesuai" can be pressed once per version of the brief.
-- It is available again only when the brief changes after the client confirmed it.
alter table public.ws_feeds add column if not exists brief_changed_at   timestamptz;
alter table public.ws_feeds add column if not exists brief_confirmed_at timestamptz;
notify pgrst, 'reload schema';
