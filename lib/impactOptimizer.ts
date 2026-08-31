// ============================================================================
// Impact Optimizer — what science is MISSING for a paper to reach a target?
//
// Score the abstract; ask the AI for concrete scientific extensions (each written
// as the abstract it would become if that work were done); score each with the
// models; rank the missing pieces by predicted gain; synthesize a research
// roadmap. The models are the oracle — this measures which missing science moves
// the target, rather than guessing. Server-only.
// ============================================================================

import { scoreAbstract, scoreAbstractDimension, searchPapers } from "./scientifiq";
import { scoreText } from "./sciscore";
import { proposeExtensionsAI, critiqueChainAI } from "./ai";

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
// (its trade-off signature — what else it lifts or costs).
export type Bet = { id: number; headline: string; finalScore: number; gain: number; steps: Step[]; signature: Fingerprint };
export type OptimizeResult = {
  target: Target; goal: number; baseline: Fingerprint; bets: Bet[];
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
const MAX_ROUNDS = 3;
const K = 3;            // proposals per beam per round
const BEAM_WIDE = 4;    // diverse chains carried forward each round
const PORTFOLIO_N = 3;  // distinct bets returned
const EPSILON = 2;
const CEILING = 92;
const LAMBDA = 0.55;    // diversity weight in MMR (0 = pure reward, 1 = pure novelty)

type SearchStep = { gap: string; abstract: string };
type Cand = { chain: SearchStep[]; abstract: string; tScore: number; tokens: Set<string> };

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
// remaining candidate maximizes reward − LAMBDA·(max similarity to those chosen).
function mmrSelect(cands: Cand[], n: number): Cand[] {
  const pool = [...cands].sort((a, b) => b.tScore - a.tScore);
  if (pool.length <= n) return pool;
  const selected: Cand[] = [pool.shift()!];
  while (selected.length < n && pool.length) {
    let bi = 0, bv = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      let maxSim = 0;
      for (const s of selected) maxSim = Math.max(maxSim, jaccard(pool[i].tokens, s.tokens));
      const val = pool[i].tScore / 100 - LAMBDA * maxSim;
      if (val > bv) { bv = val; bi = i; }
    }
    selected.push(pool.splice(bi, 1)[0]);
  }
  return selected;
}

export async function optimizeImpact(abstract: string, target: Target, opts: { includeDefense?: boolean; targetLevel?: number } = {}): Promise<OptimizeResult> {
  const includeDefense = !!opts.includeDefense;
  const baseTarget = Math.max(0, await scoreTarget(abstract, target));
  // Decision-Transformer framing: set a return-to-go goal and generate the path to
  // it. Default to an ambitious-but-credible stretch above the baseline.
  const goal = Math.max(baseTarget + 5, Math.min(CEILING, Math.round(opts.targetLevel ?? Math.min(90, baseTarget + 25))));
  let beams: Cand[] = [{ chain: [], abstract, tScore: baseTarget, tokens: new Set() }];
  let bestSoFar = baseTarget;
  let stop: OptimizeResult["stop"] = "maxRounds";

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const expansions: Cand[] = [];
    for (const beam of beams) {
      const gen = await proposeExtensionsAI(beam.abstract, target, K, { current: Math.round(beam.tScore), target: goal });
      const cands: { gap: string; abstract: string }[] = Array.isArray(gen?.extensions) ? gen.extensions.slice(0, K) : [];
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
    beams = mmrSelect(uniq, BEAM_WIDE);
    bestSoFar = best;
    if (best >= goal) { stop = "reached"; break; }
    if (best >= CEILING) { stop = "ceiling"; break; }
  }

  const baseline = await fingerprint(abstract, includeDefense);

  // Choose the portfolio: the top performer plus the most distinct alternatives.
  const finalists = mmrSelect(beams.filter((b) => b.chain.length > 0), PORTFOLIO_N);

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

  return { target, goal, baseline, bets, stop };
}
