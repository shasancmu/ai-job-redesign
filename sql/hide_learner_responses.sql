-- Org privacy toggle: when on, staff "understanding" views stop incorporating
-- learners' verbatim written responses (they keep AI summaries, scores, and
-- completion). Default off preserves current behavior. Apply in the Supabase
-- SQL editor.
alter table organizations
  add column if not exists hide_learner_responses boolean not null default false;
