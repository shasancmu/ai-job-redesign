-- L2 validation / calibration. The competence score on conversations.outcome is
-- AI-graded; before anyone should trust it (or an acquirer's methodologist will
-- accept it), we show the AI grader agrees with human expert raters. Human raters
-- score the SAME runs against the same rubric, blind to the arm and to the AI's
-- score; lib/reliability.ts then reports ICC, correlation, and bias.
--
-- The AI score already lives on the spine (conversations.outcome); this table holds
-- the human ratings, paired to it by conversation_id. Multiple humans per run give
-- the human-among-human reliability (the ceiling the AI is measured against).
-- Additive; run in Supabase.
create table if not exists rater_scores (
  id               bigserial primary key,
  conversation_id  text not null,     -- joins to conversations.conversation_id (the run/code)
  module           text,
  rater_id         uuid not null,     -- the human expert
  rater_email      text,
  score            numeric not null,  -- competence, same 0-100 construct as the AI
  rubric_version   text,              -- which rubric they scored against
  notes            text,
  created_at       timestamptz not null default now()
);
create unique index if not exists rater_scores_conv_rater on rater_scores (conversation_id, rater_id);
create index if not exists rater_scores_module on rater_scores (module);
