-- Makes the conversation spine analysis-ready for causal impact measurement under
-- adaptive experimentation. Three fields, stamped per conversation:
--   holdout          — was this run in the frozen counterfactual arm (original prompt)?
--   propensity       — the KNOWN assignment probability it received (FRAC or 1-FRAC),
--                      for design-based and adaptively-weighted (AIPW) estimators
--   baseline_version — how many adopted ratchet increments were live for this flow
--                      when the run happened (the policy "dose"; 0 = original)
-- Apply in the Supabase SQL editor. Fail-safe: logConversation writes these in a
-- separate best-effort update, so the core logging works whether or not this ran.

alter table conversations add column if not exists holdout boolean;
alter table conversations add column if not exists propensity numeric;
alter table conversations add column if not exists baseline_version int;

create index if not exists conversations_holdout on conversations (module, holdout);
