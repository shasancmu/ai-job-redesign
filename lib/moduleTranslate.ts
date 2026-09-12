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

// Paper Explainer (PxGenome) uses entirely different field names than a
// BuilderSpec, so it needs its own extractor. Provenance (paperTitle, authors,
// venue), the grounding sourceText, emoji/tone/icons, and numeric stat values are
// left as-is; everything the learner reads is translated.
async function translatePaperx(spec: any, language: string): Promise<any> {
  const g = JSON.parse(JSON.stringify(spec));
  const strings = new Set<string>();
  const add = (s?: string | null) => { if (s && s.trim()) strings.add(s); };

  add(g.title); add(g.eyebrow); add(g.dek); add(g.bigQuestion); add(g.ideaStatement);
  for (const k of ["hook", "nullBelief", "mechanism", "soWhat"]) { add(g[k]?.headline); add(g[k]?.body); }
  if (g.puzzle) { add(g.puzzle.believe); add(g.puzzle.expect); add(g.puzzle.observe); }
  for (const p of g.predicts || []) { add(p.prompt); add(p.reveal); (p.choices || []).forEach(add); }
  const ev = g.evidence || {};
  add(ev.headline); add(ev.takeaway);
  if (ev.infographic) { add(ev.infographic.caption); (ev.infographic.stats || []).forEach((s: any) => add(s.label)); add(ev.infographic.pictograph?.label); }
  if (ev.chart) { add(ev.chart.title); add(ev.chart.caption); add(ev.chart.annotation); (ev.chart.series || []).forEach((s: any) => add(s.label)); }
  if (g.teachBack) { add(g.teachBack.prompt); add(g.teachBack.audience); (g.teachBack.rubric || []).forEach(add); }
  if (g.idea) for (const k of ["if_", "then_", "whenZ", "because"]) add(g.idea[k]);
  for (const gl of g.glossary || []) { add(gl.term); add(gl.def); }

  const list = [...strings];
  if (!list.length) return g;
  const translated = await translateStringsAI(list, language);
  const map = new Map<string, string>();
  list.forEach((s, i) => map.set(s, translated[i]));
  const tr = (s?: string | null) => (s && map.has(s) ? map.get(s)! : s);

  g.title = tr(g.title); g.eyebrow = tr(g.eyebrow); g.dek = tr(g.dek); g.bigQuestion = tr(g.bigQuestion); g.ideaStatement = tr(g.ideaStatement);
  for (const k of ["hook", "nullBelief", "mechanism", "soWhat"]) if (g[k]) { g[k].headline = tr(g[k].headline); g[k].body = tr(g[k].body); }
  if (g.puzzle) { g.puzzle.believe = tr(g.puzzle.believe); g.puzzle.expect = tr(g.puzzle.expect); g.puzzle.observe = tr(g.puzzle.observe); }
  g.predicts = (g.predicts || []).map((p: any) => ({ ...p, prompt: tr(p.prompt), reveal: tr(p.reveal), choices: (p.choices || []).map((c: string) => tr(c)) }));
  if (g.evidence) {
    g.evidence.headline = tr(g.evidence.headline); g.evidence.takeaway = tr(g.evidence.takeaway);
    if (g.evidence.infographic) { g.evidence.infographic.caption = tr(g.evidence.infographic.caption); g.evidence.infographic.stats = (g.evidence.infographic.stats || []).map((s: any) => ({ ...s, label: tr(s.label) })); if (g.evidence.infographic.pictograph) g.evidence.infographic.pictograph.label = tr(g.evidence.infographic.pictograph.label); }
    if (g.evidence.chart) { g.evidence.chart.title = tr(g.evidence.chart.title); g.evidence.chart.caption = tr(g.evidence.chart.caption); g.evidence.chart.annotation = tr(g.evidence.chart.annotation); g.evidence.chart.series = (g.evidence.chart.series || []).map((s: any) => ({ ...s, label: tr(s.label) })); }
  }
  if (g.teachBack) { g.teachBack.prompt = tr(g.teachBack.prompt); g.teachBack.audience = tr(g.teachBack.audience); g.teachBack.rubric = (g.teachBack.rubric || []).map((r: string) => tr(r)); }
  if (g.idea) for (const k of ["if_", "then_", "whenZ", "because"]) g.idea[k] = tr(g.idea[k]);
  g.glossary = (g.glossary || []).map((gl: any) => ({ ...gl, term: tr(gl.term), def: tr(gl.def) }));
  return g;
}

export async function translateSpec(spec: BuilderSpec, language: string): Promise<BuilderSpec> {
  // Paper Explainer specs have their own shape; route them to the right extractor.
  const anySpec = spec as any;
  if (anySpec && (anySpec.bigQuestion !== undefined || anySpec.teachBack !== undefined || anySpec.paperTitle !== undefined)) {
    return (await translatePaperx(anySpec, language)) as any;
  }
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
