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
-- When we first showed this cohort alumnus the time-boxed $19 all-access offer.
-- Set once, on first eligible dashboard view; the offer window counts from here.
alter table public.profiles add column if not exists alumni_offer_at timestamptz;
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
-- Facilitator can hide an individual response from the cohort view and roll-ups.
alter table public.sessions add column if not exists hidden boolean not null default false;

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
-- Dig-deeper (value) notes, kept in their own box separate from the first interview.
alter table public.workspaces add column if not exists interview_notes_value text default '';

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
-- (The CLASS tier -- class_units -- is defined after `organizations`, below.)

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
-- The runs wallet (consumer credits model). Everyone gets a free starter
-- allowance (a constant, not stored); a pack purchase adds credits here; a
-- refund or admin adjustment can subtract. A "run" is NOT stored here — it's
-- counted from personal (null-cohort) sessions — so this ledger holds only
-- credit GRANTS. Balance = FREE_RUNS + sum(delta) − personal runs used.
create table if not exists public.run_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,                       -- +pack/comp, −refund/adjust
  reason text not null,                          -- 'purchase' | 'comp' | 'refund' | 'admin'
  ref text,                                      -- stripe session id, coupon code, note
  created_at timestamptz not null default now()
);
create index if not exists run_credits_user_idx on public.run_credits (user_id);
alter table public.run_credits enable row level security;
drop policy if exists run_credits_read_own on public.run_credits;
create policy run_credits_read_own on public.run_credits for select using (user_id = auth.uid()); -- writes via service role

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
-- Tie a live word-cloud run to a cohort (so it reports into the cohort index) and
-- to the authored Live Prompt template it was launched from.
alter table public.cloud_sessions add column if not exists cohort text;
alter table public.cloud_sessions add column if not exists spec_slug text;
create index if not exists cloud_sessions_cohort_idx on public.cloud_sessions (cohort);

-- Authored LIVE templates: an instructor's own live prompt (a question the room
-- answers, aggregating on screen). Same authoring model as the other engines —
-- a reusable module in the library, of mode "Live". Runs on the word-cloud runtime.
create table if not exists public.live_prompt_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid references auth.users (id) on delete set null,
  org_id uuid references public.organizations (id) on delete set null,
  name text not null,
  emoji text,
  prompt text not null,                     -- the question the room answers
  subtitle text,                            -- optional projector subtitle
  status text not null default 'published', -- draft | published
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_prompt_specs_owner_idx on public.live_prompt_specs (owner_id);
alter table public.live_prompt_specs enable row level security;
drop policy if exists live_prompt_read on public.live_prompt_specs;
create policy live_prompt_read on public.live_prompt_specs for select using (auth.role() = 'authenticated'); -- writes via service role

-- The self-improvement agent's notebook: a synthetic user runs a module (in a
-- role) and records how it went + what would improve it. Notes accumulate per
-- module so quality can be tracked and improved over time (the loop).
create table if not exists public.agent_feedback (
  id uuid primary key default gen_random_uuid(),
  module_slug text not null,
  module_name text,
  role text not null default 'learner',      -- which persona/role ran it
  rating int,                                 -- 1-5 experience score
  worked jsonb,                               -- what worked (array)
  friction jsonb,                             -- friction/drop-off points (array)
  suggestions jsonb,                          -- concrete improvements (array)
  one_thing text,                             -- single highest-value change
  summary text,                               -- the user's own-voice take
  created_at timestamptz not null default now()
);
create index if not exists agent_feedback_module_idx on public.agent_feedback (module_slug, created_at desc);
alter table public.agent_feedback enable row level security; -- superadmin-only, via service role
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
-- Photo GALLERY mode (show_photos on the session): a scaled-down thumbnail is kept
-- and shown on screen, alongside an optional participant caption. The default Photo
-- Wall keeps neither (image stays null, caption blank).
alter table public.photo_sessions add column if not exists show_photos boolean not null default false;
alter table public.photo_sessions add column if not exists context text not null default ''; -- extra AI instructions: what to extract
alter table public.photo_entries add column if not exists image text; -- data-URL thumbnail (gallery only)
alter table public.photo_entries add column if not exists caption text not null default '';

-- --- Live group chat with AI adjudication ---------------------------------
-- The room joins an open chat by code (no accounts). Messages stream in; the AI
-- reads the whole thread and adjudicates it live on the shared screen.
create table if not exists public.forum_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  topic text not null default '',           -- the question or provocation
  instructions text not null default '',    -- how the AI should adjudicate
  status text not null default 'open',      -- open | closed
  verdict jsonb,                            -- latest AI adjudication, cached
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.forum_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.forum_sessions (id) on delete cascade,
  name text not null default '',            -- participant display name (no account)
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists forum_messages_session_idx on public.forum_messages (session_id, created_at);
alter table public.forum_sessions  enable row level security;
alter table public.forum_messages  enable row level security;
drop policy if exists "forum sessions host all" on public.forum_sessions;
create policy "forum sessions host all" on public.forum_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);
-- Messages: no anon/user policy. All reads and writes go through the service role
-- (the public post/feed routes and the host's adjudicate route).

-- The Number: team capstone. A shared session, up to four members who join by
-- code (no account), a shared set of chosen levers, a shared analyst-call
-- transcript, and a graded report. All member/pick access is via the service
-- role, like the forum.
create table if not exists public.capstone_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  cohort text,
  phase int not null default 0,
  status text not null default 'open',
  transcript jsonb not null default '[]'::jsonb,
  report jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.capstone_sessions add column if not exists cohort text;
create table if not exists public.capstone_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.capstone_sessions (id) on delete cascade,
  user_id uuid,
  name text not null default '',
  role text not null default '',
  created_at timestamptz not null default now()
);
alter table public.capstone_members add column if not exists user_id uuid;
create index if not exists capstone_members_user_idx on public.capstone_members (user_id);
create table if not exists public.capstone_picks (
  session_id uuid not null references public.capstone_sessions (id) on delete cascade,
  lever_key text not null,
  selected boolean not null default true,
  note text not null default '',
  by_name text not null default '',
  updated_at timestamptz not null default now(),
  primary key (session_id, lever_key)
);
create index if not exists capstone_members_session_idx on public.capstone_members (session_id);
alter table public.capstone_sessions enable row level security;
alter table public.capstone_members  enable row level security;
alter table public.capstone_picks    enable row level security;
drop policy if exists "capstone sessions host all" on public.capstone_sessions;
create policy "capstone sessions host all" on public.capstone_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);
-- Members and picks: no anon/user policy. All access is via the service role
-- (the public join/state/pick routes and the host's phase/report routes).

-- A "class run" the instructor starts. Teams attach by run_code so a specific
-- class run aggregates on its own, and the instructor gets a live board.
create table if not exists public.capstone_runs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  label text not null default '',
  created_at timestamptz not null default now()
);
alter table public.capstone_runs enable row level security;
drop policy if exists "capstone runs host all" on public.capstone_runs;
create policy "capstone runs host all" on public.capstone_runs
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);
alter table public.capstone_sessions add column if not exists run_code text;
create index if not exists capstone_sessions_run_idx on public.capstone_sessions (run_code);

-- Showcase: a pre-sequenced set of short presentations. The room gives feedback
-- on each item as the presenter steps through them, and every presenter gets an
-- AI summary. Feedback is service-role only, like the forum.
create table if not exists public.showcase_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  items jsonb not null default '[]'::jsonb,
  current int not null default -1,
  status text not null default 'open',
  reports jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.showcase_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.showcase_sessions (id) on delete cascade,
  item_id text not null,
  name text not null default '',
  text text not null,
  rating int,
  created_at timestamptz not null default now()
);
create index if not exists showcase_feedback_item_idx on public.showcase_feedback (session_id, item_id);
alter table public.showcase_sessions enable row level security;
alter table public.showcase_feedback enable row level security;
drop policy if exists "showcase sessions host all" on public.showcase_sessions;
create policy "showcase sessions host all" on public.showcase_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);
-- Feedback: no anon/user policy. All access via the service role.

-- Business Census: a multimodal, AI-run business profile that compounds into a
-- research panel. A researcher runs a collection campaign; respondents complete
-- a ~10 minute profile by link; each completion is one firm-wave record.
create table if not exists public.business_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  label text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  campaign_code text,
  owner_id uuid,
  wave int not null default 1,
  status text not null default 'complete',
  name text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  country text,
  admin1 text,
  locality text,
  geo_source text,
  industry_desc text,
  naics text,
  naics_label text,
  isic text,
  isic_label text,
  classify_conf numeric,
  employees_band text,
  revenue_band text,
  founded_year int,
  multi_site boolean,
  customer_type text,
  ownership text,
  what_it_does text,
  business_model text,
  wms jsonb,
  wms_overall numeric,
  tech jsonb,
  network jsonb,
  photos jsonb,
  transcript text,
  mode text,
  source_channel text,
  consent boolean not null default false,
  contact_email text,
  report jsonb,
  created_at timestamptz not null default now()
);
-- Panel identity: waves of the same firm share a firm_id (append-only, never
-- replaced). firm_key is the auto-match fingerprint; firm_code is the stable
-- code for a reliable re-survey link.
alter table public.businesses add column if not exists firm_id uuid;
alter table public.businesses add column if not exists firm_key text;
alter table public.businesses add column if not exists firm_code text;
alter table public.businesses add column if not exists gps_accuracy int;
create index if not exists businesses_campaign_idx on public.businesses (campaign_code);
create index if not exists businesses_firm_idx on public.businesses (firm_id);
create index if not exists businesses_firmcode_idx on public.businesses (firm_code);
create index if not exists businesses_firmkey_idx on public.businesses (campaign_code, firm_key);
alter table public.business_campaigns enable row level security;
alter table public.businesses enable row level security;
drop policy if exists "business campaigns owner all" on public.business_campaigns;
create policy "business campaigns owner all" on public.business_campaigns
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- businesses: no anon/user policy. Public submit and researcher reads go through
-- the service role.

-- Authored modules (the no-code builder): a ModuleSpec stored as jsonb. The
-- engine (lib/mechanics) runs published specs; the Copilot drafts/patches them.
create table if not exists public.module_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.module_specs enable row level security;
drop policy if exists "module_specs owner" on public.module_specs;
create policy "module_specs owner" on public.module_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Role-play run outcomes: one row per graded run, keyed to the module slug (and
-- optionally a cohort). Written server-side with the service role; the module
-- owner may read their own module's rows to power the editor's Insights.
create table if not exists public.roleplay_results (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  user_id uuid references auth.users (id) on delete set null,
  scenario text,
  cohort text,
  verdict jsonb,
  report jsonb,
  score int,
  created_at timestamptz not null default now()
);
create index if not exists roleplay_results_slug_idx on public.roleplay_results (slug);
alter table public.roleplay_results enable row level security;
drop policy if exists "roleplay_results owner reads" on public.roleplay_results;
create policy "roleplay_results owner reads" on public.roleplay_results
  for select using (exists (select 1 from public.module_specs ms where ms.slug = roleplay_results.slug and ms.owner_id = auth.uid()));

-- Reusable building blocks an author saves once and drops into any module: a
-- character, a rubric, or a probes+scenarios set. Owner-scoped, jsonb payload.
create table if not exists public.module_components (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  kind text not null,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists module_components_owner_kind_idx on public.module_components (owner_id, kind);
alter table public.module_components enable row level security;
drop policy if exists "module_components owner" on public.module_components;
create policy "module_components owner" on public.module_components
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Authored negotiation simulations: a declarative Scenario (issues + private
-- payoff tables + BATNA) as jsonb. Owner-scoped like module_specs.
create table if not exists public.negotiation_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.negotiation_specs enable row level security;
drop policy if exists "negotiation_specs owner" on public.negotiation_specs;
create policy "negotiation_specs owner" on public.negotiation_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Authored benchmarks: a timed MCQ quiz (questions + options + answer key) as
-- jsonb (a BenchConfig). Owner-scoped.
create table if not exists public.benchmark_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.benchmark_specs enable row level security;
drop policy if exists "benchmark_specs owner" on public.benchmark_specs;
create policy "benchmark_specs owner" on public.benchmark_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Authored analytical instruments (X-ray style): decompose a subject into units
-- and score each against author-defined levels. Spec is jsonb. Owner-scoped.
create table if not exists public.analytical_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.analytical_specs enable row level security;
drop policy if exists "analytical_specs owner" on public.analytical_specs;
create policy "analytical_specs owner" on public.analytical_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Authored paired-redesign experiences. The AUTHORING spec is jsonb here; the
-- RUNTIME reuses the existing (already-realtime) sessions + workspaces tables,
-- so no new realtime plumbing is introduced. Owner-scoped.
create table if not exists public.redesign_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.redesign_specs enable row level security;
drop policy if exists "redesign_specs owner" on public.redesign_specs;
create policy "redesign_specs owner" on public.redesign_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Authored live activities (word cloud / poll / open responses). The spec is
-- jsonb; a run creates a live_sessions row; anonymous participants write
-- live_entries via a no-auth service-role API (mirrors the cloud triad).
create table if not exists public.live_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.live_specs enable row level security;
drop policy if exists "live_specs owner" on public.live_specs;
create policy "live_specs owner" on public.live_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references auth.users (id) on delete cascade,
  slug text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.live_sessions enable row level security;
drop policy if exists "live_sessions host" on public.live_sessions;
create policy "live_sessions host" on public.live_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

create table if not exists public.live_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  text text default '',
  choice text default '',
  norm text default '',
  created_at timestamptz not null default now()
);
create index if not exists live_entries_session_idx on public.live_entries (session_id);
alter table public.live_entries enable row level security;
-- The host reads their own session's entries; writes are service-role only.
drop policy if exists "live_entries host reads" on public.live_entries;
create policy "live_entries host reads" on public.live_entries
  for select using (exists (select 1 from public.live_sessions s where s.id = live_entries.session_id and s.host_id = auth.uid()));

-- The visibility ladder for ALL authored modules (any engine). Default is
-- Personal (no row = the author's own classes only). A director promotes to Org;
-- a curator promotes to Global, and only after automated eligibility gates pass.
-- Global membership can decay (status 'demoted'). One row per (kind, slug, tier).
create table if not exists public.module_promotions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,        -- 'roleplay' | 'interview' | 'negotiation' | 'benchmark' | 'analytical' | 'redesign' | 'live'
  slug text not null,
  owner_id uuid references auth.users (id) on delete set null,
  org_id uuid references public.organizations (id) on delete set null,
  tier text not null,        -- 'org' | 'global'
  status text not null default 'pending',  -- 'pending' | 'approved' | 'rejected' | 'demoted'
  readiness jsonb,           -- the evidence captured at nomination (gates + usage)
  note text,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, slug, tier)
);
create index if not exists module_promotions_lookup_idx on public.module_promotions (kind, slug);
create index if not exists module_promotions_queue_idx on public.module_promotions (tier, status);
alter table public.module_promotions enable row level security;
-- The author reads their own nominations; director/curator reads + decisions go
-- through the service role after an explicit authority check in the API.
drop policy if exists "module_promotions owner reads" on public.module_promotions;
create policy "module_promotions owner reads" on public.module_promotions
  for select using (auth.uid() = owner_id);

-- Authored explainers: a taught, guided walkthrough of a topic (sections of
-- explanation + key points). Owner-scoped, jsonb spec.
create table if not exists public.explainer_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.explainer_specs enable row level security;
drop policy if exists "explainer_specs owner" on public.explainer_specs;
create policy "explainer_specs owner" on public.explainer_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Authored "In the News" modules: apply a business framework to CURRENT real
-- news (fetched live at runtime). Owner-scoped, jsonb spec.
create table if not exists public.newsframe_specs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  owner_id uuid references auth.users (id) on delete set null,
  status text not null default 'draft',
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);
alter table public.newsframe_specs enable row level security;
drop policy if exists "newsframe_specs owner" on public.newsframe_specs;
create policy "newsframe_specs owner" on public.newsframe_specs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Quiz attempts: one row per completed run, so a learner's score AND calibration
-- (how well their confidence tracked reality) accumulate over time and growth is
-- visible. Owner-scoped.
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  score int not null,
  total int not null,
  brier real,
  calibration jsonb,
  created_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;
drop policy if exists "quiz_attempts owner" on public.quiz_attempts;
create policy "quiz_attempts owner" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists quiz_attempts_user_slug_idx on public.quiz_attempts (user_id, slug, created_at desc);

-- Version history: a snapshot of a module's spec on each save, for restore + diff.
create table if not exists public.module_spec_versions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  owner_id uuid references auth.users (id) on delete cascade,
  spec jsonb not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists module_spec_versions_slug_idx on public.module_spec_versions (slug, created_at desc);
alter table public.module_spec_versions enable row level security;
drop policy if exists "module_spec_versions owner" on public.module_spec_versions;
create policy "module_spec_versions owner" on public.module_spec_versions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Run progress events, for the drop-off funnel (which phase learners reach).
-- Written server-side; the module owner may read their own module's events.
create table if not exists public.roleplay_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  cohort text,
  code text,
  user_id uuid references auth.users (id) on delete set null,
  phase text not null,
  created_at timestamptz not null default now()
);
create index if not exists roleplay_events_slug_idx on public.roleplay_events (slug);
alter table public.roleplay_events enable row level security;
drop policy if exists "roleplay_events owner reads" on public.roleplay_events;
create policy "roleplay_events owner reads" on public.roleplay_events
  for select using (exists (select 1 from public.module_specs ms where ms.slug = roleplay_events.slug and ms.owner_id = auth.uid()));

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

-- ===========================================================================
-- Live Quiz: the standalone, no-sign-in version of The Benchmark. The room
-- joins by code/QR (no account), takes the same timed question set from
-- benchmark_config, and is scored server-side. Submissions are ANONYMOUS (no
-- user_id); the presenter shows the live score distribution vs. the machine.
-- ===========================================================================
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'open',     -- open | revealed | closed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quiz_sessions_code_idx on public.quiz_sessions (code);
create index if not exists quiz_sessions_host_idx on public.quiz_sessions (host_id);

create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions (id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quiz_submissions_session_idx on public.quiz_submissions (session_id);

alter table public.quiz_sessions    enable row level security;
alter table public.quiz_submissions enable row level security;

drop policy if exists "quiz sessions host all" on public.quiz_sessions;
create policy "quiz sessions host all" on public.quiz_sessions
  for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

drop policy if exists "quiz submissions host read" on public.quiz_submissions;
create policy "quiz submissions host read" on public.quiz_submissions
  for select using (
    exists (
      select 1 from public.quiz_sessions s
      where s.id = quiz_submissions.session_id and s.host_id = auth.uid()
    )
  );

-- ===========================================================================
-- Understand Your Customer: the owner opens an "empathy" session (in the main
-- sessions table, with a public_token like Vendor Disclosure) and shares one
-- link. Each potential customer opens it (NO sign-in) and has an AI-run empathy
-- interview; on finish, the service role stores the transcript + the AI profile
-- as one row here. Many customers -> many rows per session.
-- ===========================================================================
create table if not exists public.empathy_interviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  respondent text not null default '',      -- optional name/label the customer gives
  transcript jsonb not null default '[]',   -- [{role, content}, ...]
  profile jsonb,                            -- the AI empathy profile for this person
  created_at timestamptz not null default now()
);
create index if not exists empathy_interviews_session_idx on public.empathy_interviews (session_id);

alter table public.empathy_interviews enable row level security;

-- The host reads the interviews for their own sessions. Public submissions are
-- written by the service role in /api/empathy/finish (which bypasses RLS), so
-- no anon insert policy is needed here.
drop policy if exists "empathy interviews host read" on public.empathy_interviews;
create policy "empathy interviews host read" on public.empathy_interviews
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = empathy_interviews.session_id and s.host_id = auth.uid()
    )
  );

-- ===========================================================================
-- Continuous experimentation. A facilitator (admin) runs A/B experiments that
-- apply a SUBTLE variant (a small nudge appended to an interview's prompt) to a
-- flow. Each session is bucketed into one variant; engagement outcomes are
-- DERIVED at analysis time from the session's own state (completed / depth /
-- shared), so there's no per-turn outcome logging. Statistics are computed in
-- code (never by the LLM); the LLM only proposes variants and narrates results.
-- All access is via the service role, gated behind isAdmin at the route level.
-- ===========================================================================
create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  flow text not null,                       -- 'consult' | 'resume' | 'empathy' | 'superpower' | 'board' | 'all'
  name text not null default '',
  hypothesis text not null default '',
  metric text not null default 'completion',-- completion | depth | shared
  depth_threshold int not null default 4,   -- for the 'depth' metric: answers >= this counts as success
  variants jsonb not null default '[]',     -- [{ key, label, nudge }]
  min_per_arm int not null default 100,     -- required sample size per variant before concluding
  status text not null default 'proposed',  -- proposed | running | concluded | adopted | rejected
  created_by text not null default 'agent', -- agent | human
  result jsonb,                             -- cached analysis snapshot
  created_at timestamptz not null default now(),
  launched_at timestamptz,
  concluded_at timestamptz
);
create index if not exists experiments_flow_status_idx on public.experiments (flow, status);

-- One row per session per experiment. No outcome columns: outcomes are derived
-- by joining to the session's current state when we analyze.
create table if not exists public.experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  session_id uuid not null,
  variant_key text not null,
  assigned_at timestamptz not null default now(),
  unique (experiment_id, session_id)
);
create index if not exists experiment_assignments_exp_idx on public.experiment_assignments (experiment_id);
create index if not exists experiment_assignments_session_idx on public.experiment_assignments (session_id);

-- Locked down: only the service role touches these (facilitator routes are
-- gated by isAdmin, and the runtime assignment writes use the admin client).
-- What the variant nudge modifies, and whether subjects are real or simulated.
alter table public.experiments add column if not exists target text not null default 'interview'; -- interview | report
alter table public.experiments add column if not exists mode text not null default 'human';       -- human | synthetic

alter table public.experiments enable row level security;
alter table public.experiment_assignments enable row level security;

-- ============================================================================
-- Multi-tenant white labels (organizations), platform/org roles, and invites.
-- Roles: profiles.platform_role = superadmin | user  (superadmin = platform owner)
--        org_members.org_role   = director | instructor | member  (scoped to an org;
--        'facilitator' is the legacy value for 'director', migrated below)
-- ============================================================================

alter table public.profiles add column if not exists platform_role text not null default 'user'; -- superadmin | user

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- superadditive.app/{slug}
  name text not null,
  logo_url text,
  hero_image_url text,
  primary_color text,                        -- hex; themes accents app-wide
  tagline text,
  owner_id uuid references auth.users (id) on delete set null,
  plan text not null default 'standard',
  invite_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizations_slug_idx on public.organizations (slug);
alter table public.organizations enable row level security;
drop policy if exists org_read on public.organizations;
-- Branding is readable by any signed-in user (needed to theme /{slug}); writes go through service-role admin routes.
create policy org_read on public.organizations for select using (auth.role() = 'authenticated');

create table if not exists public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  org_role text not null default 'member',   -- facilitator | member
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on public.org_members (user_id);
alter table public.org_members enable row level security;
drop policy if exists org_members_read_own on public.org_members;
create policy org_members_read_own on public.org_members for select using (user_id = auth.uid()); -- writes via service role

-- Pending, email-based invites. When an invited user signs in, membership is created.
create table if not exists public.org_invites (
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  org_role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, email)
);
create index if not exists org_invites_email_idx on public.org_invites (lower(email));
alter table public.org_invites enable row level security; -- (no policies — service role only)

-- Tenant scoping on the work tables.
alter table public.sessions add column if not exists org_id uuid references public.organizations (id) on delete set null;
create index if not exists sessions_org_idx on public.sessions (org_id);
alter table public.classes add column if not exists org_id uuid references public.organizations (id) on delete set null;

-- Which modules a white-label org grants its members (array of module slugs).
-- null/empty = all modules (default); a set = only those, curated.
alter table public.organizations add column if not exists modules jsonb;

-- Whether org members see the full library on their dashboard, or only the
-- program (their assigned cohort work). Default false: members get a focused,
-- cohort-first home; the org/class/library machinery is for staff. Directors
-- flip this on to let members freely explore every module the org grants.
alter table public.organizations add column if not exists member_can_browse boolean not null default false;

-- The Relationship OS "push": a director sends a micro-dose of value (a free
-- module, an exec-ed offer, an event, or an update) to a cohort or a computed
-- segment. Recipients are resolved at send time, so engagement is trackable.
create table if not exists public.pushes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  kind text not null default 'update',        -- 'module' | 'offer' | 'event' | 'update'
  title text not null,
  body text,
  href text,                                   -- a link, or /start/<module-slug>
  cta text,                                    -- button label
  segment_label text,                          -- human label of who it went to
  created_at timestamptz not null default now()
);
create index if not exists pushes_org_idx on public.pushes (org_id);
alter table public.pushes enable row level security; -- reads go through recipients; writes service-role

create table if not exists public.push_recipients (
  push_id uuid not null references public.pushes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  seen_at timestamptz,
  clicked_at timestamptz,
  primary key (push_id, user_id)
);
create index if not exists push_recipients_user_idx on public.push_recipients (user_id);
alter table public.push_recipients enable row level security;
drop policy if exists push_recipients_read_own on public.push_recipients;
create policy push_recipients_read_own on public.push_recipients for select using (user_id = auth.uid()); -- writes via service role

-- Which automation (if any) produced a push, so a rule doesn't re-hit the same
-- person within its cool-down window.
alter table public.pushes add column if not exists automation_id uuid;

-- Relationship OS automations: a rule that auto-drips value when a member enters
-- a state (e.g. goes cooling), so the relationship maintains itself at fixed cost
-- without the director sending by hand. Fired by a daily cron.
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  trigger text not null,                       -- 'cooling' | 'at_risk' | 'reengage' | 'isolated'
  kind text not null default 'module',
  title text not null,
  body text,
  href text,
  cta text,
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists automations_org_idx on public.automations (org_id);
alter table public.automations enable row level security; -- service-role only

-- Richer white-label landing content, all optional (the page shows tasteful
-- placeholder copy until these are set):
--   about      : a short intro paragraph under the hero.
--   highlights : [{title, body}] institution-specific "why us" factor cards.
--   faculty    : [{name, title, image_url}] key people shown as circles.
alter table public.organizations add column if not exists about text;
alter table public.organizations add column if not exists highlights jsonb;
alter table public.organizations add column if not exists faculty jsonb;

-- The institution's "presence" — a warm, persistent voice that remembers each
-- learner (the Ritz "Mystique"). presence_name is what the org calls it; the
-- voice guides how it speaks. Both optional; a tasteful default is used if unset.
alter table public.organizations add column if not exists presence_name text;
alter table public.organizations add column if not exists presence_voice text;

-- Data Processing Agreement acceptance (org customer accepts the processor
-- terms). Records when and who.
alter table public.organizations add column if not exists dpa_accepted_at timestamptz;
alter table public.organizations add column if not exists dpa_accepted_by text;

-- ============================================================================
-- Learner memory — the presence's per-relationship "Mystique" record. One row
-- per (learner, org): a cached, warm summary the institution reflects back
-- (greeting + what it remembers + a hook for the next unprompted touch). Built
-- from the learner's own activity; shown TO them and theirs to edit/forget.
-- ============================================================================
create table if not exists public.learner_memory (
  user_id     uuid not null references auth.users(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  greeting    text,
  remembers   jsonb,          -- string[] shown in "what I remember"
  hook        text,           -- the seed for the next unprompted reach
  reach       jsonb,          -- {title,url,source}: a current/trending item tied to the last module
  n_sessions  int default 0,  -- staleness signal: rebuild when the count moves
  updated_at  timestamptz default now(),
  primary key (user_id, org_id)
);
alter table public.learner_memory add column if not exists reach jsonb;
alter table public.learner_memory enable row level security;
-- The learner can read and clear their own memory; writes go through the service
-- role (the refresh endpoint), so no insert/update policy for the learner.
drop policy if exists learner_memory_own_select on public.learner_memory;
create policy learner_memory_own_select on public.learner_memory for select using (auth.uid() = user_id);
drop policy if exists learner_memory_own_delete on public.learner_memory;
create policy learner_memory_own_delete on public.learner_memory for delete using (auth.uid() = user_id);

-- ============================================================================
-- Role model (phase 1): an org's staff is a Director (runs the whole org, sees
-- all its cohorts) or an Instructor (runs their own cohorts only). 'facilitator'
-- was the single legacy staff role → fold it into 'director'.
-- ============================================================================
update public.org_members  set org_role = 'director' where org_role = 'facilitator';
update public.org_invites  set org_role = 'director' where org_role = 'facilitator';

-- Master cohort: a default class per org that every member belongs to, so an
-- org has an "everyone" group with a real cohort code (live activities + roll-ups
-- work org-wide with no sections). is_default marks it.
alter table public.classes add column if not exists is_default boolean not null default false;

-- Backfill: give every existing org a master cohort (code derived from the org
-- id so it's unique + stable), then put every current member in it.
insert into public.classes (code, name, owner_id, org_id, is_default, modules)
select 'ORG-' || upper(substring(replace(o.id::text, '-', ''), 1, 10)),
       o.name || ' — All members', o.owner_id, o.id, true, coalesce(o.modules, '[]'::jsonb)
from public.organizations o
where o.owner_id is not null
  and not exists (select 1 from public.classes c where c.org_id = o.id and c.is_default);

insert into public.class_members (class_id, user_id)
select c.id, m.user_id
from public.org_members m
join public.classes c on c.org_id = m.org_id and c.is_default
on conflict do nothing;

-- ============================================================================
-- The CLASS tier: school/company > CLASS (dept or course) > COHORT (section).
-- A class owns a reusable module set that every cohort under it inherits (a
-- cohort can add its own on top). The existing `classes` table is the COHORT;
-- this `class_units` table is the CLASS. Defined here because it references
-- `organizations`, which is created above.
-- ============================================================================
create table if not exists public.class_units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete set null, -- the instructor who created it (null = org default, director-managed)
  name text not null,
  modules jsonb not null default '[]'::jsonb, -- the reusable module set cohorts inherit
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.class_units enable row level security;
drop policy if exists "class_units read" on public.class_units;
create policy "class_units read" on public.class_units
  for select using (auth.role() = 'authenticated'); -- read so inheritance resolves; writes via service role
-- URL slug for the hierarchical path org/class/cohort/module. Unique per org is
-- enforced in the API; this index is for lookup.
alter table public.class_units add column if not exists slug text;
create index if not exists class_units_org_slug_idx on public.class_units (org_id, slug);
update public.class_units
  set slug = coalesce(nullif(trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'class')
  where slug is null;
-- Each cohort's parent class (nullable: personal / org-less cohorts have none).
alter table public.classes add column if not exists class_unit_id uuid references public.class_units (id) on delete set null;
create index if not exists classes_class_unit_idx on public.classes (class_unit_id);

-- Backfill: one default "General" class per org, then point every existing
-- cohort at its org's default class. Cohorts reorganize into real classes later.
insert into public.class_units (org_id, name, is_default)
select o.id, 'General', true
from public.organizations o
where not exists (select 1 from public.class_units cu where cu.org_id = o.id and cu.is_default);

update public.classes c
set class_unit_id = cu.id
from public.class_units cu
where cu.org_id = c.org_id and cu.is_default and c.class_unit_id is null and c.org_id is not null;

-- ============================================================================
-- Staff invite links: a director shares a link/code that grants instructor
-- status to whoever opens it (optionally restricted to an email domain). All
-- create/redeem/revoke goes through the service role.
-- ============================================================================
create table if not exists public.staff_invite_links (
  token text primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  role text not null default 'instructor',
  domain text, -- optional email-domain restriction, e.g. 'duke.edu'
  created_by uuid references auth.users (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff_invite_links enable row level security;
-- No policies: all access is via service-role routes.

-- One compact row per authored-engine run (negotiation, news, analytical, ...),
-- keyed by user + slug (no cohort needed). The cohort chat joins these to the
-- cohort's members, so "Ask your cohort" can see these module types too.
create table if not exists public.mechanics_results (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  slug text not null,
  user_id uuid references auth.users (id) on delete cascade,
  score int,
  summary text,
  created_at timestamptz not null default now()
);
alter table public.mechanics_results enable row level security;
create index if not exists mechanics_results_user_idx on public.mechanics_results (user_id, created_at desc);
-- No policies: written and read via service-role routes only.

-- Module funnel events for drop-off analysis (superadmin only). One row per
-- stage a learner reaches in a module run: 'start' when they open it, 'complete'
-- when the report/result lands. Distinct users per stage give the completion
-- rate. Written and read via service-role only.
create table if not exists public.module_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  kind text,
  user_id uuid references auth.users (id) on delete set null,
  stage text not null,
  created_at timestamptz not null default now()
);
alter table public.module_events enable row level security;
create index if not exists module_events_slug_idx on public.module_events (slug, stage);

-- ============================================================================
-- Contact messages: submissions from the public /contact form. All access via
-- the service-role API — the public form posts through /api/contact and only
-- the superadmin reads them. RLS with no policies denies direct client access.
-- ============================================================================
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  org text,
  message text not null,
  source text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;

-- ============================================================================
-- AI events: real measured usage + errors + latency for every AI call, written
-- best-effort from lib/ai.ts (service role). Powers the admin AI health/cost
-- page (actual spend, error rate, latency), complementing the estimate on
-- /admin/costs. RLS with no policies denies direct client access; only the
-- service-role admin reads it.
-- ============================================================================
create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  model text,
  flow text,
  ok boolean not null default true,
  error text,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer
);
create index if not exists ai_events_created_idx on public.ai_events (created_at desc);
alter table public.ai_events enable row level security;

-- ============================================================================
-- Credentials: earned, verifiable badges + track certificates for completed
-- exercises. Rows are materialized (idempotent upsert) from real completions on
-- the /achievements page; each row backs a public verify page at /c/<id> and a
-- LinkedIn "Add to profile" credential. RLS lets owners read their own; the
-- public verify page + OG image read via the service-role admin client.
-- ============================================================================
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,           -- 'exercise' | 'track'
  ckey text not null,           -- module slug (exercise) or track key (track)
  title text not null,          -- human-readable credential name (snapshot)
  earned_at timestamptz not null default now(),
  unique (user_id, kind, ckey)
);
create index if not exists credentials_user_idx on public.credentials (user_id, earned_at desc);
alter table public.credentials enable row level security;
drop policy if exists "credentials owner read" on public.credentials;
create policy "credentials owner read" on public.credentials
  for select using (auth.uid() = user_id);

-- ============================================================================
-- Bundles: author-defined credential certificates. A bundle is a coherent set
-- of modules (core + choose-N electives) that earns a certificate. Built-in
-- bundles live in code (lib/credentials.ts BUNDLES); this table holds ones
-- created via UI: org_id NULL = a platform/global bundle (superadmin), org_id
-- set = an org bundle (director), visible to and earned by that org's members.
-- Writes go through service-role admin routes only (gated in app code).
-- ============================================================================
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,           -- slug; the credential ckey + /c verify lookup
  name text not null,                 -- the certificate name (postable)
  line text,                          -- one-line capability it certifies
  core jsonb not null default '[]'::jsonb,        -- required module slugs
  electives jsonb not null default '[]'::jsonb,   -- elective module slugs
  electives_needed int not null default 0,        -- how many electives to earn
  skills jsonb not null default '[]'::jsonb,       -- professional skills
  org_id uuid references public.organizations (id) on delete cascade, -- null = global
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bundles_org_idx on public.bundles (org_id);
alter table public.bundles enable row level security;
drop policy if exists "bundles read" on public.bundles;
create policy "bundles read" on public.bundles
  for select using (auth.role() = 'authenticated');
-- writes go through service-role admin/director routes only

-- =============================================================================
-- Author-built modules ("no-code" builder). A custom module stores its author
-- BuilderSpec (source of truth); the app compiles it to a runnable CanvasDef at
-- load time, applying immutable safety rails. org_id null = global (superadmin,
-- everyone sees it); org_id set = visible only to that org's members (director).
-- Reads are org-isolated at the DB level too; writes go through service-role
-- builder routes that re-check the author's role.
-- =============================================================================
create table if not exists public.custom_modules (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- catalog slug (namespaced, never collides with built-ins)
  exercise text unique not null,             -- session key, always "custom:<slug>"
  name text not null,
  super_type text not null default 'report', -- report | scorecard | verdict
  spec jsonb not null,                       -- the BuilderSpec
  org_id uuid references public.organizations (id) on delete cascade, -- null = global
  status text not null default 'published',  -- draft | published
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists custom_modules_org_idx on public.custom_modules (org_id);
create index if not exists custom_modules_slug_idx on public.custom_modules (slug);
alter table public.custom_modules enable row level security;
-- Read: global modules, or modules of an org you belong to. Nothing else.
drop policy if exists "custom_modules read" on public.custom_modules;
create policy "custom_modules read" on public.custom_modules
  for select using (
    org_id is null
    or exists (
      select 1 from public.org_members m
      where m.org_id = custom_modules.org_id and m.user_id = auth.uid()
    )
  );
-- writes go through service-role builder routes only (no insert/update/delete policy)

-- =============================================================================
-- Presentations ("decks"): author-built slide decks that mix static slides
-- (title, bullets, section, text, quote, image) with LIVE Superadditive
-- activities (word cloud, room photo) embedded inline. Authorable by
-- instructors, directors, and superadmins. Decks are presented live by their
-- author, so reads are author-scoped; writes go through service-role routes
-- that also materialize the embedded activity instances.
-- =============================================================================
create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default '',
  slides jsonb not null default '[]'::jsonb,     -- ordered Slide[]
  org_id uuid references public.organizations (id) on delete set null, -- informational
  status text not null default 'draft',          -- draft | published
  author_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists presentations_author_idx on public.presentations (author_id);
create index if not exists presentations_slug_idx on public.presentations (slug);
alter table public.presentations enable row level security;
drop policy if exists "presentations read own" on public.presentations;
create policy "presentations read own" on public.presentations
  for select using (author_id = auth.uid());
-- writes go through service-role builder routes only

-- Per-instance quiz questions: when set, this quiz uses its own config;
-- when null, it falls back to the shared benchmark_config (existing behavior).
alter table public.quiz_sessions add column if not exists config jsonb;
