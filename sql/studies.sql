-- Field-experiment studies at the COHORT level (Level 2). A study groups cohorts
-- (classes) into a randomized design and freezes their assignment, so the causal
-- contrast is by design, not by after-the-fact slicing.
--
--   cluster        — cohorts are randomized to a condition (A/B, treatment/control).
--                    People are randomized into cohorts, so cohorts are exchangeable
--                    and the contrast is a clean cluster-RCT at the unit a customer
--                    actually deploys.
--   stepped_wedge  — cohorts are assigned to WAVES; each wave's treatment unlocks at
--                    its wave_start. Not-yet-treated cohorts are the control, and
--                    everyone is eventually treated (no one is denied).
--
-- The randomization SEED is frozen at creation; assignment is a pure hash of
-- (seed, cohort_code), logged in the audit trail as the pre-registration record.
-- All additive; the app degrades to normal behavior when a cohort is in no study.
create table if not exists studies (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  org_id          uuid,
  design          text not null default 'cluster',   -- 'cluster' | 'stepped_wedge'
  metric          text not null default 'competence', -- the L2 outcome contrasted (conversations.outcome)
  intake_code     text,             -- optional: a single join code that randomizes people INTO the study's cohorts
  seed            text not null,    -- frozen randomization seed
  status          text not null default 'draft',      -- 'draft' | 'running' | 'concluded'
  plan            jsonb,            -- pre-registered estimand / analysis plan (frozen text)
  preregistered_at timestamptz,
  created_by      uuid,
  created_at      timestamptz not null default now()
);
create index if not exists studies_org on studies (org_id);
create unique index if not exists studies_intake_code on studies (upper(intake_code)) where intake_code is not null;

-- The frozen cohort → condition/wave assignment (one row per cohort in a study).
create table if not exists study_cohorts (
  study_id     uuid not null references studies(id) on delete cascade,
  cohort_code  text not null,       -- the class code (classes.code)
  condition    text,                -- cluster arm label, e.g. 'treatment' | 'control' | 'A' | 'B'
  wave         int,                 -- stepped-wedge wave index (0-based)
  wave_start   date,                -- when this cohort's treatment unlocks (stepped-wedge)
  intake_open  boolean not null default true, -- eligible to receive randomized intake joins
  assigned_at  timestamptz not null default now(),
  primary key (study_id, cohort_code)
);
create index if not exists study_cohorts_code on study_cohorts (cohort_code);
