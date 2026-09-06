-- Program spotlights ("ads"): an org owner promotes a program or event with a
-- module-shaped card that links to an internal landing page, and we track how it
-- performs (impressions, clicks, CTA clicks, interest). Written only by the
-- server (service role); RLS is on with no policies, so nothing is directly
-- readable/writable by clients — the admin analytics and the landing page read
-- it server-side, gated to the org's director. Apply in the Supabase SQL editor.

create table if not exists public.org_ads (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  created_by  uuid,
  slug        text not null unique,          -- the internal landing URL: /promo/<slug>
  emoji       text,                          -- the card icon
  title       text not null,
  tagline     text,                          -- the card subtitle
  body        text,                          -- the landing page copy (plain text / light markdown)
  image_url   text,                          -- optional hero image on the landing page
  cta_label   text,                          -- e.g. "Register", "Learn more"
  cta_url     text,                          -- the external destination the CTA opens (tracked)
  status      text not null default 'draft', -- draft | published
  starts_at   timestamptz,                   -- optional schedule window
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists org_ads_org_idx on public.org_ads (org_id, status);

-- One row per interaction. Mirrors module_events / case_events.
create table if not exists public.ad_events (
  id         bigint generated always as identity primary key,
  ad_id      uuid not null,
  org_id     uuid,                 -- denormalized so org-scoped rollups are cheap
  user_id    uuid,                 -- set when the viewer is signed in
  anon_id    text,                 -- a per-browser id otherwise
  cohort     text,                 -- the class/assignment tag from the link (?c=)
  kind       text not null,        -- impression | click | cta | interest
  created_at timestamptz not null default now()
);

create index if not exists ad_events_ad_idx on public.ad_events (ad_id, kind);
create index if not exists ad_events_org_idx on public.ad_events (org_id, created_at desc);

alter table public.org_ads   enable row level security;
alter table public.ad_events enable row level security;
-- No policies: only the service-role client (createAdminClient) may read or write.
