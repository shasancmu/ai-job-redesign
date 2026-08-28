// One catalog of the newer authored engines' published modules, plus how to run
// each. Used to make them cohort-assignable and to resolve the hierarchical
// launch URL to the right runner. (Role-play and custom interview are handled
// separately by their own catalogs.)
import { listNegCatalog } from "@/lib/mechanics/negStore";
import { listBenchCatalog } from "@/lib/mechanics/benchStore";
import { listAnalyticalCatalog } from "@/lib/mechanics/analyticalStore";
import { listNewsCatalog } from "@/lib/mechanics/newsStore";
import { listExplainerCatalog } from "@/lib/mechanics/explainerStore";
import { listRedesignCatalog } from "@/lib/mechanics/redesignStore";

export type AuthoredModule = { slug: string; name: string; emoji: string; kind: string; prefix: string };

const DEFS: { kind: string; prefix: string; emoji: string; list: (ownerId?: string) => Promise<any[]> }[] = [
  { kind: "negotiation", prefix: "n", emoji: "🤝", list: listNegCatalog },
  { kind: "benchmark", prefix: "b", emoji: "⏱️", list: listBenchCatalog },
  { kind: "analytical", prefix: "x", emoji: "📊", list: listAnalyticalCatalog },
  { kind: "newsframe", prefix: "nf", emoji: "🗞️", list: listNewsCatalog },
  { kind: "explainer", prefix: "e", emoji: "📖", list: listExplainerCatalog },
  { kind: "redesign", prefix: "rd", emoji: "🤝", list: listRedesignCatalog },
];

// All published authored modules across the newer engines. ownerId omitted =
// everyone's published ones.
export async function listAuthoredModules(ownerId?: string): Promise<AuthoredModule[]> {
  const groups = await Promise.all(DEFS.map(async (d) => {
    try {
      const rows = await d.list(ownerId);
      return (rows || []).map((r: any) => ({ slug: String(r.slug), name: String(r.name || r.slug), emoji: r.emoji || d.emoji, kind: d.kind, prefix: d.prefix }));
    } catch { return []; }
  }));
  return groups.flat();
}

// slug -> launch href for an authored-engine module (with the cohort attached),
// or null if the slug isn't one of these engines.
export async function authoredRunHref(slug: string, cohortCode: string): Promise<string | null> {
  const all = await listAuthoredModules();
  const m = all.find((x) => x.slug === slug);
  return m ? `/${m.prefix}/${slug}?cohort=${encodeURIComponent(cohortCode)}` : null;
}
