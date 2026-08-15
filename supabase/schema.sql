-- ============================================================================
-- Reimagine Your Job — database schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query -> Run).
-- Safe to re-run: uses "if not exists" / "drop policy if exists".
-- ============================================================================

-- --- profiles: one row per auth user -------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  job_title text,
  job_description text,
  created_at timestamptz not null default now()
);

-- --- sessions: one row per paired room ------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  cohort text, -- e.g. "EXECED-XYZ-2026-08" — groups sessions for the facilitator view
  host_id uuid not null references auth.users (id) on delete cascade,
  guest_id uuid references auth.users (id) on delete set null,
  phase int not null default 0,
  phase_started_at timestamptz,
  phase_running boolean not null default false,
  status text not null default 'waiting', -- waiting | active | done
  created_at timestamptz not null default now()
);

-- Add columns to any pre-existing sessions table (safe if they already exist).
alter table public.sessions add column if not exists cohort text;
alter table public.sessions add column if not exists exercise text not null default 'job';
alter table public.sessions add column if not exists broadcast_msg text;
alter table public.sessions add column if not exists broadcast_at timestamptz;

create index if not exists sessions_code_idx on public.sessions (code);
create index if not exists sessions_host_idx on public.sessions (host_id);
create index if not exists sessions_guest_idx on public.sessions (guest_id);
create index if not exists sessions_cohort_idx on public.sessions (cohort);

-- --- workspaces: one per participant per session --------------------------
-- author_id designs a new job for subject_id (their partner).
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references auth.users (id) on delete set null,
  -- the author's OWN job (what their partner will redesign). Kept here so it
  -- syncs to the partner over realtime along with the rest of the row.
  owner_job_title text default '',
  owner_job_description text default '',
  interview_notes text default '',
  -- solo "AI partner" mode: the interview transcript [{role, content}]
  interview_chat jsonb not null default '[]'::jsonb,
  real_job text default '',
  strategic_outcome text default '',
  insight text default '',
  -- grid: { search:[], structure:[], think:[], translate:[], lead:[], own:[], judge:[], integrate:[] }
  grid jsonb not null default '{}'::jsonb,
  new_job_description text default '',
  -- feedback left by the SUBJECT on this design: { plus, minus, question, idea }
  feedback jsonb not null default '{}'::jsonb,
  final_description text default '',
  updated_at timestamptz not null default now(),
  unique (session_id, author_id)
);

create index if not exists workspaces_session_idx on public.workspaces (session_id);

-- Add interview_chat to any pre-existing workspaces table.
alter table public.workspaces add column if not exists interview_chat jsonb not null default '[]'::jsonb;

-- --- helper: am I a participant of this session? --------------------------
create or replace function public.is_session_participant(sess uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sess
      and (s.host_id = auth.uid() or s.guest_id = auth.uid())
  );
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.sessions   enable row level security;
alter table public.workspaces enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- sessions ------------------------------------------------------------------
-- Readable if you're a participant OR the room is still open to join.
drop policy if exists "sessions read" on public.sessions;
create policy "sessions read" on public.sessions
  for select using (
    host_id = auth.uid() or guest_id = auth.uid() or guest_id is null
  );

drop policy if exists "sessions insert host" on public.sessions;
create policy "sessions insert host" on public.sessions
  for insert with check (host_id = auth.uid());

-- Update if you're already in it, OR you're joining an open room as guest.
drop policy if exists "sessions update" on public.sessions;
create policy "sessions update" on public.sessions
  for update using (
    host_id = auth.uid() or guest_id = auth.uid() or guest_id is null
  ) with check (
    host_id = auth.uid() or guest_id = auth.uid()
  );

-- workspaces ----------------------------------------------------------------
drop policy if exists "workspaces read" on public.workspaces;
create policy "workspaces read" on public.workspaces
  for select using (public.is_session_participant(session_id));

drop policy if exists "workspaces insert" on public.workspaces;
create policy "workspaces insert" on public.workspaces
  for insert with check (
    author_id = auth.uid() and public.is_session_participant(session_id)
  );

-- Any participant of the session may update (needed so the SUBJECT can leave
-- feedback on the author's design during the Share phase).
drop policy if exists "workspaces update" on public.workspaces;
create policy "workspaces update" on public.workspaces
  for update using (public.is_session_participant(session_id))
  with check (public.is_session_participant(session_id));

-- ============================================================================
-- Workflow docs: the shared canvas for the second exercise ("Reimagine Your
-- Organization/Workflow"). One shared record per session — both partners edit
-- the same doc together.
-- ============================================================================
create table if not exists public.workflow_docs (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  name text default '',
  why text default '',
  -- steps: [{ id, text, role }] where role is '' | 'ai' | 'human' | 'both'
  steps jsonb not null default '[]'::jsonb,
  success text default '',
  failure text default '',
  more text default '',
  better text default '',
  accuracy text default '',
  generality text default '',
  chaos text default '',
  architect text default '',
  stop_start text default '',
  updated_at timestamptz not null default now()
);

alter table public.workflow_docs enable row level security;

drop policy if exists "workflow read" on public.workflow_docs;
create policy "workflow read" on public.workflow_docs
  for select using (public.is_session_participant(session_id));

drop policy if exists "workflow insert" on public.workflow_docs;
create policy "workflow insert" on public.workflow_docs
  for insert with check (public.is_session_participant(session_id));

drop policy if exists "workflow update" on public.workflow_docs;
create policy "workflow update" on public.workflow_docs
  for update using (public.is_session_participant(session_id))
  with check (public.is_session_participant(session_id));

-- ============================================================================
-- Entitlements: who has paid. Written ONLY by the Stripe webhook (service
-- role, which bypasses RLS). Users can read their own row but cannot write it,
-- so nobody can grant themselves access from the browser.
-- ============================================================================
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  paid boolean not null default true,
  stripe_session_id text,
  amount_total integer,
  currency text,
  created_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists "entitlements read own" on public.entitlements;
create policy "entitlements read own" on public.entitlements
  for select using (user_id = auth.uid());
-- Deliberately NO insert/update/delete policies: only the service role writes.

-- ============================================================================
-- Realtime: broadcast row changes so partners stay in sync
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspaces'
  ) then
    alter publication supabase_realtime add table public.workspaces;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workflow_docs'
  ) then
    alter publication supabase_realtime add table public.workflow_docs;
  end if;
end $$;
