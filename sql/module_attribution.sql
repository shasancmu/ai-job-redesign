-- Attribute a module to the person whose judgment it carries, separate from who
-- operated the Studio. A director building on behalf of a professor credits the
-- professor. The credited person always controls their own name (accept/disavow),
-- because attribution is worth nothing if it can be faked. Run in Supabase.

alter table custom_modules add column if not exists attributed_to uuid references profiles(id);
-- 'active'  : shown (self-attribution, or the person is a member of the module's org — trust-then-disavow)
-- 'pending' : cross-org attribution awaiting the person's acceptance (approve-first)
-- 'removed' : the credited person disavowed it; byline hidden
alter table custom_modules add column if not exists attribution_status text not null default 'active';

create index if not exists custom_modules_attributed_to_idx on custom_modules (attributed_to);
