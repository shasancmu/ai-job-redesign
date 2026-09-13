// Store + schema for authored analytical instruments (X-ray style): decompose a
// subject into units and score each against author-defined levels, then
// aggregate. Runtime is a single structured AI call; scoring is deterministic
// from the level values.
import { makeSpecLoader, makeCatalogLister } from "@/lib/mechanics/specStore";

export type Level = { key: string; label: string; desc: string; value: number }; // value 0-100
export type AnalyticalSpec = {
  slug: string; name: string; emoji?: string;
  subject: string; // what gets decomposed, e.g. "a job", "a strategy document"
  setupLabel: string; setupPlaceholder: string;
  unitLabel: string; // e.g. "task", "claim", "assumption"
  decompose: string; // how to break the subject into units
  lens?: string; // the framework/rubric the AI applies when scoring
  levels: Level[]; // the ordered scoring scale
  aggregateLabel: string; // e.g. "Overall AI exposure"
};

export const getAnalyticalSpec = makeSpecLoader<AnalyticalSpec>("analytical_specs");

export function publicAnalyticalSpec(s: AnalyticalSpec): any {
  // No hidden state here; the whole spec is learner-safe (levels are the shown scale).
  return { slug: s.slug, name: s.name, emoji: s.emoji, subject: s.subject, setupLabel: s.setupLabel, setupPlaceholder: s.setupPlaceholder, unitLabel: s.unitLabel, aggregateLabel: s.aggregateLabel, levels: s.levels.map((l) => ({ key: l.key, label: l.label, desc: l.desc, value: l.value })) };
}

export type AnalyticalCatalogEntry = { slug: string; name: string; emoji: string };
export const listAnalyticalCatalog = makeCatalogLister<AnalyticalCatalogEntry>(
  "analytical_specs",
  (r) => ({ slug: r.slug, name: r.spec?.name || r.slug, emoji: r.spec?.emoji || "📊" }),
);

export function validateAnalyticalSpec(s: any): string[] {
  const e: string[] = [];
  if (!s || typeof s !== "object") return ["Not a valid instrument."];
  if (!s.slug || !/^[a-z0-9-]+$/.test(s.slug)) e.push("Give it a lowercase-with-dashes slug.");
  if (!s.name || s.name.length < 3) e.push("Give it a name.");
  if (!s.subject) e.push("Say what gets analyzed (the subject).");
  if (!s.unitLabel) e.push("Name the unit (e.g. task, claim).");
  if (!s.decompose || s.decompose.length < 10) e.push("Say how to break the subject into units.");
  const levels = Array.isArray(s.levels) ? s.levels : [];
  if (levels.length < 2) e.push("Add at least 2 scoring levels.");
  levels.forEach((l: any, i: number) => { if (!l.key || !l.label) e.push(`Level ${i + 1} needs a key and a label.`); if (typeof l.value !== "number") e.push(`Level ${i + 1} needs a numeric value (0-100).`); });
  const keys = levels.map((l: any) => l.key);
  if (new Set(keys).size !== keys.length) e.push("Level keys must be unique.");
  return e;
}
