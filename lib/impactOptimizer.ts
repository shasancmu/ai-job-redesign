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
export type OptimizeResult = {
  target: Target; goal: number; baseline: Fingerprint; steps: Step[];
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

// Beam self-play (tier 2): each round expand every beam with K proposals, keep the
// top BEAM chains by target score — so a modest-gain step that unlocks a big
// follow-on isn't pruned greedily. Search uses only the cheap target score; the
// winning chain is then richly annotated: every step fingerprinted on all
// dimensions (trade-offs), grounded in real literature (precedent), and reviewed
// by a skeptical critic (tier 3, gaming check). Stops on diminishing returns,
// a ceiling, or a round cap.
const MAX_ROUNDS = 3;
const K = 3;
const BEAM = 2;
const EPSILON = 2;
const CEILING = 92;

type SearchStep = { gap: string; abstract: string };
type BeamState = { abstract: string; tScore: number; chain: SearchStep[] };

export async function optimizeImpact(abstract: string, target: Target, opts: { includeDefense?: boolean; targetLevel?: number } = {}): Promise<OptimizeResult> {
  const includeDefense = !!opts.includeDefense;
  const baseTarget = Math.max(0, await scoreTarget(abstract, target));
  // Decision-Transformer framing: set a return-to-go goal and generate the path to
  // it. Default to an ambitious-but-credible stretch above the baseline.
  const goal = Math.max(baseTarget + 5, Math.min(CEILING, Math.round(opts.targetLevel ?? Math.min(90, baseTarget + 25))));
  let beams: BeamState[] = [{ abstract, tScore: baseTarget, chain: [] }];
  let bestSoFar = baseTarget;
  let stop: OptimizeResult["stop"] = "maxRounds";

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const expansions: { parent: BeamState; gap: string; abstract: string; score: number }[] = [];
    for (const beam of beams) {
      const gen = await proposeExtensionsAI(beam.abstract, target, K, { current: Math.round(beam.tScore), target: goal });
      const cands: { gap: string; abstract: string }[] = Array.isArray(gen?.extensions) ? gen.extensions.slice(0, K) : [];
      const scored = await mapLimited(cands, 3, async (e) => ({
        gap: String(e?.gap || "").slice(0, 300),
        abstract: String(e?.abstract || ""),
        score: e?.abstract && e.abstract.length >= 60 ? await scoreTarget(e.abstract, target) : -1,
      }));
      for (const s of scored) if (s.score >= 0) expansions.push({ parent: beam, gap: s.gap, abstract: s.abstract, score: s.score });
    }
    if (!expansions.length) { stop = "no-improvement"; break; }
    expansions.sort((a, b) => b.score - a.score);
    // keep the top BEAM, deduped by abstract
    const top: typeof expansions = [];
    const seen = new Set<string>();
    for (const e of expansions) { const k = e.abstract.slice(0, 200); if (seen.has(k)) continue; seen.add(k); top.push(e); if (top.length >= BEAM) break; }
    if (top[0].score - bestSoFar < EPSILON) { stop = "plateau"; break; }
    bestSoFar = Math.max(bestSoFar, top[0].score);
    beams = top.map((e) => ({ abstract: e.abstract, tScore: e.score, chain: [...e.parent.chain, { gap: e.gap, abstract: e.abstract }] }));
    if (top[0].score >= goal) { stop = "reached"; break; } // return-to-go closed
    if (top[0].score >= CEILING) { stop = "ceiling"; break; }
  }

  const bestBeam = beams.reduce((a, b) => (b.tScore > a.tScore ? b : a));
  const chain = bestBeam.chain;

  // Annotate the winning chain: baseline + per-step fingerprint, literature
  // precedent, and the skeptical critic's verdict.
  const baseline = await fingerprint(abstract, includeDefense);
  const critique = chain.length ? await critiqueChainAI({ original: abstract, target, gaps: chain.map((c) => c.gap) }).catch(() => null) : null;
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

  return { target, goal, baseline, steps, stop };
}
