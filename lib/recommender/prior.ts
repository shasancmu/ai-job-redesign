// ============================================================================
// The prior transition matrix (Dirichlet α) — the cold-start belief the AI
// ships before any behaviour is observed. Assembled from structures we already
// maintain, so it stays in sync as the catalog grows:
//   1. the within-world curriculum order (CATALOG_ORDER)  → "next in sequence"
//   2. the certificate bundles (designed paths)           → strong path edges
//   3. a few hand-authored cross-world bridges            → natural "and now…"
// Observed transitions are added on top of this and, with a modest prior mass,
// override it as evidence accrues. A newly added module inherits a sensible row
// (and incoming edges) purely from its category + any certificate it joins.
// ============================================================================
import { MODULES, CATEGORIES, moduleCategory, catalogRank, INTENTS, type CategoryKey, type IntentKey } from "@/lib/modules";
import { BUNDLES } from "@/lib/credentials";

// Total pseudo-count mass per row. Small = a handful of real transitions can
// overtake the prior; large = the AI's belief persists longer. Deliberately low.
export const PRIOR_STRENGTH = 6;

// Relative weights for each kind of prior edge (normalised into α per row).
const W_SEQ_NEXT = 3.0;    // the next module in the same world's curriculum
const W_SEQ_NEXT2 = 1.2;   // the one after that
const W_CERT_CORE = 3.0;   // the next required module in a certificate you've entered
const W_CERT_MEMBER = 1.4; // any other module in the same certificate
const W_SAME_WORLD = 0.5;  // any other module in the same world
const W_BRIDGE = 2.0;      // a hand-authored cross-world jump

// Cross-world bridges the curriculum order can't capture: the natural next move
// that lives in a different category. src -> [dst, …].
const BRIDGES: Record<string, string[]> = {
  "score-my-invention": ["licensing-brief", "deeptech-canvas"],
  "deeptech-canvas": ["find-a-cofounder", "name-your-price"],
  "good-business": ["customer-empathy", "ai-canvas"],
  "career-x-ray": ["career-roadmap", "refresh-resume"],
  "solo-ai": ["workflow-solo", "ai-canvas"],
  "understand-a-paper": ["read-the-interaction", "good-research"],
  "technology-landscape": ["deep-tech-deal-sourcing", "field-trajectory"],
  "close-the-offer": ["ask-for-a-raise", "name-your-price"],
  "regression-detective": ["identification", "regression-tables"],
};

const VISIBLE = MODULES.filter((m) => !m.hidden && m.partner !== "group");
// Each world's modules, in curriculum order.
const BY_CAT: Record<string, string[]> = {};
for (const c of CATEGORIES) {
  BY_CAT[c.key] = VISIBLE.filter((m) => moduleCategory(m.slug) === c.key)
    .map((m) => m.slug)
    .sort((a, b) => catalogRank(a) - catalogRank(b));
}

function add(m: Map<string, number>, slug: string, w: number) {
  if (!slug) return;
  m.set(slug, (m.get(slug) || 0) + w);
}

// Certificate edges from `src`: a strong pull to the next required core module,
// and a moderate pull to every other member of the same certificate.
function bundleEdges(src: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const b of BUNDLES) {
    const seq = [...b.core, ...b.electives];
    if (!seq.includes(src)) continue;
    const coreIdx = b.core.indexOf(src);
    if (coreIdx >= 0 && coreIdx + 1 < b.core.length) add(out, b.core[coreIdx + 1], W_CERT_CORE);
    for (const s of seq) if (s !== src) add(out, s, W_CERT_MEMBER);
  }
  return out;
}

// The raw (unnormalised) prior row for transitions FROM `src`.
export function priorRow(src: string): Map<string, number> {
  const row = new Map<string, number>();
  const seq = BY_CAT[moduleCategory(src)] || [];
  const i = seq.indexOf(src);
  if (i >= 0) {
    if (i + 1 < seq.length) add(row, seq[i + 1], W_SEQ_NEXT);
    if (i + 2 < seq.length) add(row, seq[i + 2], W_SEQ_NEXT2);
    for (const s of seq) if (s !== src) add(row, s, W_SAME_WORLD);
  }
  for (const [s, w] of bundleEdges(src)) add(row, s, w);
  for (const s of BRIDGES[src] || []) add(row, s, W_BRIDGE);
  row.delete(src);
  return row;
}

// The prior row normalised to PRIOR_STRENGTH, so it reads as pseudo-counts that
// can be summed directly with observed counts.
export function priorAlpha(src: string): Map<string, number> {
  const raw = priorRow(src);
  const total = [...raw.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return raw;
  const out = new Map<string, number>();
  for (const [s, w] of raw) out.set(s, (w / total) * PRIOR_STRENGTH);
  return out;
}

// π — the entry prior: what to do FIRST. Scoped to an intent/world when the gate
// tells us one, else a global starter set (the first module of each world).
const INTENT_CATS = Object.fromEntries(INTENTS.map((it) => [it.key, it.cats])) as Record<IntentKey, CategoryKey[]>;

export function entryPrior(world?: IntentKey | null, limit = 8): string[] {
  if (world && INTENT_CATS[world]) {
    const cats = INTENT_CATS[world];
    return VISIBLE.filter((m) => cats.includes(moduleCategory(m.slug)))
      .sort((a, b) => catalogRank(a.slug) - catalogRank(b.slug))
      .map((m) => m.slug)
      .slice(0, limit);
  }
  const out: string[] = [];
  for (const c of CATEGORIES) { const s = (BY_CAT[c.key] || [])[0]; if (s) out.push(s); }
  return out.slice(0, limit);
}
