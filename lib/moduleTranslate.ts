// Translate a whole BuilderSpec into another language. Structure, keys, enums,
// numbers, emoji and section "kind"/accent are preserved exactly; only the human-
// readable text is sent to the model (as one de-duplicated batch, so a heading like
// "The report" always translates the same way and section grouping stays intact).
import type { BuilderSpec } from "@/lib/moduleBuilder";
import { translateStringsAI } from "@/lib/ai";

// Nested objects (calculator, frontier) whose shapes we don't enumerate: translate
// string values sitting under these display-text keys, and nothing else.
const TEXT_KEYS = new Set([
  "label", "title", "note", "name", "hint", "caption", "heading", "subtitle", "placeholder", "ask",
  "xLabel", "yLabel", "axisX", "axisY", "lowLabel", "highLabel", "topLabel", "bottomLabel", "leftLabel", "rightLabel", "unitLabel", "blurb", "desc",
]);

function collectNested(o: any, out: Set<string>) {
  if (!o || typeof o !== "object") return;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && TEXT_KEYS.has(k) && v.trim()) out.add(v);
    else if (v && typeof v === "object") collectNested(v, out);
  }
}
function applyNested(o: any, map: Map<string, string>) {
  if (!o || typeof o !== "object") return;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && TEXT_KEYS.has(k) && map.has(v)) o[k] = map.get(v)!;
    else if (v && typeof v === "object") applyNested(v, map);
  }
}

// The top-level scalar text fields of a BuilderSpec.
const SCALAR_FIELDS: (keyof BuilderSpec)[] = [
  "name", "tagline", "subject", "setupTitle", "setupHint", "setupPlaceholder", "persona", "framework", "verdictLabel", "scoreLabel",
];

export async function translateSpec(spec: BuilderSpec, language: string): Promise<BuilderSpec> {
  const next: BuilderSpec = JSON.parse(JSON.stringify(spec));
  const strings = new Set<string>();
  const add = (s?: string | null) => { if (s && s.trim()) strings.add(s); };

  for (const f of SCALAR_FIELDS) add(next[f] as any);
  (next.topics || []).forEach(add);
  (next.ratings || []).forEach(add);
  for (const s of next.sections || []) { add(s.name); add(s.contains); add(s.group); add(s.leftLabel); add(s.rightLabel); }
  if (next.groupNotes) for (const [k, v] of Object.entries(next.groupNotes)) { add(k); add(v); }
  collectNested(next.calculator, strings);
  collectNested(next.frontier, strings);

  const list = [...strings];
  if (!list.length) return next;
  const translated = await translateStringsAI(list, language);
  const map = new Map<string, string>();
  list.forEach((s, i) => map.set(s, translated[i]));
  const tr = (s?: string | null) => (s && map.has(s) ? map.get(s)! : (s || undefined));

  for (const f of SCALAR_FIELDS) if (typeof next[f] === "string") (next as any)[f] = tr(next[f] as any);
  if (next.topics) next.topics = next.topics.map((t) => tr(t) || t);
  if (next.ratings) next.ratings = next.ratings.map((t) => tr(t) || t);
  next.sections = (next.sections || []).map((s) => ({
    ...s, name: tr(s.name) || s.name, contains: tr(s.contains) || s.contains,
    group: s.group ? tr(s.group) : s.group, leftLabel: s.leftLabel ? tr(s.leftLabel) : s.leftLabel, rightLabel: s.rightLabel ? tr(s.rightLabel) : s.rightLabel,
  }));
  if (next.groupNotes) {
    const gn: Record<string, string> = {};
    for (const [k, v] of Object.entries(next.groupNotes)) gn[tr(k) || k] = tr(v) || v;
    next.groupNotes = gn;
  }
  applyNested(next.calculator, map);
  applyNested(next.frontier, map);
  return next;
}
