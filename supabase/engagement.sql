-- G Journal: reader engagement (poll with topic suggestions, and the G Challenge).
-- Run once in Supabase -> SQL Editor, after schema.sql. Safe to re-run.
--
-- Everything here is keyed by the edition's slug (e.g. 'q1-2027') rather than a quarters row,
-- so it works the same whether edition content comes from the static files or from the CMS.
-- Readers never touch these tables directly: they call the functions below, and only admins
-- (see is_admin() in schema.sql) can read raw rows such as emails and suggestions.

-- ---------- Poll ----------
create table if not exists poll_responses (
  id uuid primary key default gen_random_uuid(),
  edition text not null,
  voter text not null check (char_length(voter) between 8 and 64),  -- random id kept in the reader's browser
  choice text not null check (char_length(choice) between 1 and 200),
  suggestion text not null default '' check (char_length(suggestion) <= 500),
  created_at timestamptz not null default now(),
  unique (edition, voter)
);
alter table poll_responses enable row level security;
drop policy if exists poll_responses_admin on poll_responses;
create policy poll_responses_admin on poll_responses for select using (is_admin());

-- One response per browser and edition; a second call from the same browser changes nothing.
-- Returns the tallies so the reader sees results straight away.
create or replace function poll_respond(p_edition text, p_voter text, p_choice text, p_suggestion text default '')
returns table (choice text, votes bigint) language plpgsql security definer set search_path = public as $$
begin
  insert into poll_responses (edition, voter, choice, suggestion)
  values (p_edition, p_voter, left(trim(p_choice), 200), left(trim(coalesce(p_suggestion, '')), 500))
  on conflict (edition, voter) do nothing;
  return query select r.choice, count(*) from poll_responses r where r.edition = p_edition group by 1;
end $$;

create or replace function poll_tally(p_edition text)
returns table (choice text, votes bigint) language sql stable security definer set search_path = public as $$
  select r.choice, count(*) from poll_responses r where r.edition = p_edition group by 1;
$$;

-- ---------- G Challenge (Sudoku) ----------
-- The solution is stored only here. Players get the puzzle when they start; the clock runs on the
-- server (started_at to the moment a correct grid arrives), so times can't be edited in the browser.
create table if not exists challenges (
  edition text primary key,
  kind text not null default 'sudoku',
  puzzle text not null check (puzzle ~ '^[0-9]{81}$'),     -- 0 = empty cell
  solution text not null check (solution ~ '^[1-9]{81}$'),
  note text not null default '',                            -- shown to players, e.g. the prize or deadline
  closes_at timestamptz,                                    -- no new starts or submissions after this
  created_at timestamptz not null default now()
);
alter table challenges enable row level security;
drop policy if exists challenges_admin on challenges;
create policy challenges_admin on challenges for all using (is_admin()) with check (is_admin());

create table if not exists challenge_attempts (
  id uuid primary key default gen_random_uuid(),            -- doubles as the player's private token
  edition text not null references challenges(edition) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) <= 200),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms bigint,
  wrong_checks int not null default 0
);
create unique index if not exists challenge_attempts_one_per_player on challenge_attempts (edition, lower(email));
alter table challenge_attempts enable row level security;
drop policy if exists challenge_attempts_admin on challenge_attempts;
create policy challenge_attempts_admin on challenge_attempts for select using (is_admin());

-- Who may enter: company email addresses only. Add domains here as needed.
create or replace function challenge_email_ok(p_email text) returns boolean language sql immutable as $$
  select lower(trim(p_email)) ~ '^[^@\s]+@(thegdevelopments\.com|gcommunities\.com)$';
$$;

create or replace function challenge_rank(p_edition text, p_ms bigint) returns bigint language sql stable security definer set search_path = public as $$
  select count(*) + 1 from challenge_attempts a where a.edition = p_edition and a.duration_ms < p_ms;
$$;

-- Public status for the edition's challenge (no puzzle, no names).
create or replace function challenge_info(p_edition text) returns jsonb language sql stable security definer set search_path = public as $$
  select case when c.edition is null then jsonb_build_object('exists', false) else jsonb_build_object(
    'exists', true, 'kind', c.kind, 'note', c.note, 'closes_at', c.closes_at,
    'open', c.closes_at is null or c.closes_at > now(),
    'players', (select count(*) from challenge_attempts a where a.edition = c.edition),
    'solved', (select count(*) from challenge_attempts a where a.edition = c.edition and a.finished_at is not null)
  ) end
  from (select 1) one left join challenges c on c.edition = p_edition;
$$;

-- Starts (or resumes) a player's single attempt. The first start fixes the clock; reloading the
-- page resumes the same attempt with the same start time. A finished player gets their result back.
create or replace function challenge_start(p_edition text, p_name text, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c challenges; a challenge_attempts;
begin
  select * into c from challenges where edition = p_edition;
  if not found then return jsonb_build_object('status', 'missing'); end if;
  if not challenge_email_ok(p_email) then return jsonb_build_object('status', 'bad_email'); end if;
  select * into a from challenge_attempts where edition = p_edition and lower(email) = lower(trim(p_email));
  if found and a.finished_at is not null then
    return jsonb_build_object('status', 'done', 'name', a.name, 'duration_ms', a.duration_ms, 'rank', challenge_rank(p_edition, a.duration_ms));
  end if;
  if c.closes_at is not null and c.closes_at <= now() then return jsonb_build_object('status', 'closed'); end if;
  if not found then
    if char_length(trim(coalesce(p_name, ''))) < 2 then return jsonb_build_object('status', 'bad_name'); end if;
    insert into challenge_attempts (edition, name, email) values (p_edition, left(trim(p_name), 80), lower(trim(p_email)))
    returning * into a;
  end if;
  return jsonb_build_object('status', 'playing', 'attempt', a.id, 'name', a.name, 'puzzle', c.puzzle,
    'started_at', a.started_at, 'server_now', now());
end $$;

-- Checks a full grid. Correct: stops the clock and returns the time and rank.
-- Wrong: counts the check but never says which cells are wrong (that would leak the answer).
create or replace function challenge_submit(p_attempt uuid, p_grid text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a challenge_attempts; c challenges; ms bigint;
begin
  select * into a from challenge_attempts where id = p_attempt for update;
  if not found then return jsonb_build_object('status', 'missing'); end if;
  if a.finished_at is not null then
    return jsonb_build_object('status', 'solved', 'duration_ms', a.duration_ms, 'rank', challenge_rank(a.edition, a.duration_ms));
  end if;
  select * into c from challenges where edition = a.edition;
  if c.closes_at is not null and c.closes_at <= now() then return jsonb_build_object('status', 'closed'); end if;
  if p_grid is distinct from c.solution then
    update challenge_attempts set wrong_checks = wrong_checks + 1 where id = a.id;
    return jsonb_build_object('status', 'wrong');
  end if;
  ms := floor(extract(epoch from (now() - a.started_at)) * 1000);
  update challenge_attempts set finished_at = now(), duration_ms = ms where id = a.id;
  return jsonb_build_object('status', 'solved', 'duration_ms', ms, 'rank', challenge_rank(a.edition, ms));
end $$;

-- Fastest finishers: names and times only.
create or replace function challenge_leaderboard(p_edition text, p_limit int default 10)
returns table (rank bigint, name text, duration_ms bigint) language sql stable security definer set search_path = public as $$
  select rank() over (order by a.duration_ms), a.name, a.duration_ms
  from challenge_attempts a
  where a.edition = p_edition and a.finished_at is not null
  order by a.duration_ms, a.finished_at
  limit least(greatest(p_limit, 1), 50);
$$;

-- Full results for admins, to pick and contact the winner.
create or replace function challenge_results(p_edition text)
returns table (rank bigint, name text, email text, duration_ms bigint, wrong_checks int, started_at timestamptz, finished_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select case when a.finished_at is null then null else rank() over (partition by a.finished_at is null order by a.duration_ms) end,
    a.name, a.email, a.duration_ms, a.wrong_checks, a.started_at, a.finished_at
  from challenge_attempts a
  where a.edition = p_edition and is_admin()
  order by a.finished_at is null, a.duration_ms, a.started_at;
$$;

revoke all on function challenge_results(text) from anon;

-- ---------- Q1 2027 puzzle (generated with: node scripts/new-sudoku.mjs q1-2027 medium) ----------
insert into challenges (edition, kind, puzzle, solution, note)
values ('q1-2027', 'sudoku', '010000694059004070000090050002040080000070001170306920090020046200907000080010000', '318752694659134872427698153962541387835279461174386925591823746243967518786415239', '')
on conflict (edition) do nothing;
