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
  role text not null default 'end_user', -- end_user | manager | instructor
  created_at timestamptz not null default now()
);

-- Add role to any pre-existing profiles table.
alter table public.profiles add column if not exists role text not null default 'end_user';
-- Preferred language for AI-generated content (interviews, analyses, debriefs).
alter table public.profiles add column if not exists language text not null default 'English';
-- Seniority/level (paired with job_title) — reused to prefill the career modules.
alter table public.profiles add column if not exists level text;

-- Onboarding + audience segmentation (drives "Recommended for you").
alter table public.profiles add column if not exists segment text;         -- SegmentKey (who they are)
alter table public.profiles add column if not exists goal text;            -- GoalKey (what they want)
alter table public.profiles add column if not exists team_size text;       -- managers / small business
alter table public.profiles add column if not exists founder_stage text;   -- founder-curious
alter table public.profiles add column if not exists study_field text;     -- students
alter table public.profiles add column if not exists grad_year text;       -- students
alter table public.profiles add column if not exists onboarded_at timestamptz;
-- Passive signals (collected in the background, never asked).
alter table public.profiles add column if not exists org_type text;        -- personal | education | corporate
alter table public.profiles add column if not exists org_domain text;      -- email domain
alter table public.profiles add column if not exists country text;         -- from hosting geo header
alter table public.profiles add column if not exists device text;          -- mobile | desktop
alter table public.profiles add column if not exists referrer text;        -- document.referrer at first visit
alter table public.profiles add column if not exists utm jsonb;            -- {source,medium,campaign}

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
-- Long, unguessable public token for the Vendor Disclosure open link.
alter table public.sessions add column if not exists public_token text;

create index if not exists sessions_code_idx on public.sessions (code);
create index if not exists sessions_public_token_idx on public.sessions (public_token);
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
  -- the generated implementation plan (headline, summary, human[], ai[], superadditive)
  plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (session_id, author_id)
);

-- Add plan to any pre-existing workspaces table.
alter table public.workspaces add column if not exists plan jsonb not null default '{}'::jsonb;
-- Generic strategy-canvas modules (GAS / opportunity-capability / experiment)
-- store everything under one jsonb: { subject, chat, fields, synthesis, verdict, score }
alter table public.workspaces add column if not exists canvas jsonb not null default '{}'::jsonb;

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

-- AI analysis of the as-is workflow: { summary, opportunities:[{title,outcome,how,prep}], flow:[{id,text,role}] }
alter table public.workflow_docs add column if not exists analysis jsonb not null default '{}'::jsonb;

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
-- Classes: an instructor-created container with a join code, a name, and a
-- curated list of modules. A class's `code` IS the cohort used everywhere else,
-- so all the cohort-scoped aggregation "just works" for a class.
-- ============================================================================
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  modules jsonb not null default '[]'::jsonb, -- ordered list of module slugs
  created_at timestamptz not null default now()
);
-- Language the cohort runs in; propagates to each member's profile on join.
alter table public.classes add column if not exists language text not null default 'English';
-- Cohort kind: 'teaching' (open join, students may buy $19 all-access) or
-- 'enterprise' (email-gated, comped via an offline contract).
alter table public.classes add column if not exists kind text not null default 'teaching';
-- Enterprise invite list: only these emails may join an enterprise cohort.
alter table public.classes add column if not exists allowed_emails jsonb not null default '[]'::jsonb;
alter table public.classes enable row level security;

drop policy if exists "classes read" on public.classes;
create policy "classes read" on public.classes
  for select using (auth.role() = 'authenticated'); -- so people can look up a class to join
-- Writes go through admin (service-role) routes only.

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
alter table public.class_members enable row level security;

drop policy if exists "class_members read own" on public.class_members;
create policy "class_members read own" on public.class_members
  for select using (user_id = auth.uid());
drop policy if exists "class_members join self" on public.class_members;
create policy "class_members join self" on public.class_members
  for insert with check (user_id = auth.uid());
-- The facilitator reads the full roster via the service role.

-- ============================================================================
-- Network survey: roster (per cohort) + each person's nominations.
-- Roster is service-role-only (read/written via routes). Responses are owned
-- by each user; the live graph is aggregated server-side and anonymized.
-- ============================================================================
create table if not exists public.network_config (
  cohort text primary key,
  roster jsonb not null default '[]'::jsonb, -- [{ id, name }]
  updated_at timestamptz not null default now()
);
alter table public.network_config enable row level security;
-- (no policies — service role only)

create table if not exists public.network_responses (
  cohort text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  self_id text, -- the roster id this person claimed as themselves
  advice jsonb not null default '[]'::jsonb, -- [roster ids]
  friends jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (cohort, user_id)
);
create index if not exists network_responses_cohort_idx on public.network_responses (cohort);
alter table public.network_responses enable row level security;

drop policy if exists "network read own" on public.network_responses;
create policy "network read own" on public.network_responses
  for select using (user_id = auth.uid());
drop policy if exists "network insert own" on public.network_responses;
create policy "network insert own" on public.network_responses
  for insert with check (user_id = auth.uid());
drop policy if exists "network update own" on public.network_responses;
create policy "network update own" on public.network_responses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- Benchmark config: the instructor's question set, edited in-app and stored
-- here (never in the codebase). RLS is ON with NO policies, so ONLY the service
-- role can read/write it — answers never reach the browser directly.
-- ============================================================================
create table if not exists public.benchmark_config (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.benchmark_config enable row level security;
-- (deliberately no policies — service role only)

-- ============================================================================
-- Benchmark results: one row per person per timed-benchmark attempt. The
-- facilitator histogram aggregates these by cohort (score distribution).
-- ============================================================================
create table if not exists public.benchmark_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cohort text,
  answers jsonb not null default '{}'::jsonb,
  score int not null default 0,
  total int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists benchmark_cohort_idx on public.benchmark_results (cohort);
create index if not exists benchmark_user_idx on public.benchmark_results (user_id);

alter table public.benchmark_results enable row level security;

drop policy if exists "benchmark read own" on public.benchmark_results;
create policy "benchmark read own" on public.benchmark_results
  for select using (user_id = auth.uid());

drop policy if exists "benchmark insert own" on public.benchmark_results;
create policy "benchmark insert own" on public.benchmark_results
  for insert with check (user_id = auth.uid());

drop policy if exists "benchmark update own" on public.benchmark_results;
create policy "benchmark update own" on public.benchmark_results
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- The cohort histogram (counts only) is aggregated server-side via the service role.

-- ============================================================================
-- Entitlements: who has paid. Written ONLY by the Stripe webhook (service
-- role, which bypasses RLS). Users can read their own row but cannot write it,
-- so nobody can grant themselves access from the browser.
-- ============================================================================
create table if not exists public.entitlements (
  user_id uuid references auth.users (id) on delete cascade,
  module text not null default 'all', -- 'all' (bundle) or a module slug
  paid boolean not null default true,
  stripe_session_id text,
  amount_total integer,
  currency text,
  created_at timestamptz not null default now(),
  primary key (user_id, module)
);
-- Subscription tracking for the $29/yr plan. Lifetime grants (one-time $19,
-- coupon, admin) leave current_period_end null. Paid runs are counted since
-- current_period_start, so a renewal refreshes the allowance.
alter table public.entitlements add column if not exists current_period_start timestamptz;
alter table public.entitlements add column if not exists current_period_end timestamptz;
alter table public.entitlements add column if not exists stripe_subscription_id text;
alter table public.entitlements add column if not exists stripe_customer_id text;

-- Migrate a pre-existing single-key entitlements table to per-module rows.
-- Any existing paid user becomes an 'all' (all-access) holder.
alter table public.entitlements add column if not exists module text not null default 'all';
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'entitlements'
      and constraint_type = 'PRIMARY KEY' and constraint_name = 'entitlements_pkey'
  ) and not exists (
    select 1 from information_schema.key_column_usage
    where table_schema = 'public' and table_name = 'entitlements'
      and constraint_name = 'entitlements_pkey' and column_name = 'module'
  ) then
    alter table public.entitlements drop constraint entitlements_pkey;
    alter table public.entitlements add constraint entitlements_pkey primary key (user_id, module);
  end if;
end $$;

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

-- ===========================================================================
-- Live Word Cloud: a presenter poses a question; the room submits short phrases
-- from their phones (NO sign-in) via a short code or QR at /cloud. The cloud
-- builds up live on the presenter's screen; AI summarizes the responses.
-- ===========================================================================
create table if not exists public.cloud_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,              -- short join code, entered at /cloud
  host_id uuid not null references auth.users (id) on delete cascade,
  question text not null default '',
  status text not null default 'open',    -- open (collecting) | revealed | closed
  summary jsonb,                          -- { themes, answer } from the AI pass
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cloud_sessions_code_idx on public.cloud_sessions (code);
create index if not exists cloud_sessions_host_idx on public.cloud_sessions (host_id);

-- One row per submitted phrase. Anonymous: no user_id. `norm` is the lowercased,
-- whitespace-collapsed key used to tally identical entries for the cloud.
create table if not exists public.cloud_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cloud_sessions (id) on delete cascade,
  text text not null,
  norm text not null,
  created_at timestamptz not null default now()
);
create index if not exists cloud_entries_session_idx on public.cloud_entries (session_id);

alter table public.cloud_sessions enable row level security;
alter table public.cloud_entries  enable row level security;

-- The host owns their cloud sessions end to end.
drop policy if exists "cloud sessions host all" on public.cloud_sessions;
create policy "cloud sessions host all" on public.cloud_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- The host reads the entries for their own sessions. Public submissions are
-- written by the service role in /api/cloud/submit (which bypasses RLS), so no
-- anon insert policy is needed here.
drop policy if exists "cloud entries host read" on public.cloud_entries;
create policy "cloud entries host read" on public.cloud_entries
  for select using (
    exists (
      select 1 from public.cloud_sessions s
      where s.id = cloud_entries.session_id and s.host_id = auth.uid()
    )
  );

-- ===========================================================================
-- Photo Wall: the room takes a photo (a scene, an object, or handwritten text)
-- from their phones (NO sign-in). Each image is sent to a vision model, which
-- returns a text description/transcription; ONLY that text is stored. The image
-- itself is never written to the database. AI then summarizes across all of them.
-- ===========================================================================
create table if not exists public.photo_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null default '',
  status text not null default 'open',    -- open | revealed | closed
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists photo_sessions_code_idx on public.photo_sessions (code);
create index if not exists photo_sessions_host_idx on public.photo_sessions (host_id);

-- One row per submission. NO image is stored, only the model's text output.
create table if not exists public.photo_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.photo_sessions (id) on delete cascade,
  kind text not null default 'photo',      -- photo | text (handwritten/printed)
  title text not null default '',
  description text not null default '',
  transcript text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists photo_entries_session_idx on public.photo_entries (session_id);

alter table public.photo_sessions enable row level security;
alter table public.photo_entries  enable row level security;

drop policy if exists "photo sessions host all" on public.photo_sessions;
create policy "photo sessions host all" on public.photo_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- Host reads entries for their own sessions. Public submissions are written by
-- the service role in /api/photo/submit (after the image is described + dropped).
drop policy if exists "photo entries host read" on public.photo_entries;
create policy "photo entries host read" on public.photo_entries
  for select using (
    exists (
      select 1 from public.photo_sessions s
      where s.id = photo_entries.session_id and s.host_id = auth.uid()
    )
  );
