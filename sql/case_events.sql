-- Engagement events for living cases: who opened a case, whether they finished
-- it, the decision they committed, which links they clicked, and the questions
-- they asked the tutor. Written only by the server (service role); RLS is on with
-- no policies, so nothing is directly readable/writable by clients. The instructor
-- insights view reads it server-side, author-gated. Apply in the Supabase SQL editor.

create table if not exists public.case_events (
  id         bigint generated always as identity primary key,
  case_slug  text not null,
  user_id    uuid,                 -- set when the student is signed in
  anon_id    text,                 -- a per-browser id when they are not
  cohort     text,                 -- the class/assignment tag from the link (?c=)
  kind       text not null,        -- open | complete | commit | link_click | ask
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists case_events_slug_idx on public.case_events (case_slug, created_at desc);
create index if not exists case_events_slug_kind_idx on public.case_events (case_slug, kind);

alter table public.case_events enable row level security;
-- No policies: only the service-role client (createAdminClient) may read or write.
