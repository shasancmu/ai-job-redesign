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

-- Richer white-label landing content, all optional (the page shows tasteful
-- placeholder copy until these are set):
--   about      : a short intro paragraph under the hero.
--   highlights : [{title, body}] institution-specific "why us" factor cards.
--   faculty    : [{name, title, image_url}] key people shown as circles.
alter table public.organizations add column if not exists about text;
alter table public.organizations add column if not exists highlights jsonb;
alter table public.organizations add column if not exists faculty jsonb;

-- Data Processing Agreement acceptance (org customer accepts the processor
-- terms). Records when and who.
alter table public.organizations add column if not exists dpa_accepted_at timestamptz;
alter table public.organizations add column if not exists dpa_accepted_by text;

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
