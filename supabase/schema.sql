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
-- One row per reader vote on an edition's poll.
create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references quarters(id) on delete cascade,
  choice text not null check (
    char_length(choice) between 1 and 200
  ),
  created_at timestamptz not null default now()
);
create index if not exists poll_votes_quarter on poll_votes (quarter_id);
-- Scheduled publishing: an edition goes live by itself once publish_at has passed.
alter table quarters
add column if not exists publish_at timestamptz;
-- ---------- Row Level Security ----------
alter table quarters enable row level security;
alter table sections enable row level security;
alter table section_blocks enable row level security;
alter table site_settings enable row level security;
alter table admins enable row level security;
alter table poll_votes enable row level security;
create or replace function is_admin() returns boolean language sql stable security definer
set search_path = public as $$
select exists (
    select 1
    from admins
    where lower(email) = lower(auth.jwt()->>'email')
  );
$$;
-- Public can read published quarters (and their sections/blocks); admins can do everything.
drop policy if exists quarters_read on quarters;
create policy quarters_read on quarters for
select using (
    is_published
    or publish_at <= now()
    or is_admin()
  );
drop policy if exists quarters_write on quarters;
create policy quarters_write on quarters for all using (is_admin()) with check (is_admin());
drop policy if exists sections_read on sections;
create policy sections_read on sections for
select using (
    is_admin()
    or exists (
      select 1
      from quarters q
      where q.id = quarter_id
        and (
          q.is_published
          or q.publish_at <= now()
        )
    )
  );
drop policy if exists sections_write on sections;
create policy sections_write on sections for all using (is_admin()) with check (is_admin());
drop policy if exists blocks_read on section_blocks;
create policy blocks_read on section_blocks for
select using (
    is_admin()
    or exists (
      select 1
      from sections s
        join quarters q on q.id = s.quarter_id
      where s.id = section_id
        and (
          q.is_published
          or q.publish_at <= now()
        )
    )
  );
drop policy if exists blocks_write on section_blocks;
create policy blocks_write on section_blocks for all using (is_admin()) with check (is_admin());
drop policy if exists settings_read on site_settings;
create policy settings_read on site_settings for
select using (true);
drop policy if exists settings_write on site_settings;
create policy settings_write on site_settings for all using (is_admin()) with check (is_admin());
drop policy if exists admins_self on admins;
create policy admins_self on admins for
select using (lower(email) = lower(auth.jwt()->>'email'));
-- Anyone may vote on a published edition, but only for one of that poll's options. Only admins see results.
drop policy if exists poll_votes_insert on poll_votes;
create policy poll_votes_insert on poll_votes for
insert with check (
    exists (
      select 1
      from quarters q
      where q.id = quarter_id
        and (
          q.is_published
          or q.publish_at <= now()
        )
        and coalesce(q.content->'poll'->'options', '[]'::jsonb) ? choice
    )
  );
drop policy if exists poll_votes_admin on poll_votes;
create policy poll_votes_admin on poll_votes for
select using (is_admin());
drop policy if exists poll_votes_admin_delete on poll_votes;
create policy poll_votes_admin_delete on poll_votes for delete using (is_admin());
-- ---------- Editor functions (each runs as one transaction: all or nothing) ----------
-- Replaces a section's grid with p_blocks, keeping the ids of blocks that already exist.
create or replace function save_section_blocks(p_section uuid, p_blocks jsonb) returns void language plpgsql security invoker
set search_path = public as $$
declare uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin if not is_admin() then raise exception 'Only admins can edit sections';
end if;
delete from section_blocks
where section_id = p_section
  and id not in (
    select (b->>'id')::uuid
    from jsonb_array_elements(p_blocks) b
    where b->>'id' ~ uuid_re
  );
insert into section_blocks (
    id,
    section_id,
    position,
    type,
    col_span,
    row_span,
    content
  )
select case
    when b->>'id' ~ uuid_re then (b->>'id')::uuid
    else gen_random_uuid()
  end,
  p_section,
  t.ord,
  b->>'type',
  (b->>'col_span')::int,
  (b->>'row_span')::int,
  coalesce(b->'content', '{}'::jsonb)
from jsonb_array_elements(p_blocks) with ordinality as t(b, ord) on conflict (id) do
update
set position = excluded.position,
  type = excluded.type,
  col_span = excluded.col_span,
  row_span = excluded.row_span,
  content = excluded.content
where section_blocks.section_id = p_section;
end $$;
-- Saves an edition from the editor: quarter fields, its sections (added, changed, removed) and their grids.
-- p_sections is the full ordered list; each item carries its fields plus a "blocks" array.
create or replace function save_edition(p_quarter jsonb, p_sections jsonb) returns void language plpgsql security invoker
set search_path = public as $$
declare qid uuid := (p_quarter->>'id')::uuid;
uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
s jsonb;
sid uuid;
begin if not is_admin() then raise exception 'Only admins can save editions';
end if;
update quarters
set label = p_quarter->>'label',
  title = p_quarter->>'title',
  slug = p_quarter->>'slug',
  issue_no = (p_quarter->>'issue_no')::int,
  is_published = (p_quarter->>'is_published')::boolean,
  publish_at = nullif(p_quarter->>'publish_at', '')::timestamptz,
  content = p_quarter->'content',
  updated_at = now()
where id = qid;
if not found then raise exception 'Edition not found';
end if;
delete from sections
where quarter_id = qid
  and id not in (
    select (x->>'id')::uuid
    from jsonb_array_elements(p_sections) x
    where x->>'id' ~ uuid_re
  );
for s in
select value
from jsonb_array_elements(p_sections) loop sid := null;
if s->>'id' ~ uuid_re then
update sections
set slug = s->>'slug',
  n = s->>'n',
  position = (s->>'position')::int,
  title = s->>'title',
  short = s->>'short',
  descr = s->>'descr',
  headline = s->>'headline',
  quote = s->>'quote',
  photo_url = coalesce(s->>'photo_url', ''),
  read_min = (s->>'read_min')::int,
  points = s->'points',
  body = s->'body'
where id = (s->>'id')::uuid
  and quarter_id = qid
returning id into sid;
end if;
if sid is null then
insert into sections (
    quarter_id,
    slug,
    n,
    position,
    title,
    short,
    descr,
    headline,
    quote,
    photo_url,
    read_min,
    points,
    body
  )
values (
    qid,
    s->>'slug',
    s->>'n',
    (s->>'position')::int,
    s->>'title',
    s->>'short',
    s->>'descr',
    s->>'headline',
    s->>'quote',
    coalesce(s->>'photo_url', ''),
    (s->>'read_min')::int,
    s->'points',
    s->'body'
  )
returning id into sid;
end if;
perform save_section_blocks(sid, coalesce(s->'blocks', '[]'::jsonb));
end loop;
end $$;
-- Vote counts per edition and option, for the admin Quarters page.
create or replace function poll_results() returns table (quarter_id uuid, choice text, votes bigint) language sql stable security invoker
set search_path = public as $$
select v.quarter_id,
  v.choice,
  count(*)
from poll_votes v
where is_admin()
group by 1,
  2
order by 1,
  3 desc;
$$;
-- Public poll results for a live edition: totals per option only, never individual votes.
create or replace function poll_counts(p_quarter uuid) returns table (choice text, votes bigint) language sql stable security definer
set search_path = public as $$
select v.choice,
  count(*)
from poll_votes v
where v.quarter_id = p_quarter
  and exists (
    select 1
    from quarters q
    where q.id = p_quarter
      and (
        q.is_published
        or q.publish_at <= now()
      )
  )
group by 1;
$$;
-- Creates a draft edition as a full copy of p_source (content, sections, grids). Returns the new id.
create or replace function copy_quarter(
    p_source uuid,
    p_slug text,
    p_label text,
    p_title text,
    p_issue int
  ) returns uuid language plpgsql security invoker
set search_path = public as $$
declare new_q uuid;
s record;
new_s uuid;
begin if not is_admin() then raise exception 'Only admins can create editions';
end if;
insert into quarters (
    slug,
    label,
    title,
    issue_no,
    sort,
    is_published,
    content
  )
values (
    p_slug,
    p_label,
    p_title,
    p_issue,
    (
      select coalesce(max(sort), 0) + 1
      from quarters
    ),
    false,
    coalesce(
      (
        select content
        from quarters
        where id = p_source
      ),
      '{}'::jsonb
    )
  )
returning id into new_q;
for s in
select *
from sections
where quarter_id = p_source
order by position loop
insert into sections (
    quarter_id,
    slug,
    n,
    position,
    title,
    short,
    descr,
    headline,
    quote,
    photo_url,
    read_min,
    points,
    body
  )
values (
    new_q,
    s.slug,
    s.n,
    s.position,
    s.title,
    s.short,
    s.descr,
    s.headline,
    s.quote,
    s.photo_url,
    s.read_min,
    s.points,
    s.body
  )
returning id into new_s;
insert into section_blocks (
    section_id,
    position,
    type,
    col_span,
    row_span,
    content
  )
select new_s,
  b.position,
  b.type,
  b.col_span,
  b.row_span,
  b.content
from section_blocks b
where b.section_id = s.id;
end loop;
return new_q;
end $$;
-- ---------- Media storage (image uploads from the editor) ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for
select using (bucket_id = 'media');
drop policy if exists media_admin_write on storage.objects;
create policy media_admin_write on storage.objects for all using (
  bucket_id = 'media'
  and is_admin()
) with check (
  bucket_id = 'media'
  and is_admin()
);
-- ---------- Starter content (edit everything later in /admin) ----------
insert into quarters (
    slug,
    label,
    title,
    issue_no,
    sort,
    is_published,
    content
  )
values (
    'q1-2027',
    'Q1 2027',
    'The Foundation Issue',
    1,
    1,
    true,
    $json$ { "images": { "hero": "/images/hero.png",
    "transform": "/images/transform.png",
    "ai": "/images/ai.png",
    "challenge": "" },
    "hero": { "topLeft": "G / {issue}",
    "topRight": "Inside the quarter",
    "eyebrow": "Quarterly Journal / Issue {issue}",
    "title": "Building what comes next",
    "sub": "Stories, progress and ideas from across G Developments.",
    "cta": "Read the issue",
    "link": "Jump to highlights" },
    "intro": { "label": "Editor's note",
    "quote": "Every quarter we pause to look at what we built, and who built it.",
    "note": "Welcome to the first issue of our quarterly journal." },
    "stories": { "label": "Quarterly highlights",
    "meta": "{stories} stories",
    "feature": { "tag": "Feature",
    "title": "Feature story title",
    "desc": "A short description of the lead story.",
    "slug": "feature-story",
    "cta": "Read story" },
    "cards": [
      { "tag": "Projects", "title": "First card title", "desc": "", "imageUrl": "/images/walkway.png", "imageAlt": "", "slug": "feature-story", "cta": "Read the story" },
      { "tag": "People", "title": "Second card title", "desc": "A short description.", "imageUrl": "", "imageAlt": "", "slug": "feature-story", "cta": "Read the story" },
      { "tag": "Delivery", "title": "Third card title", "desc": "", "imageUrl": "/images/blocks.png", "imageAlt": "", "slug": "feature-story", "cta": "Read the story" }
    ] },
    "directory": { "label": "In this issue",
    "title": "Section directory" },
    "ai": { "label": "AI Corner",
    "title": "Idea of the quarter",
    "desc": "A practical way to use AI at work.",
    "promptLabel": "Try this prompt",
    "prompt": "Summarise this report in five bullet points." },
    "poll": { "label": "Poll",
    "question": "What should we cover next quarter?",
    "options": ["Projects", "People", "Technology"],
    "submit": "Submit",
    "thanks": "Thank you.",
    "thanksNote": "Your vote has been recorded." },
    "challenge": { "label": "Take a break",
    "number": "01",
    "title": "Quarterly challenge",
    "desc": "A short puzzle to step away from the screen.",
    "slug": "feature-story",
    "cta": "Play" },
    "archive": { "label": "Archive",
    "title": "Past editions",
    "desc": "Every issue, in one place.",
    "cardLabel": "Past edition" } } $json$::jsonb
  ) on conflict (slug) do nothing;
insert into sections (
    quarter_id,
    slug,
    n,
    position,
    title,
    short,
    descr,
    headline,
    quote,
    read_min,
    points,
    body
  )
select id,
  'feature-story',
  '01',
  1,
  'Feature story',
  'Feature story',
  'The lead story of the issue.',
  'Headline goes here.',
  'A short pull quote.',
  3,
  '[["Point one",""],["Point two",""],["Point three",""]]'::jsonb,
  '["Write the opening paragraph."]'::jsonb
from quarters
where slug = 'q1-2027'
  and not exists (
    select 1
    from sections s
    where s.quarter_id = quarters.id
  );
insert into site_settings (key, value)
values (
    'design',
    '{"paper":"#f1f0ec","stone":"#d9d8d2","ink":"#111111","soot":"#3b3b3b","fontDisplay":"Manrope","fontBody":"Inter"}'
  ),
  (
    'brand',
    '{"wordmark":"G Developments","headerTag1":"Quarterly Journal","footerNote1":"Quarterly Journal / Issue {issue}","footerNote2":"For internal viewing only","copyright":"© 2027 G Developments","logoUrl":""}'
  ) on conflict (key) do nothing;
-- ---------- Admin access ----------
-- 1) Supabase -> Authentication -> Users -> Add user (email + password).
-- 2) Uncomment and run with that same email:
-- insert into admins (email) values ('you@example.com') on conflict do nothing;