-- G Newsletter: schema, security policies and starter content.
-- Run this whole file in Supabase -> SQL Editor. Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).

create extension if not exists pgcrypto;

create table if not exists quarters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  title text not null,
  issue_no int not null default 1,
  sort int not null default 1,
  is_published boolean not null default false,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references quarters(id) on delete cascade,
  slug text not null,
  n text not null default '01',
  position int not null default 1,
  title text not null default '',
  short text not null default '',
  descr text not null default '',
  headline text not null default '',
  quote text not null default '',
  photo_url text not null default '',
  read_min int not null default 1,
  points jsonb not null default '[]'::jsonb,
  body jsonb not null default '[]'::jsonb
);

create table if not exists section_blocks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  position int not null default 1,
  type text not null,
  col_span int not null default 1,
  row_span int not null default 1,
  content jsonb not null default '{}'::jsonb
);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists admins (email text primary key);

-- ---------- Row Level Security ----------
alter table quarters enable row level security;
alter table sections enable row level security;
alter table section_blocks enable row level security;
alter table site_settings enable row level security;
alter table admins enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Public can read published quarters (and their sections/blocks); admins can do everything.
drop policy if exists quarters_read on quarters;
create policy quarters_read on quarters for select using (is_published or is_admin());
drop policy if exists quarters_write on quarters;
create policy quarters_write on quarters for all using (is_admin()) with check (is_admin());

drop policy if exists sections_read on sections;
create policy sections_read on sections for select using (
  is_admin() or exists (select 1 from quarters q where q.id = quarter_id and q.is_published));
drop policy if exists sections_write on sections;
create policy sections_write on sections for all using (is_admin()) with check (is_admin());

drop policy if exists blocks_read on section_blocks;
create policy blocks_read on section_blocks for select using (
  is_admin() or exists (select 1 from sections s join quarters q on q.id = s.quarter_id
                        where s.id = section_id and q.is_published));
drop policy if exists blocks_write on section_blocks;
create policy blocks_write on section_blocks for all using (is_admin()) with check (is_admin());

drop policy if exists settings_read on site_settings;
create policy settings_read on site_settings for select using (true);
drop policy if exists settings_write on site_settings;
create policy settings_write on site_settings for all using (is_admin()) with check (is_admin());

drop policy if exists admins_self on admins;
create policy admins_self on admins for select using (lower(email) = lower(auth.jwt() ->> 'email'));

-- ---------- Media storage (image uploads from the editor) ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id = 'media');
drop policy if exists media_admin_write on storage.objects;
create policy media_admin_write on storage.objects for all
  using (bucket_id = 'media' and is_admin()) with check (bucket_id = 'media' and is_admin());

-- ---------- Starter content (edit everything later in /admin) ----------
insert into quarters (slug, label, title, issue_no, sort, is_published, content)
values ('q1-2027', 'Q1 2027', 'The Foundation Issue', 1, 1, true, $json$
{
  "images": {
    "hero": "/images/hero.png", "transform": "/images/transform.png", "walkway": "/images/walkway.png",
    "blocks": "/images/blocks.png", "ai": "/images/ai.png", "people": "", "challenge": ""
  },
  "hero": {
    "eyebrow": "Quarterly Journal / Issue 01",
    "title": "Building what comes next",
    "sub": "Stories, progress and ideas from across G Developments.",
    "cta": "Read the issue", "link": "Jump to highlights"
  },
  "intro": {
    "label": "Editor's note",
    "quote": "Every quarter we pause to look at what we built, and who built it.",
    "note": "Welcome to the first issue of our quarterly journal."
  },
  "stories": {
    "label": "Quarterly highlights", "meta": "Q1 2027",
    "feature": { "tag": "Feature", "title": "Feature story title", "desc": "A short description of the lead story.", "slug": "feature-story", "cta": "Read story" },
    "cards": [
      { "tag": "Projects", "title": "First card title", "slug": "feature-story", "cta": "Read more" },
      { "tag": "People", "title": "Second card title", "desc": "A short description.", "slug": "feature-story", "cta": "Read more" },
      { "tag": "Delivery", "title": "Third card title", "slug": "feature-story", "cta": "Read more" }
    ]
  },
  "directory": { "label": "In this issue", "title": "Section directory" },
  "ai": {
    "label": "AI Corner", "title": "Idea of the quarter", "desc": "A practical way to use AI at work.",
    "promptLabel": "Try this prompt", "prompt": "Summarise this report in five bullet points."
  },
  "poll": {
    "label": "Poll", "question": "What should we cover next quarter?",
    "options": ["Projects", "People", "Technology"], "submit": "Submit",
    "thanks": "Thank you.", "thanksNote": "Your vote has been recorded."
  },
  "challenge": {
    "label": "Take a break", "number": "01", "title": "Quarterly challenge",
    "desc": "A short puzzle to step away from the screen.", "slug": "feature-story", "cta": "Play"
  },
  "archive": { "label": "Archive", "title": "Past editions", "desc": "Every issue, in one place." }
}
$json$::jsonb)
on conflict (slug) do nothing;

insert into sections (quarter_id, slug, n, position, title, short, descr, headline, quote, read_min, points, body)
select id, 'feature-story', '01', 1, 'Feature story', 'Feature story', 'The lead story of the issue.',
       'Headline goes here.', 'A short pull quote.', 3,
       '[["Point one",""],["Point two",""],["Point three",""]]'::jsonb,
       '["Write the opening paragraph."]'::jsonb
from quarters where slug = 'q1-2027'
  and not exists (select 1 from sections s where s.quarter_id = quarters.id);

insert into site_settings (key, value) values
  ('design', '{"paper":"#f1f0ec","stone":"#d9d8d2","ink":"#111111","soot":"#3b3b3b","fontDisplay":"Manrope","fontBody":"Inter"}'),
  ('brand', '{"wordmark":"G Developments","headerTag1":"Quarterly Journal","footerNote1":"Quarterly Journal / Issue 01","footerNote2":"For internal viewing only","copyright":"© 2027 G Developments","logoUrl":""}')
on conflict (key) do nothing;

-- ---------- Admin access ----------
-- 1) Supabase -> Authentication -> Users -> Add user (email + password).
-- 2) Uncomment and run with that same email:
-- insert into admins (email) values ('you@example.com') on conflict do nothing;
