// ============================================================================
// Impact Optimizer — what science is MISSING for a paper to reach a target?
//
// Score the abstract; ask the AI for concrete scientific extensions (each written
// as the abstract it would become if that work were done); score each with the
// models; rank the missing pieces by predicted gain; synthesize a research
// roadmap. The models are the oracle — this measures which missing science moves
// the target, rather than guessing. Server-only.
// ============================================================================

import { scoreAbstractDimension } from "./scientifiq";
import { scoreText } from "./sciscore";
import { proposeExtensionsAI, researchRoadmapAI } from "./ai";

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

export type Extension = { gap: string; abstract: string; score: number; delta: number };
export type OptimizeResult = { target: Target; baseline: number; extensions: Extension[]; roadmap: any };

export async function optimizeImpact(abstract: string, target: Target, n = 5): Promise<OptimizeResult> {
  const baseline = await scoreTarget(abstract, target);

  const gen = await proposeExtensionsAI(abstract, target, n);
  const proposed: { gap: string; abstract: string }[] = Array.isArray(gen?.extensions) ? gen.extensions.slice(0, n) : [];

  const scored = await mapLimited(proposed, 3, async (e) => {
    const score = e?.abstract && e.abstract.length >= 60 ? await scoreTarget(e.abstract, target) : -1;
    return { gap: String(e?.gap || "").slice(0, 300), abstract: String(e?.abstract || ""), score, delta: score >= 0 ? score - Math.max(0, baseline) : 0 };
  });
  const extensions = scored.filter((e) => e.score >= 0).sort((a, b) => b.delta - a.delta);

  const roadmap = extensions.length
    ? await researchRoadmapAI({ abstract, target, baseline, ranked: extensions.map((e) => ({ gap: e.gap, score: e.score, delta: e.delta })) })
    : null;

  return { target, baseline, extensions, roadmap };
}
