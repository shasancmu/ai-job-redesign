-- Translation memory: caches a translated string per language so each phrase is
-- translated by the model at most ONCE per language, ever, then reused for free.
-- Powers on-demand localization of module text the static messages/*.json bundle
-- can't cover — custom (Studio) modules' authored text, and any new module's
-- labels. Additive; run in Supabase.
create table if not exists translations (
  source_hash text not null,   -- sha256 of the source (English) string
  lang        text not null,   -- target language, e.g. "Chinese (Simplified)"
  source      text,            -- kept for debugging/inspection
  translated  text not null,
  created_at  timestamptz not null default now(),
  primary key (source_hash, lang)
);
