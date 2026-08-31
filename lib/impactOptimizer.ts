// ============================================================================
// Impact Optimizer — what science is MISSING for a paper to reach a target?
//
// Score the abstract; ask the AI for concrete scientific extensions (each written
// as the abstract it would become if that work were done); score each with the
// models; rank the missing pieces by predicted gain; synthesize a research
// roadmap. The models are the oracle — this measures which missing science moves
// the target, rather than guessing. Server-only.
// ============================================================================

import { scoreAbstract, scoreAbstractDimension, searchPapers, type SciPaper } from "./scientifiq";
import { scoreText, scoreTextBatch } from "./sciscore";
import { proposeExtensionsAI, critiqueChainAI, groundLeversAI } from "./ai";

export const OPTIMIZE_TARGETS = ["commercial", "scientific", "social", "complex_invention", "interdisciplinary", "defense"] as const;
export type Target = (typeof OPTIMIZE_TARGETS)[number];

const SCISCORE_TASK: Record<string, string> = { defense: "defense_impact", complex_invention: "complex_invention", interdisciplinary: "interdisciplinary" };

// One API call per score, and never throws — a flaky variant scores -1 rather
// than sinking the whole run.
async function scoreTarget(abstract: string, target: Target): Promise<number> {
  try {
    if (SCISCORE_TASK[target]) {
      const s = await scoreText(SCISCORE_TASK[target], abstract);
      return s ? Math.round(s.score * 100) : -1;
    }
    const p = await scoreAbstractDimension(abstract, target as "commercial" | "scientific" | "social");
    return Math.round((p?.raw ?? 0) * 100);
  } catch {
    return -1;
  }
}

// Run scorers with a small concurrency cap so we don't burst the Scientifiq API.
async function mapLimited<T, R>(items: T[], concurrency: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    out.push(...(await Promise.all(items.slice(i, i + concurrency).map(fn))));
  }
  return out;
}

export type Fingerprint = Record<string, number>; // dim -> 0..100 (defense only for directors)
export type Precedent = { title: string; year?: number };
export type Step = { round: number; gap: string; abstract: string; gain: number; fingerprint: Fingerprint; legit?: boolean; concern?: string; precedent?: Precedent[] };
// A Bet is one distinct research path to the goal: its defining move, the sequence
// of missing science, the final target score, and its net effect on EVERY potential
// (its trade-off signature — what else it lifts or costs). `grounded` lists the
// observed twin levers this bet's moves actually match.
export type Bet = { id: number; headline: string; finalScore: number; gain: number; steps: Step[]; signature: Fingerprint; grounded?: string[] };
// Twin grounding (AlphaFold-style): the paper's real semantic neighborhood, split by
// outcome, and the factors that empirically separate the high-outcome twins.
export type Twin = { title: string; year?: number; score: number };
export type Lever = { term: string; lift: number; examples: string[] };
export type Grounding = { target: Target; n: number; highMean: number; lowMean: number; levers: Lever[]; synthesis: { name: string; why: string }[]; topTwins: Twin[] };
// AlphaZero value-to-go: the reachable ceiling for the pasted abstract (present only
// when a value_to_go_<target> model is deployed).
export type Headroom = { current: number; ceiling: number };
export type OptimizeResult = {
  target: Target; goal: number; baseline: Fingerprint; bets: Bet[]; grounding?: Grounding | null; headroom?: Headroom | null;
  stop: "reached" | "plateau" | "ceiling" | "maxRounds" | "no-improvement";
};

// Score an abstract on EVERY potential (the full fingerprint) so we can track
// whether optimizing the target drags the others down. Scoring is free (models,
// not LLM tokens); resilient per dimension.
async function fingerprint(abstract: string, includeDefense: boolean): Promise<Fingerprint> {
  const [base, cplx, intd, def] = await Promise.all([
    scoreAbstract(abstract).catch(() => null),
    scoreText("complex_invention", abstract).catch(() => null),
    scoreText("interdisciplinary", abstract).catch(() => null),
    includeDefense ? scoreText("defense_impact", abstract).catch(() => null) : Promise.resolve(null),
  ]);
  const fp: Fingerprint = {};
  if (base) { fp.commercial = Math.round(((base as any).commercial?.raw ?? 0) * 100); fp.scientific = Math.round(((base as any).scientific?.raw ?? 0) * 100); fp.social = Math.round(((base as any).social?.raw ?? 0) * 100); }
  if (cplx) fp.complex_invention = Math.round(cplx.score * 100);
  if (intd) fp.interdisciplinary = Math.round(intd.score * 100);
  if (includeDefense && def) fp.defense = Math.round(def.score * 100);
  return fp;
}

// GFlowNet-style portfolio over a Decision-Transformer-conditioned search.
//
// Each round, expand every beam with K return-to-go-conditioned proposals and score
// them (cheap target score only). Then, instead of collapsing to the top-scoring
// chains, carry forward a WIDE, DIVERSE frontier: MMR selection trades reward off
// against distance from the already-chosen paths, so the search doesn't mode-collapse
// onto one high-scoring template (the "everything clusters at 90" failure). Diversity
// is measured for free — lexical distance over the gap descriptions — no embedding
// call. At the end we return a PORTFOLIO of distinct research bets (top performer
// always included, the rest chosen for diversity), each richly annotated: every step
// fingerprinted on all dimensions (trade-off signature), grounded in real literature
// (precedent), and reviewed by a skeptical critic (gaming check).
// Defaults for the user-tunable controls; frontier width derives from `bets`.
const MAX_ROUNDS = 3;   // default search depth
const K = 3;            // proposals per beam per round (fixed)
const PORTFOLIO_N = 3;  // default distinct bets returned
const EPSILON = 2;      // plateau threshold (fixed)
const CEILING = 92;     // model practical ceiling (fixed)
const LAMBDA = 0.55;    // default diversity weight in MMR (0 = pure reward, 1 = pure novelty)

type SearchStep = { gap: string; abstract: string };
// tScore = actual current target score (drives goal/stop logic). rank = the score
// used to CHOOSE which expansions to keep — the value-to-go-blended score when a
// value model is deployed, else just tScore.
type Cand = { chain: SearchStep[]; abstract: string; tScore: number; rank?: number; tokens: Set<string> };

// AlphaZero value-to-go: batch-score the reachable ceiling for many abstracts in one
// request. Returns null per item when no value_to_go_<target> model is deployed, so
// the optimizer silently falls back to current-score ranking.
const VALUE_WEIGHT = 0.65; // how much reachable-ceiling outweighs present score in ranking
async function valueGuide(abstracts: string[], target: Target): Promise<(number | null)[]> {
  if (!abstracts.length) return [];
  try {
    const res = await scoreTextBatch(`value_to_go_${target}`, abstracts);
    return res.map((r) => (r ? Math.round(r.score * 100) : null));
  } catch {
    return abstracts.map(() => null);
  }
}

const STOP_WORDS = new Set(("the and for with that this from have been were which their into more than then them your also such using used based show shows able many both each other over under most some less will would could here does about across while when where these those into onto within toward high higher raise raising improve improving increase increasing add adding new work study paper method approach result results data model models").split(/\s+/));
function contentTokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const m of s.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) if (!STOP_WORDS.has(m)) out.add(m);
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
// Maximal Marginal Relevance: top reward first, then greedily add whichever
// remaining candidate maximizes reward − lambda·(max similarity to those chosen).
function mmrSelect(cands: Cand[], n: number, lambda: number): Cand[] {
  const reward = (c: Cand) => (c.rank ?? c.tScore) / 100; // value-to-go-blended when present
  const pool = [...cands].sort((a, b) => reward(b) - reward(a));
  if (pool.length <= n) return pool;
  const selected: Cand[] = [pool.shift()!];
  while (selected.length < n && pool.length) {
    let bi = 0, bv = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      let maxSim = 0;
      for (const s of selected) maxSim = Math.max(maxSim, jaccard(pool[i].tokens, s.tokens));
      const val = reward(pool[i]) - lambda * maxSim;
      if (val > bv) { bv = val; bi = i; }
    }
    selected.push(pool.splice(bi, 1)[0]);
  }
  return selected;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---- Twin grounding (AlphaFold-style co-variation) -------------------------
// Retrieve the abstract's real semantic twins, split them by outcome, and read off
// the factors that empirically separate the high-outcome group — evidence from
// matched real papers, not model speculation. Native scores (compot/scipot/socpot)
// come free on each paper; the other targets score a bounded sample.
const NATIVE_FIELD: Partial<Record<Target, "compot" | "scipot" | "socpot">> = { commercial: "compot", scientific: "scipot", social: "socpot" };

const normPct = (v: any): number => { const n = Number(v); if (!Number.isFinite(n)) return -1; return n <= 1 ? Math.round(n * 100) : Math.round(n); };
const avg = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
function twinTerms(p: SciPaper): string[] {
  const terms: string[] = [];
  for (const kw of p.keywords || []) { const t = kw.toLowerCase().trim(); if (t.length >= 4) terms.push(t); }
  for (const t of contentTokens(p.title || "")) terms.push(t);
  return terms;
}
const kwString = (p: SciPaper): string => (p.keywords?.length ? p.keywords.slice(0, 8).join(", ") : (p.subfields || []).slice(0, 4).join(", "));

// Terms over-represented in the high-outcome group vs the low — the observed levers.
function enrichedLevers(high: { p: SciPaper }[], low: { p: SciPaper }[]): Lever[] {
  const hi = new Map<string, { df: number; ex: string[] }>();
  const lo = new Map<string, number>();
  for (const x of high) for (const t of new Set(twinTerms(x.p))) { const e = hi.get(t) || { df: 0, ex: [] }; e.df++; if (e.ex.length < 2) e.ex.push(x.p.title); hi.set(t, e); }
  for (const x of low) for (const t of new Set(twinTerms(x.p))) lo.set(t, (lo.get(t) || 0) + 1);
  const H = high.length || 1, L = low.length || 1;
  const out: Lever[] = [];
  for (const [t, e] of hi) {
    const lift = e.df / H - (lo.get(t) || 0) / L;
    if (e.df >= 2 && lift >= 0.25) out.push({ term: t, lift: Math.round(lift * 100) / 100, examples: e.ex });
  }
  return out.sort((a, b) => b.lift - a.lift).slice(0, 6);
}

async function twinGrounding(abstract: string, target: Target, includeDefense: boolean): Promise<Grounding | null> {
  try {
    const res = await searchPapers({ search: abstract.slice(0, 2000), limit: 24 });
    const twins = (res.papers || []).filter((p) => p && p.title);
    if (twins.length < 8) return null;

    const field = NATIVE_FIELD[target];
    let scored: { p: SciPaper; score: number }[];
    if (field) {
      scored = twins.map((p) => ({ p, score: normPct((p as any)[field]) })).filter((x) => x.score >= 0);
    } else if (target === "defense" && !includeDefense) {
      return null; // no permission to score this dimension
    } else {
      const task = SCISCORE_TASK[target];
      const sub = twins.slice(0, 14); // bound the scoring cost for non-native targets
      const vals = await mapLimited(sub, 3, async (p) => {
        const text = p.abstract && p.abstract.length > 60 ? p.abstract : p.title;
        try { const s = await scoreText(task, text); return s ? Math.round(s.score * 100) : -1; } catch { return -1; }
      });
      scored = sub.map((p, i) => ({ p, score: vals[i] })).filter((x) => x.score >= 0);
    }
    if (scored.length < 8) return null;

    scored.sort((a, b) => b.score - a.score);
    const k = Math.max(3, Math.floor(scored.length / 3));
    const high = scored.slice(0, k);
    const low = scored.slice(-k);
    const levers = enrichedLevers(high, low);

    const synth = await groundLeversAI({
      target,
      high: high.map((x) => ({ title: x.p.title, keywords: kwString(x.p) })),
      low: low.map((x) => ({ title: x.p.title, keywords: kwString(x.p) })),
    }).catch(() => null);
    const synthesis = Array.isArray(synth?.levers)
      ? synth.levers.slice(0, 4).map((l: any) => ({ name: String(l?.name || "").slice(0, 80), why: String(l?.why || "").slice(0, 200) })).filter((l: any) => l.name)
      : [];

    return {
      target, n: scored.length,
      highMean: Math.round(avg(high.map((x) => x.score))),
      lowMean: Math.round(avg(low.map((x) => x.score))),
      levers, synthesis,
      topTwins: high.slice(0, 5).map((x) => ({ title: x.p.title, year: x.p.year, score: x.score })),
    };
  } catch { return null; }
}

// Which observed twin levers does a bet's science actually match? (lexical)
function betGrounding(bet: Bet, levers: Lever[]): string[] {
  const hay = (bet.headline + " " + bet.steps.map((s) => s.gap).join(" ")).toLowerCase();
  const hits: string[] = [];
  for (const lv of levers) if (lv.term.length >= 4 && hay.includes(lv.term) && !hits.includes(lv.term)) hits.push(lv.term);
  return hits.slice(0, 3);
}

// User-tunable search controls (all optional; defaults above). rounds = search depth
// (compounding steps), bets = distinct paths returned, diversity = MMR lambda
// (0 = chase the single best, 1 = maximize distinctness). Frontier width is derived
// so it always has headroom to pick a diverse portfolio from.
export type SearchControls = { includeDefense?: boolean; targetLevel?: number; rounds?: number; bets?: number; diversity?: number };

export async function optimizeImpact(abstract: string, target: Target, opts: SearchControls = {}): Promise<OptimizeResult> {
  const includeDefense = !!opts.includeDefense;
  const rounds = clamp(Math.round(opts.rounds ?? MAX_ROUNDS), 1, 4);
  const portfolioN = clamp(Math.round(opts.bets ?? PORTFOLIO_N), 1, 5);
  const lambda = clamp(opts.diversity ?? LAMBDA, 0, 1);
  const beamWide = clamp(portfolioN + 1, 3, 6);
  const baseTarget = Math.max(0, await scoreTarget(abstract, target));
  // Decision-Transformer framing: set a return-to-go goal and generate the path to
  // it. Default to an ambitious-but-credible stretch above the baseline.
  const goal = Math.max(baseTarget + 5, Math.min(CEILING, Math.round(opts.targetLevel ?? Math.min(90, baseTarget + 25))));
  // Value-to-go headroom for the pasted abstract (null unless the value model is live).
  const rootV = (await valueGuide([abstract], target))[0];
  const headroom: Headroom | null = rootV != null ? { current: baseTarget, ceiling: Math.max(rootV, baseTarget) } : null;
  let beams: Cand[] = [{ chain: [], abstract, tScore: baseTarget, tokens: new Set() }];
  let bestSoFar = baseTarget;
  let stop: OptimizeResult["stop"] = "maxRounds";

  for (let round = 1; round <= rounds; round++) {
    const expansions: Cand[] = [];
    for (const beam of beams) {
      const gen = await proposeExtensionsAI(beam.abstract, target, K, { current: Math.round(beam.tScore), target: goal }).catch(() => null);
      const cands: { gap: string; abstract: string }[] = Array.isArray((gen as any)?.extensions) ? (gen as any).extensions.slice(0, K) : [];
      const scored = await mapLimited(cands, 3, async (e) => ({
        gap: String(e?.gap || "").slice(0, 300),
        abstract: String(e?.abstract || ""),
        score: e?.abstract && e.abstract.length >= 60 ? await scoreTarget(e.abstract, target) : -1,
      }));
      for (const s of scored) {
        if (s.score < 0) continue;
        const chain = [...beam.chain, { gap: s.gap, abstract: s.abstract }];
        expansions.push({ chain, abstract: s.abstract, tScore: s.score, tokens: contentTokens(chain.map((c) => c.gap).join(" ")) });
      }
    }
    if (!expansions.length) { stop = round === 1 ? "no-improvement" : "maxRounds"; break; }
    // dedup near-identical abstracts, then carry a wide DIVERSE frontier
    const seen = new Set<string>();
    const uniq = expansions.filter((e) => { const k = e.abstract.slice(0, 200); if (seen.has(k)) return false; seen.add(k); return true; });
    const best = Math.max(...uniq.map((e) => e.tScore));
    if (best - bestSoFar < EPSILON) { stop = "plateau"; break; } // frontier stalled
    // Value-to-go guidance: keep expansions by reachable ceiling, not just present
    // score, so a low-now/high-ceiling path survives. No-op until the model is live.
    const vs = await valueGuide(uniq.map((e) => e.abstract), target);
    if (vs.some((v) => v != null)) uniq.forEach((e, i) => { e.rank = vs[i] != null ? Math.round((1 - VALUE_WEIGHT) * e.tScore + VALUE_WEIGHT * (vs[i] as number)) : e.tScore; });
    beams = mmrSelect(uniq, beamWide, lambda);
    bestSoFar = best;
    if (best >= goal) { stop = "reached"; break; }
    if (best >= CEILING) { stop = "ceiling"; break; }
  }

  const baseline = await fingerprint(abstract, includeDefense);

  // Twin grounding runs concurrently with bet annotation (both are API-bound).
  const groundingP = twinGrounding(abstract, target, includeDefense).catch(() => null);

  // Choose the portfolio: the top performer plus the most distinct alternatives.
  const finalists = mmrSelect(beams.filter((b) => b.chain.length > 0), portfolioN, lambda);

  // Annotate each bet (sequential across bets to bound API burst; cheap scoring
  // inside each step runs concurrently).
  const bets: Bet[] = [];
  let id = 1;
  for (const f of finalists) {
    const chain = f.chain;
    const critique = await critiqueChainAI({ original: abstract, target, gaps: chain.map((c) => c.gap) }).catch(() => null);
    const verdicts: any[] = Array.isArray(critique?.verdicts) ? critique.verdicts : [];
    const steps: Step[] = [];
    let prev = baseline[target] ?? baseTarget;
    for (let i = 0; i < chain.length; i++) {
      const c = chain[i];
      const [fp, precedent] = await Promise.all([
        fingerprint(c.abstract, includeDefense),
        searchPapers({ search: c.gap, order: "commPot", limit: 3 }).then((r) => (r.papers || []).slice(0, 3).map((p) => ({ title: p.title, year: p.year }))).catch(() => [] as Precedent[]),
      ]);
      const tScore = fp[target] ?? 0;
      steps.push({ round: i + 1, gap: c.gap, abstract: c.abstract, gain: tScore - prev, fingerprint: fp, legit: verdicts[i]?.legit !== false, concern: verdicts[i]?.concern || "", precedent });
      prev = tScore;
    }
    const finalFp = steps.length ? steps[steps.length - 1].fingerprint : baseline;
    const finalScore = finalFp[target] ?? baseTarget;
    const signature: Fingerprint = {};
    for (const d of Object.keys(baseline)) signature[d] = (finalFp[d] ?? baseline[d]) - baseline[d];
    const headline = steps.length ? steps.reduce((a, b) => (b.gain > a.gain ? b : a)).gap : "";
    bets.push({ id: id++, headline, finalScore, gain: finalScore - baseTarget, steps, signature });
  }
  bets.sort((a, b) => b.finalScore - a.finalScore);

  // Ground each bet: which of the observed high-outcome twin levers its moves match.
  const grounding = await groundingP;
  if (grounding?.levers?.length) for (const b of bets) b.grounded = betGrounding(b, grounding.levers);

  return { target, goal, baseline, bets, stop, grounding, headroom };
}
