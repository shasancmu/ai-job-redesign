-- Creator attribution v1: a person's public teaching identity, shown on the
-- modules they choose to SIGN. Ownership is the person (custom_modules.author_id,
-- already present); the institution badge is verified by live org membership, so it
-- travels with the person when they change institutions. Run in Supabase.

alter table profiles add column if not exists title       text;  -- "Professor of Strategy"
alter table profiles add column if not exists institution text;  -- self-stated fallback; the badge prefers a verified org
alter table profiles add column if not exists bio         text;  -- one paragraph, shown on the creator page
alter table profiles add column if not exists avatar_url  text;  -- headshot
alter table profiles add column if not exists handle      text;  -- pretty URL: /by/<handle>

-- A creator's page lives at a stable, shareable handle.
create unique index if not exists profiles_handle_key on profiles (lower(handle)) where handle is not null;
