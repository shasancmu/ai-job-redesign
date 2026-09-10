-- The ratchet. When the autopilot adopts a winning treatment, the winning nudge
-- becomes the flow's new baseline — applied to EVERY run of that flow through the
-- same experimentNudge seam, whether or not an experiment is currently running.
-- This is what makes the closed loop persistent: each adopted improvement is a
-- permanent floor the next experiment builds on. Apply in the Supabase SQL editor.
-- Fail-safe: inert until applied (getBaseline returns "" if the table is absent).

create table if not exists experiment_baselines (
  flow text not null,
  target text not null default 'interview',   -- 'interview' | 'report'
  nudge text not null default '',             -- the accumulated, adopted instruction
  history jsonb not null default '[]'::jsonb, -- the increments adopted over time, for provenance
  updated_at timestamptz not null default now(),
  primary key (flow, target)
);
