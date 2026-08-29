import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { moduleBySlug, MODULES } from "@/lib/modules";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---- Tier configuration (env-overridable so you can tune without a deploy) ---
// Free tier: only these modules, this many runs each (mistakes/retries allowed).
export const FREE_TIER_RUNS = num(process.env.FREE_TIER_RUNS, 4);
// The runs wallet (consumer credits model). Everyone gets FREE_RUNS to start; a
// pack purchase adds PACK_RUNS credits. A "run" is one PERSONAL (null-cohort)
// session of a for-sale exercise, drawn from the shared wallet — spend it on any
// exercise. Runs done through a class/org (cohort-tagged) are FREE and never
// counted: the B2B2C no-arbitrage guarantee. Both env-tunable without a deploy.
export const FREE_RUNS = num(process.env.FREE_RUNS, 10);
export const PACK_RUNS = num(process.env.PACK_RUNS, 60);
// Legacy per-module cap knobs — kept only so old imports don't break; the wallet
// model above supersedes them.
export const PAID_UNLIMITED = (process.env.PAID_UNLIMITED ?? "false") !== "false";
export const PAID_RUNS = num(process.env.PAID_RUNS, 5);
// The modules offered on the free tier. Comma-separated slugs in FREE_TIER_MODULES,
// else this default hero set. Everything not listed is paid-only.
export const FREE_TIER_MODULES = new Set(
  (process.env.FREE_TIER_MODULES || "solo-ai,career-x-ray,career-roadmap")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function num(v: string | undefined, d: number) {
  const n = parseInt(v || "", 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

export type AccessVia = "free-module" | "admin" | "cohort" | "org" | "entitled" | "free-tier" | "credits" | "blocked";
export type AccessResult = { ok: boolean; via: AccessVia; runs: number; cap: number };

type Ent = { module: string; current_period_end: string | null; current_period_start: string | null };

// Active entitlements only (drop lapsed annual subscriptions).
async function activeEnts(supabase: SupabaseClient, userId: string): Promise<Ent[]> {
  const { data } = await supabase
    .from("entitlements")
    .select("module, current_period_end, current_period_start")
    .eq("user_id", userId);
  const now = Date.now();
  return (data || []).filter((r: any) => !r.current_period_end || new Date(r.current_period_end).getTime() > now) as Ent[];
}

// The set of active entitlement targets ("all" and/or slugs) — expired
// subscriptions excluded. For catalog display + the paywall's already-owned check.
export async function activeEntitlements(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  return new Set((await activeEnts(supabase, userId)).map((e) => e.module));
}

// How many times this person has run an exercise (as host or guest), optionally
// only counting runs since a timestamp (used to reset paid runs each period).
async function runsUsed(supabase: SupabaseClient, userId: string, exercise: string, since?: string | null): Promise<number> {
  let q = supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .eq("exercise", exercise);
  if (since) q = q.gte("created_at", since);
  const { count } = await q;
  return count || 0;
}

// Every module slug the user gets for free via a class they belong to OR an org
// they're in (that class/org includes the module). Checked across ALL their
// memberships, so access does not depend on how the module was launched or on
// the session being tagged with a cohort.
export async function grantedModuleSlugs(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const { data: cms } = await supabase.from("class_members").select("class_id").eq("user_id", userId);
    const ids = [...new Set(((cms as any[]) || []).map((r) => r.class_id).filter(Boolean))];
    if (ids.length) {
      const { data: cls } = await supabase.from("classes").select("modules, class_unit_id").in("id", ids);
      const unitIds = new Set<string>();
      for (const c of (cls as any[]) || []) {
        for (const s of ((c.modules as any[]) || [])) out.add(String(s));
        if (c.class_unit_id) unitIds.add(String(c.class_unit_id));
      }
      // Inherit the parent CLASS's module set (school > class > cohort).
      if (unitIds.size) {
        try {
          const { data: units } = await supabase.from("class_units").select("modules").in("id", [...unitIds]);
          for (const u of (units as any[]) || []) for (const s of ((u.modules as any[]) || [])) out.add(String(s));
        } catch { /* class_units not set up yet → cohort modules only */ }
      }
    }
  } catch { /* RLS or missing table → no class grants */ }
  try {
    const { data: orgMems } = await supabase.from("org_members").select("organizations(modules)").eq("user_id", userId);
    for (const m of (orgMems as any[]) || []) {
      const mods = m.organizations?.modules;
      if (Array.isArray(mods)) for (const s of mods) out.add(String(s));
    }
  } catch { /* no org grants */ }
  return out;
}

// The set of exercises that belong to a for-sale module (i.e. draw from the
// wallet when run personally). Free/instructor-run modules are excluded.
function forSaleExercises(): Set<string> {
  return new Set(MODULES.filter((m) => m.forSale !== false).map((m) => m.exercise));
}

// Credits bought (or comped/refunded): the sum of the run_credits ledger.
async function purchasedCredits(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase.from("run_credits").select("delta").eq("user_id", userId);
  return (data || []).reduce((s: number, r: any) => s + (r.delta || 0), 0);
}

// Personal runs consumed: this user's sessions with NO cohort tag (institutional
// runs are cohort-tagged → free, excluded) on for-sale exercises.
async function personalRunsUsed(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from("sessions")
    .select("exercise")
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .is("cohort", null);
  const forSale = forSaleExercises();
  let n = 0;
  for (const r of (data as any[]) || []) if (forSale.has((r as any).exercise)) n++;
  return n;
}

export type Wallet = { free: number; purchased: number; used: number; balance: number };

// The user's runs wallet. `balance` is FREE_RUNS + purchased − used (may dip to
// the current in-progress run at the gate; clamp for display).
export async function runWallet(supabase: SupabaseClient, userId: string): Promise<Wallet> {
  const [purchased, used] = await Promise.all([
    purchasedCredits(supabase, userId),
    personalRunsUsed(supabase, userId),
  ]);
  return { free: FREE_RUNS, purchased, used, balance: FREE_RUNS + purchased - used };
}

// The single source of truth for "can this user run this module right now?".
export async function moduleRunAccess(
  supabase: SupabaseClient,
  opts: { userId: string; slug: string; exercise: string; cohort?: string | null; isAdmin?: boolean }
): Promise<AccessResult> {
  const mod = moduleBySlug(opts.slug);
  const unlimited = (via: AccessVia): AccessResult => ({ ok: true, via, runs: 0, cap: Infinity });
  if (mod?.forSale === false) return unlimited("free-module");
  if (!PAYMENTS_ENABLED) return unlimited("free-module");
  if (opts.isAdmin) return unlimited("admin");

  // Institutional run — a cohort-tagged launch, OR a module granted by any class
  // /org the user belongs to. FREE and never drawn from the personal wallet.
  // This is the B2B2C no-arbitrage guarantee: a seat is always better than a pack.
  if (opts.cohort) return unlimited("cohort");
  const granted = await grantedModuleSlugs(supabase, opts.userId);
  if (granted.has(opts.slug)) return unlimited("cohort");

  // Personal run → draw from the shared runs wallet. `used` includes the current
  // session (created before this gate runs), so allow while balance ≥ 0.
  const w = await runWallet(supabase, opts.userId);
  const ok = w.balance >= 0;
  return { ok, via: ok ? "credits" : "blocked", runs: Math.max(0, w.used), cap: w.free + w.purchased };
}

// For the catalog: null = runnable now (free/granted, or wallet has balance) →
// no per-module counter; 0 = locked (paid exercise, wallet empty → buy runs).
// The user's actual run balance is shown once, globally, on the dashboard.
export async function runsLeftByModule(
  supabase: SupabaseClient,
  userId: string,
  isAdmin = false
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  if (!PAYMENTS_ENABLED || isAdmin) {
    for (const m of MODULES) out[m.slug] = null;
    return out;
  }
  const granted = await grantedModuleSlugs(supabase, userId);
  const hasBalance = (await runWallet(supabase, userId)).balance > 0;
  for (const m of MODULES) {
    if (m.forSale === false || granted.has(m.slug)) { out[m.slug] = null; continue; }
    out[m.slug] = hasBalance ? null : 0; // runnable from the shared wallet, or locked
  }
  return out;
}

// Has this user ever been in ANY cohort (your class or a corporate rollout)?
// If so, they get the reduced $19 all-access price instead of the public $29/yr.
export async function cohortAlumnus(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("class_members")
    .select("class_id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count || 0) > 0;
}

// The time-boxed alumni offer. A cohort alumnus gets a limited window to grab
// all-access at the $19 price — urgency drives the conversion. The clock starts
// the first time we show it (persisted on the profile), so it's a real, honest
// deadline rather than a permanent "sale". Returns whether it's live now and how
// many days remain. Callers still gate on payments being on and not-yet-entitled.
export const ALUMNI_OFFER_DAYS = num(process.env.ALUMNI_OFFER_DAYS, 14);
export async function alumniOffer(
  supabase: SupabaseClient,
  userId: string
): Promise<{ active: boolean; daysLeft: number }> {
  if (!(await cohortAlumnus(supabase, userId))) return { active: false, daysLeft: 0 };
  const { data } = await supabase.from("profiles").select("alumni_offer_at").eq("id", userId).maybeSingle();
  let startedAt = (data as any)?.alumni_offer_at as string | null;
  if (!startedAt) {
    // First exposure — start the clock (idempotent; own-row update under RLS).
    startedAt = new Date().toISOString();
    await supabase.from("profiles").update({ alumni_offer_at: startedAt }).eq("id", userId);
  }
  const endMs = new Date(startedAt).getTime() + ALUMNI_OFFER_DAYS * 86_400_000;
  const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / 86_400_000));
  return { active: daysLeft > 0, daysLeft };
}
