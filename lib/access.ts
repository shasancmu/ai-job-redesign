import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { moduleBySlug, MODULES } from "@/lib/modules";
import { hasClassAccess } from "@/lib/classes";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---- Tier configuration (env-overridable so you can tune without a deploy) ---
// Free tier: only these modules, this many runs each (mistakes/retries allowed).
export const FREE_TIER_RUNS = num(process.env.FREE_TIER_RUNS, 4);
// Paid ($29 or $19 cohort alumni): every module, this many runs per purchase.
export const PAID_RUNS = num(process.env.PAID_RUNS, 3);
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

export type AccessVia = "free-module" | "admin" | "cohort" | "entitled" | "free-tier" | "blocked";
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

  // Cohort's selected modules are free (unlimited) for its members.
  if (opts.cohort && (await hasClassAccess(supabase, opts.userId, opts.cohort, opts.slug))) {
    return unlimited("cohort");
  }

  // Paid all-access takes precedence: PAID_RUNS per module, counted since the
  // purchase (re-buying resets the window). The run count INCLUDES the current
  // session, so allow while runs ≤ cap.
  const ents = await activeEnts(supabase, opts.userId);
  const paid = ents.find((e) => e.module === "all") || ents.find((e) => e.module === opts.slug);
  if (paid) {
    const runs = await runsUsed(supabase, opts.userId, opts.exercise, paid.current_period_start);
    return { ok: runs <= PAID_RUNS, via: runs <= PAID_RUNS ? "entitled" : "blocked", runs, cap: PAID_RUNS };
  }

  // Otherwise, free-tier modules get FREE_TIER_RUNS each (lifetime); everything
  // else needs a purchase.
  if (FREE_TIER_MODULES.has(opts.slug)) {
    const runs = await runsUsed(supabase, opts.userId, opts.exercise);
    return { ok: runs <= FREE_TIER_RUNS, via: runs <= FREE_TIER_RUNS ? "free-tier" : "blocked", runs, cap: FREE_TIER_RUNS };
  }
  return { ok: false, via: "blocked", runs: 0, cap: 0 };
}

// Runs remaining per module for a user, for the catalog counter. null =
// unlimited (admin, payments off, free-to-run module); a number = new runs they
// can still start; 0 = out (locked, or entitlement exhausted → re-buy).
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
  const ents = await activeEnts(supabase, userId);
  const paid = ents.find((e) => e.module === "all");
  const since = paid?.current_period_start || null;

  // Count this user's sessions per exercise (paid → since the purchase window).
  let q = supabase.from("sessions").select("exercise").or(`host_id.eq.${userId},guest_id.eq.${userId}`);
  if (since) q = q.gte("created_at", since);
  const { data } = await q;
  const counts: Record<string, number> = {};
  for (const r of data || []) counts[(r as any).exercise] = (counts[(r as any).exercise] || 0) + 1;

  for (const m of MODULES) {
    if (m.forSale === false) { out[m.slug] = null; continue; }
    const used = counts[m.exercise] || 0;
    if (paid) out[m.slug] = Math.max(0, PAID_RUNS - used);
    else if (FREE_TIER_MODULES.has(m.slug)) out[m.slug] = Math.max(0, FREE_TIER_RUNS - used);
    else out[m.slug] = 0; // paid-only module, not owned
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
