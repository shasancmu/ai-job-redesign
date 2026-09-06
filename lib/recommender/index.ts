// ============================================================================
// The recommender. Posterior = AI prior α (lib/recommender/prior) + observed
// transition counts, Thompson-sampled for exploration, then masked (already
// done / self) and returned best-first. The learned matrix is computed from the
// session log at read time (decayed by recency), so there is no separate write
// path and it is live the moment people use the platform — while the prior
// carries every module that has no data yet, including brand-new ones.
// ============================================================================
import { MODULES, catalogRank, type IntentKey } from "@/lib/modules";
import { priorAlpha, entryPrior } from "@/lib/recommender/prior";

// exercise → canonical slug (the lowest-catalog-rank visible module for that
// engine), so session rows (which carry `exercise`, not slug) count at slug
// granularity. Shared engines (e.g. résumé/résumé-voice) collapse to one slug.
const EX_TO_SLUG: Record<string, string> = (() => {
  const best: Record<string, { slug: string; rank: number }> = {};
  for (const m of MODULES) {
    if (m.hidden) continue;
    const r = catalogRank(m.slug);
    if (!best[m.exercise] || r < best[m.exercise].rank) best[m.exercise] = { slug: m.slug, rank: r };
  }
  const out: Record<string, string> = {};
  for (const [ex, v] of Object.entries(best)) out[ex] = v.slug;
  return out;
})();

export type TransitionCounts = Map<string, Map<string, number>>;
export type RecommenderData = {
  transitions: TransitionCounts;         // decayed learned counts: src slug → dst slug → weight
  runsThisWeek: Record<string, number>;  // per slug, last 7 days — for the "popular" rail + badge
  marginal: Map<string, number>;         // decayed start counts per slug — global popularity prior
};

const HALF_LIFE_DAYS = 45; // recency half-life for decayed counts (non-stationarity)
function decay(ageDays: number): number { return Math.pow(0.5, ageDays / HALF_LIFE_DAYS); }

// One bounded read of the session log → the learned transition matrix plus the
// recency signals. A completion (status "done") records an edge from the host's
// previous completion; any start feeds popularity.
export async function recommenderData(admin: any, opts: { windowDays?: number } = {}): Promise<RecommenderData> {
  const windowDays = opts.windowDays ?? 120;
  const transitions: TransitionCounts = new Map();
  const runsThisWeek: Record<string, number> = {};
  const marginal = new Map<string, number>();
  try {
    const since = new Date(Date.now() - windowDays * 864e5).toISOString();
    const { data } = await admin
      .from("sessions")
      .select("host_id, exercise, status, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(30000);
    const rows = (data as any[]) || [];
    const now = Date.now();
    const weekAgo = now - 7 * 864e5;
    const lastDoneByHost = new Map<string, string>();
    for (const r of rows) {
      const slug = EX_TO_SLUG[r.exercise];
      if (!slug) continue;
      const t = new Date(r.created_at).getTime();
      if (t >= weekAgo) runsThisWeek[slug] = (runsThisWeek[slug] || 0) + 1;
      marginal.set(slug, (marginal.get(slug) || 0) + decay((now - t) / 864e5));
      if (r.status === "done") {
        const prev = lastDoneByHost.get(r.host_id);
        if (prev && prev !== slug) {
          const w = decay((now - t) / 864e5);
          let row = transitions.get(prev);
          if (!row) { row = new Map(); transitions.set(prev, row); }
          row.set(slug, (row.get(slug) || 0) + w);
        }
        lastDoneByHost.set(r.host_id, slug);
      }
    }
  } catch { /* no data / table issue → empty (prior-only, still useful) */ }
  return { transitions, runsThisWeek, marginal };
}

// --- seeded RNG + Gamma/Dirichlet sampling (Thompson sampling) --------------
// Sampling θ from the Dirichlet posterior (instead of taking its mean) explores
// under-observed transitions in proportion to our uncertainty — the native
// Bayesian answer to the popularity feedback loop. Seeded so a given user sees a
// stable set within a day but the mix refreshes across days and across people.
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Marsaglia–Tsang Gamma(k, 1) with a supplied uniform RNG (k > 0). A vector of
// Gamma(αⱼ) draws, ranked, is an argsort-equivalent draw from Dirichlet(α).
function sampleGamma(k: number, rng: () => number): number {
  if (k < 1) return sampleGamma(1 + k, rng) * Math.pow(Math.max(rng(), 1e-12), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0, v = 0;
    do {
      const u1 = Math.max(rng(), 1e-12), u2 = rng();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export type NextOpts = {
  lastCompleted?: string | null;   // the person's most recent finished module (the chain's state)
  completed: Set<string>;          // everything they've done, masked out of results
  world?: IntentKey | null;        // the gate's world, for cold-start scoping
  isStartable?: (slug: string) => boolean; // optional hard filter (usually omitted — locked cards still show)
  fallback?: string[];             // cold + world-unknown ordering (e.g. segment recs)
  limit?: number;
  seed?: string;                   // stabilises the Thompson draw per user per day
};

// The recommendation: build the posterior row, Thompson-sample it, mask, rank.
export function recommendNext(data: RecommenderData, opts: NextOpts): string[] {
  const limit = opts.limit ?? 8;
  const rng = mulberry32(hashSeed(opts.seed || "seed"));
  const alpha = new Map<string, number>();
  const add = (s: string, w: number) => alpha.set(s, (alpha.get(s) || 0) + w);

  if (opts.lastCompleted) {
    for (const [s, a] of priorAlpha(opts.lastCompleted)) add(s, a);
    const learned = data.transitions.get(opts.lastCompleted);
    if (learned) for (const [s, n] of learned) add(s, n);
  } else {
    // Cold start: the entry prior (world-scoped when known, else the fallback or
    // a global starter set), plus a light touch of global popularity.
    const entry = opts.world
      ? entryPrior(opts.world, 24)
      : (opts.fallback && opts.fallback.length ? opts.fallback : entryPrior(null, 24));
    entry.forEach((s, i) => add(s, Math.max(1, entry.length - i)));
    for (const [s, n] of data.marginal) add(s, Math.min(n, 3) * 0.25);
  }

  const scored: { slug: string; score: number }[] = [];
  for (const [slug, a] of alpha) {
    if (a <= 0) continue;
    if (opts.completed.has(slug)) continue;
    if (opts.lastCompleted && slug === opts.lastCompleted) continue;
    if (opts.isStartable && !opts.isStartable(slug)) continue;
    scored.push({ slug, score: sampleGamma(a, rng) });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map((s) => s.slug);
}
