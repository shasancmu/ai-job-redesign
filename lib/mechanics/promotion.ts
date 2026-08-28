// The visibility ladder shared by every engine. Default is Personal (the
// author's own classes). A director promotes to Org (judgment). A curator
// promotes to Global, but only after automated eligibility GATES pass — so the
// shared platform surface can't be flooded with mid-quality modules.
import { createAdminClient } from "@/lib/supabase/admin";

export type Tier = "personal" | "org" | "global";
export type ModuleKind = "roleplay" | "interview" | "negotiation" | "benchmark" | "analytical" | "redesign" | "live";

export type Usage = {
  supported: boolean; // whether this kind exposes global-grade usage signals yet
  runs: number; learners: number; cohorts: number;
  completionRate: number | null; // graded / started
  scoreLow: number | null; scoreHigh: number | null; // spread
  calibrationPresent: boolean; correctPct: number | null;
};

// Thresholds for global eligibility. Deliberately conservative.
export const GATES = { learners: 20, cohorts: 2, completion: 0.6, spreadLow: 40, spreadHigh: 60 };

export async function computeUsage(kind: ModuleKind, slug: string): Promise<Usage> {
  const empty: Usage = { supported: false, runs: 0, learners: 0, cohorts: 0, completionRate: null, scoreLow: null, scoreHigh: null, calibrationPresent: false, correctPct: null };
  if (kind !== "roleplay") return empty; // other engines: org tier only for now (usage signals not yet wired for global)
  try {
    const admin = createAdminClient();
    const [{ data: results }, { data: events }] = await Promise.all([
      admin.from("roleplay_results").select("user_id, cohort, score, verdict_correct, report").eq("slug", slug).limit(2000),
      admin.from("roleplay_events").select("code, phase").eq("slug", slug).limit(5000),
    ]);
    const rs = (results as any[]) || [];
    const runs = rs.length;
    const learners = new Set(rs.map((r) => r.user_id).filter(Boolean)).size;
    const cohorts = new Set(rs.map((r) => r.cohort).filter(Boolean)).size;
    const scores = rs.map((r) => (typeof r.score === "number" ? r.score : r.report?.score)).filter((n) => typeof n === "number") as number[];
    const scoreLow = scores.length ? Math.min(...scores) : null;
    const scoreHigh = scores.length ? Math.max(...scores) : null;
    const calibrationPresent = rs.some((r) => r.report?.calibration);
    let correct = 0, verdicted = 0; for (const r of rs) if (typeof r.report?.verdict_correct === "boolean") { verdicted++; if (r.report.verdict_correct) correct++; }
    const correctPct = verdicted ? Math.round((correct / verdicted) * 100) : null;
    // completion from events: distinct run codes that reached 'graded' vs. that started
    const started = new Set<string>(), graded = new Set<string>();
    for (const e of ((events as any[]) || [])) { if (e.code) { started.add(e.code); if (e.phase === "graded") graded.add(e.code); } }
    const completionRate = started.size ? graded.size / started.size : null;
    return { supported: true, runs, learners, cohorts, completionRate, scoreLow, scoreHigh, calibrationPresent, correctPct };
  } catch { return empty; }
}

// The two-key gate for GLOBAL: automated eligibility from usage + the in-editor
// quality evidence (critic + playtest) the author attaches when nominating.
export function globalGate(u: Usage, evidence: { criticReady?: boolean; playtestSeparates?: boolean }): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!u.supported) { missing.push("Global promotion isn't available for this module type yet (org promotion is)."); return { ok: false, missing }; }
  if (!evidence.criticReady) missing.push("Run the Critique and clear all high-severity findings (readiness: ready).");
  if (!evidence.playtestSeparates) missing.push("Run the Playtest and confirm it discriminates (strong beats weak, right call reached).");
  if (u.learners < GATES.learners) missing.push(`Reach ${GATES.learners} distinct learners (currently ${u.learners}).`);
  if (u.cohorts < GATES.cohorts) missing.push(`Run it in at least ${GATES.cohorts} cohorts (currently ${u.cohorts}).`);
  if ((u.completionRate ?? 0) < GATES.completion) missing.push(`Completion must be at least ${Math.round(GATES.completion * 100)}% (currently ${u.completionRate == null ? "unknown" : Math.round(u.completionRate * 100) + "%"}).`);
  if (u.scoreLow == null || u.scoreHigh == null || u.scoreLow > GATES.spreadLow || u.scoreHigh < GATES.spreadHigh) missing.push("Scores must show a real spread (some low, some high), not everyone the same.");
  if (!u.calibrationPresent) missing.push("Grading must include calibration.");
  return { ok: missing.length === 0, missing };
}

// A cheap decay flag for the curator: a once-global module whose live quality has
// slipped or which has gone quiet. Advisory, not automatic removal.
export function decayFlags(u: Usage): string[] {
  const f: string[] = [];
  if (u.supported) {
    if ((u.completionRate ?? 1) < 0.4) f.push("Completion has dropped below 40%.");
    if (u.scoreHigh != null && u.scoreHigh < 40) f.push("No one is scoring well anymore.");
  }
  return f;
}

// Current visibility of a module = the highest approved tier (global > org > personal).
export async function currentTier(kind: ModuleKind, slug: string): Promise<Tier> {
  try {
    const { data } = await createAdminClient().from("module_promotions").select("tier, status").eq("kind", kind).eq("slug", slug).eq("status", "approved");
    const tiers = new Set(((data as any[]) || []).map((r) => r.tier));
    if (tiers.has("global")) return "global";
    if (tiers.has("org")) return "org";
  } catch { /* table missing */ }
  return "personal";
}

// Slugs approved at org (for an org) or global (everywhere) — for discovery.
export async function approvedSlugs(kind: ModuleKind, opts: { orgId?: string | null }): Promise<{ org: Set<string>; global: Set<string> }> {
  const org = new Set<string>(), global = new Set<string>();
  try {
    const { data } = await createAdminClient().from("module_promotions").select("slug, tier, org_id, status").eq("kind", kind).eq("status", "approved");
    for (const r of ((data as any[]) || [])) {
      if (r.tier === "global") global.add(r.slug);
      else if (r.tier === "org" && opts.orgId && r.org_id === opts.orgId) org.add(r.slug);
    }
  } catch { /* table missing */ }
  return { org, global };
}
