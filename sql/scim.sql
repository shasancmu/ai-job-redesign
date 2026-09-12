-- SCIM 2.0 provisioning (RFC 7643/7644). An enterprise IdP (Okta, Entra/Azure AD,
-- OneLogin…) creates, updates, and deactivates members automatically by calling our
-- /api/scim/v2 endpoints with the org's SCIM bearer token (its sha256 lives in
-- organizations.scim_token_hash — see sql/enterprise.sql). Each SCIM User is a row
-- here and is reconciled to org_members / org_invites. Additive; run in Supabase.
create table if not exists scim_users (
  id           uuid primary key default gen_random_uuid(),  -- the SCIM resource id (stable, returned to the IdP)
  org_id       uuid not null,
  external_id  text,           -- the IdP's own id for this user
  user_name    text not null,  -- SCIM userName; we treat it as the email
  email        text,
  given_name   text,
  family_name  text,
  active       boolean not null default true,
  user_id      uuid,           -- mapped auth.users id once the person has (or gets) an account
  raw          jsonb,          -- last full resource the IdP sent, for round-tripping unknown attrs
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists scim_users_org_username on scim_users (org_id, lower(user_name));
create index if not exists scim_users_org on scim_users (org_id);
create index if not exists scim_users_org_external on scim_users (org_id, external_id);
