-- Language copies of Studio modules. A superadmin (or the module's org director)
-- can publish an AI-translated copy of a custom module in another language. The
-- copy is a normal custom_modules row with its spec fully translated; these two
-- columns just record what it is and where it came from. Additive; run in Supabase.
alter table custom_modules add column if not exists language    text;  -- the copy's language, e.g. "Chinese (Simplified)"; null = the original
alter table custom_modules add column if not exists source_slug text;  -- the slug this was translated from (lineage)
create index if not exists custom_modules_source on custom_modules (source_slug) where source_slug is not null;
