-- Kirkpatrick L1/L2 instrumentation, keyed by session code so it joins to the
-- randomized arm (experiment_assignments) and the post-competence already on the
-- conversation spine (conversations.outcome + .dynamics). This table holds only the
-- two NEW measures: the L1 reaction and the L0 pre-judgment. The causal L2 contrast
-- is then L2_post(treated) - L0_pre(not-yet-treated), grouped by arm. Run in Supabase.
create table if not exists learning_measures (
  code       text primary key,          -- the run's session code (join key)
  module     text,                       -- the exercise/module key
  person_id  uuid references profiles(id),
  cohort     text,                        -- for cohort-level (cluster) analysis
  reaction   jsonb,                       -- L1: { applicability: 1-5, comment? }
  prediction jsonb,                       -- L0 pre: the learner's prior judgment (predict-gate)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists learning_measures_module on learning_measures (module);
create index if not exists learning_measures_cohort on learning_measures (cohort);
