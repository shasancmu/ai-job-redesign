-- Enterprise plumbing: SSO domain routing, SCIM provisioning token, xAPI LRS
-- config, and an audit log. All additive; the app degrades gracefully when a
-- column/table is absent (see the code paths). Run in Supabase.

-- Org-level enterprise config.
alter table organizations add column if not exists sso_domain      text;  -- email domain that routes to this org's SSO (e.g. "duke.edu")
alter table organizations add column if not exists scim_token_hash text;  -- sha256 of the org's SCIM bearer token (raw token shown once)
alter table organizations add column if not exists lrs_endpoint    text;  -- xAPI LRS statements endpoint (customer's Learning Record Store)
alter table organizations add column if not exists lrs_key         text;  -- xAPI LRS Basic auth, stored as "key:secret"
create unique index if not exists organizations_sso_domain on organizations (lower(sso_domain)) where sso_domain is not null;

-- Append-only audit trail of security-relevant actions (the SOC 2 / security-
-- questionnaire backbone). Written server-side only.
create table if not exists audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_email text,
  org_id      uuid,
  action      text not null,   -- e.g. 'module.publish', 'org.branding.update', 'org.delete', 'data.export', 'scim.user.deactivate', 'sso.login'
  target      text,            -- the affected entity (slug, user id, cohort code…)
  meta        jsonb,           -- extra context
  ip          text
);
create index if not exists audit_log_org_at on audit_log (org_id, at desc);
create index if not exists audit_log_actor_at on audit_log (actor_id, at desc);
