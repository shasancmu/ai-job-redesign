// ============================================================================
// Career Roadmap — match a person to their current O*NET occupation, surface
// skill-adjacent next steps (the precomputed hybrid neighbors), and compute the
// skill gaps + radar for a chosen target. The AI (careerRoadmapAI) adds the
// narrative; the numbers here stay deterministic and grounded in O*NET.
// ============================================================================
import { SKILLS, OCC_SKILLS, NEIGHBORS, type OccSkill } from "@/lib/onetSkills";

export const CAREER_ROADMAP_STEPS = [
  { key: "input", index: 0, title: "Your starting point", minutes: 3 },
  { key: "interview", index: 1, title: "A few quick questions", minutes: 5 },
  { key: "roadmap", index: 2, title: "Your roadmap", minutes: 6 },
];

const NAME_TO_IDX: Record<string, number> = Object.fromEntries(
  SKILLS.map((s, i) => [s.name.toLowerCase(), i])
);

// ---- occupation matching over the full O*NET title universe -----------------
const STOP = new Set(["and", "or", "of", "the", "a", "an", "all", "other", "for", "to", "in", "with"]);
function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

// idf over occupation titles so distinctive words ("actuary") outweigh generic
// ones ("manager"). Built once at module load.
const CODES = Object.keys(OCC_SKILLS);
const DF: Record<string, number> = {};
for (const c of CODES) {
  for (const t of new Set(tokens(OCC_SKILLS[c].title))) DF[t] = (DF[t] || 0) + 1;
}
const idf = (t: string) => Math.log((CODES.length + 1) / ((DF[t] || 0) + 1));

export type OccMatch = { code: string; title: string; zone: number | null; score: number };

export function matchOccupation(role: string, text = "", topN = 8): OccMatch[] {
  const q = new Map<string, number>();
  for (const t of tokens(role)) q.set(t, (q.get(t) || 0) + 2); // title words weigh most
  for (const t of tokens(text).slice(0, 400)) q.set(t, (q.get(t) || 0) + 0.4);
  const scored = CODES.map((code) => {
    const tt = new Set(tokens(OCC_SKILLS[code].title));
    let score = 0;
    for (const t of tt) if (q.has(t)) score += idf(t) * (q.get(t) as number);
    return { code, title: OCC_SKILLS[code].title, zone: OCC_SKILLS[code].zone, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

// ---- neighbors (candidate next steps) --------------------------------------
export type Candidate = { code: string; title: string; zone: number | null; sim: number; rel: boolean };

export function candidates(code: string, limit = 12): Candidate[] {
  return (NEIGHBORS[code] || [])
    .filter((n) => OCC_SKILLS[n.code])
    .slice(0, limit)
    .map((n) => ({ code: n.code, title: OCC_SKILLS[n.code].title, zone: OCC_SKILLS[n.code].zone, sim: n.sim, rel: n.rel }));
}

// ---- person skill vector + gaps + radar ------------------------------------
// Build a 35-length level vector (0–7) from the AI's inferred per-skill levels,
// falling back to the person's current-occupation profile where unstated.
export function personVector(
  inferred: Record<string, number> | undefined,
  currentCode: string
): number[] {
  const base = OCC_SKILLS[currentCode]?.lv || SKILLS.map(() => 0);
  return SKILLS.map((s, i) => {
    const v = inferred?.[s.name] ?? inferred?.[s.name.toLowerCase()];
    return typeof v === "number" && isFinite(v) ? clamp(v, 0, 7) : base[i];
  });
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type Gap = { name: string; you: number; target: number; gap: number; importance: number };

export function gapsFor(personLv: number[], targetCode: string, topN = 6): Gap[] {
  const t = OCC_SKILLS[targetCode];
  if (!t) return [];
  return SKILLS.map((s, i) => ({
    name: s.name,
    you: Math.round(personLv[i] * 10) / 10,
    target: t.lv[i],
    gap: Math.round(Math.max(0, t.lv[i] - personLv[i]) * 10) / 10,
    importance: t.im[i],
  }))
    .sort((a, b) => b.gap * b.importance - a.gap * a.importance)
    .slice(0, topN);
}

export type RadarPoint = { skill: string; you: number; target: number };

// Top skills by the target's importance — the axes that matter for that move.
export function radarFor(personLv: number[], targetCode: string, n = 8): RadarPoint[] {
  const t = OCC_SKILLS[targetCode];
  if (!t) return [];
  return SKILLS.map((s, i) => ({ i, name: s.name, im: t.im[i] }))
    .sort((a, b) => b.im - a.im)
    .slice(0, n)
    .map(({ i, name }) => ({ skill: name, you: Math.round(personLv[i] * 10) / 10, target: t.lv[i] }));
}

export function tierOf(currentZone: number | null, targetZone: number | null, sim: number): "lateral" | "step_up" | "stretch" {
  if (sim < 0.72) return "stretch";
  if (currentZone != null && targetZone != null && targetZone > currentZone) return "step_up";
  return "lateral";
}

export function occSkill(code: string): OccSkill | undefined {
  return OCC_SKILLS[code];
}
export { SKILLS };
