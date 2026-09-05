-- Monthly API-usage meter, used to hard-cap paid web-search (Tavily) calls so the
-- platform is never billed past the free tier. Apply in the Supabase SQL editor.
-- Until this is applied, lib/cases/webResearch.ts fails closed (no web search).

create table if not exists public.api_usage (
  provider   text not null,
  period     text not null,             -- 'YYYY-MM' (UTC)
  count      int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider, period)
);

-- Atomic increment: bumps the month's counter by one and returns the NEW value.
-- Runs as the definer (service role) so RLS never blocks the meter.
create or replace function public.incr_api_usage(p_provider text, p_period text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare new_count int;
begin
  insert into public.api_usage (provider, period, count)
  values (p_provider, p_period, 1)
  on conflict (provider, period)
  do update set count = api_usage.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$;

-- No public access; only the service-role client (createAdminClient) touches it.
revoke all on function public.incr_api_usage(text, text) from public, anon, authenticated;
alter table public.api_usage enable row level security;
