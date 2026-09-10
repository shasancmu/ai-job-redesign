-- Per-run experiment outcomes for scored engines (roleplay, negotiation,
-- analytical, benchmark, …). When an assigned run finishes, the engine writes
-- one row here with its score and completion, so the stats core can measure
-- experiments on modules whose results don't live in sessions/workspaces.
-- Apply in the Supabase SQL editor.
create table if not exists experiment_outcomes (
  experiment_id uuid not null,
  run_key text not null,
  variant_key text not null,
  score numeric,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (experiment_id, run_key)
);
create index if not exists experiment_outcomes_exp on experiment_outcomes (experiment_id);
