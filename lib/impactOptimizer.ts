// ============================================================================
// Impact Optimizer — what science is MISSING for a paper to reach a target?
//
// Score the abstract; ask the AI for concrete scientific extensions (each written
// as the abstract it would become if that work were done); score each with the
// models; rank the missing pieces by predicted gain; synthesize a research
// roadmap. The models are the oracle — this measures which missing science moves
// the target, rather than guessing. Server-only.
// ============================================================================

import { scoreAbstract, scoreAbstractDimension } from "./scientifiq";
import { scoreText } from "./sciscore";
import { proposeExtensionsAI } from "./ai";

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
export type Step = { round: number; gap: string; abstract: string; gain: number; fingerprint: Fingerprint };
export type OptimizeResult = {
  target: Target; baseline: Fingerprint; steps: Step[];
  stop: "plateau" | "ceiling" | "maxRounds" | "no-improvement";
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

// Iterative, compounding self-play: each round the AI proposes K next scientific
// steps that build ON the current best; the (free) model-scorer picks the winner
// on the TARGET; we fingerprint the winner on all dimensions, compound, and repeat.
// Stops on diminishing returns, a ceiling, or a round cap. LLM cost is bounded to
// ~one generation call per round.
const MAX_ROUNDS = 4;
const K = 3;
const EPSILON = 2;
const CEILING = 92;

export async function optimizeImpact(abstract: string, target: Target, opts: { includeDefense?: boolean } = {}): Promise<OptimizeResult> {
  const includeDefense = !!opts.includeDefense;
  const baseline = await fingerprint(abstract, includeDefense);
  let current = abstract;
  let prev = baseline[target] ?? 0;
  const steps: Step[] = [];
  let stop: OptimizeResult["stop"] = "maxRounds";

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const gen = await proposeExtensionsAI(current, target, K);
    const cands: { gap: string; abstract: string }[] = Array.isArray(gen?.extensions) ? gen.extensions.slice(0, K) : [];
    const scored = await mapLimited(cands, 3, async (e) => ({
      gap: String(e?.gap || "").slice(0, 300),
      abstract: String(e?.abstract || ""),
      score: e?.abstract && e.abstract.length >= 60 ? await scoreTarget(e.abstract, target) : -1,
    }));
    const valid = scored.filter((e) => e.score >= 0);
    if (!valid.length) { stop = "no-improvement"; break; }
    const best = valid.reduce((a, b) => (b.score > a.score ? b : a));
    if (best.score - prev < EPSILON) { stop = "plateau"; break; } // diminishing returns
    const fp = await fingerprint(best.abstract, includeDefense);
    const tScore = fp[target] ?? best.score;
    steps.push({ round, gap: best.gap, abstract: best.abstract, gain: tScore - prev, fingerprint: fp });
    current = best.abstract;
    prev = tScore;
    if (tScore >= CEILING) { stop = "ceiling"; break; }
  }

  return { target, baseline, steps, stop };
}
