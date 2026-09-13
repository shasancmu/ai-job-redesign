// On-demand translation with a persistent cache (translation memory). Covers the
// module text the static messages/*.json bundle can't: custom (Studio) modules'
// authored labels, and any NEW module's text. Each unique string is translated by
// the model at most once per language, then reused for free. Best-effort: any
// failure falls back to the original English, so nothing ever breaks.
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateStringsAI } from "@/lib/ai";
import type { CanvasDef } from "@/lib/canvases";
import type { PxGenome } from "@/lib/paperx/types";

function isEnglish(lang?: string | null) { return !lang || /^(english|en)$/i.test(lang.trim()); }
const hash = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

// Translate a batch of strings into `language`, cached. Returns a source -> target
// map (identity for English or on any error).
export async function localizeStrings(strings: string[], language: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(strings.map((s) => (s || "").trim()).filter(Boolean))];
  if (isEnglish(language) || !uniq.length) return map;
  try {
    const admin = createAdminClient();
    const byHash = new Map(uniq.map((s) => [hash(s), s]));
    const hashes = [...byHash.keys()];
    // Read cache hits.
    const hits = new Set<string>();
    for (let i = 0; i < hashes.length; i += 200) {
      const { data } = await admin.from("translations").select("source_hash, translated").in("source_hash", hashes.slice(i, i + 200)).eq("lang", language);
      for (const r of ((data || []) as any[])) { const src = byHash.get(r.source_hash); if (src && r.translated) { map.set(src, r.translated); hits.add(r.source_hash); } }
    }
    // Translate + store the misses.
    const misses = uniq.filter((s) => !hits.has(hash(s)));
    if (misses.length) {
      const translated = await translateStringsAI(misses, language);
      const rows: any[] = [];
      misses.forEach((s, i) => {
        const t = translated[i];
        if (typeof t === "string" && t.trim() && t !== s) { map.set(s, t); rows.push({ source_hash: hash(s), lang: language, source: s.slice(0, 4000), translated: t.slice(0, 8000) }); }
      });
      if (rows.length) await admin.from("translations").upsert(rows, { onConflict: "source_hash,lang" });
    }
  } catch { /* fall back to English */ }
  return map;
}

// Localize a CanvasDef's learner-facing text (labels, headings, hints, tips) into
// the language, cached. The AI prompts (interviewSystem/draftSystem) are NOT
// translated — the model follows the English instructions and generates its OUTPUT
// in the language via withLanguage. Returns the def unchanged for English.
export async function localizeCanvasDef(def: CanvasDef, language: string | undefined | null): Promise<CanvasDef> {
  if (isEnglish(language)) return def;
  const strings: string[] = [];
  const add = (s?: string | null) => { if (s && s.trim()) strings.push(s); };

  add(def.name); add(def.subjectLabel); add(def.setupTitle); add(def.setupHint); add(def.setupPlaceholder); add(def.about);
  for (const f of def.fields || []) { add(f.label); add(f.hint); add((f as any).group); add((f as any).leftLabel); add((f as any).rightLabel); }
  for (const r of def.ratings || []) add(r.label);
  add(def.hasScore?.label); add(def.hasVerdict?.label);
  if (def.frontier) { add(def.frontier.xLabel); add(def.frontier.yLabel); add(def.frontier.heading); if (def.frontier.quadrants) { const q = def.frontier.quadrants; add(q.bl); add(q.br); add(q.tl); add(q.tr); } }
  if (def.groupNotes) for (const [k, v] of Object.entries(def.groupNotes)) { add(k); add(v); }
  if (def.canvasTip) { add(def.canvasTip.title); (def.canvasTip.items || []).forEach(add); }
  if (def.calculator) for (const inp of def.calculator.inputs || []) add(inp.label);

  const map = await localizeStrings(strings, language as string);
  if (!map.size) return def;
  const tr = (s?: string | null) => (s && map.has(s) ? map.get(s)! : s);

  const next: CanvasDef = { ...def,
    name: tr(def.name)!, subjectLabel: tr(def.subjectLabel)!, setupTitle: tr(def.setupTitle)!, setupHint: tr(def.setupHint)!, setupPlaceholder: tr(def.setupPlaceholder)!, about: tr(def.about) as any,
    fields: (def.fields || []).map((f) => ({ ...f, label: tr(f.label)!, hint: tr((f as any).hint) as any, group: tr((f as any).group) as any, leftLabel: tr((f as any).leftLabel) as any, rightLabel: tr((f as any).rightLabel) as any })),
    ratings: def.ratings ? def.ratings.map((r) => ({ ...r, label: tr(r.label)! })) : def.ratings,
    hasScore: def.hasScore ? { label: tr(def.hasScore.label)! } : def.hasScore,
    hasVerdict: def.hasVerdict ? { label: tr(def.hasVerdict.label)! } : def.hasVerdict,
  };
  if (def.frontier) next.frontier = { ...def.frontier, xLabel: tr(def.frontier.xLabel)!, yLabel: tr(def.frontier.yLabel)!, heading: tr(def.frontier.heading) as any, quadrants: def.frontier.quadrants ? { bl: tr(def.frontier.quadrants.bl)!, br: tr(def.frontier.quadrants.br)!, tl: tr(def.frontier.quadrants.tl)!, tr: tr(def.frontier.quadrants.tr)! } : def.frontier.quadrants };
  if (def.groupNotes) { const gn: Record<string, string> = {}; for (const [k, v] of Object.entries(def.groupNotes)) gn[tr(k)!] = tr(v)!; next.groupNotes = gn; }
  if (def.canvasTip) next.canvasTip = { title: tr(def.canvasTip.title)!, items: (def.canvasTip.items || []).map((i) => tr(i)!) };
  if (def.calculator) next.calculator = { ...def.calculator, inputs: def.calculator.inputs.map((inp) => ({ ...inp, label: tr(inp.label)! })) };
  return next;
}

// Localize a Paper Explainer's pre-written content (title, hook, puzzle, evidence,
// mechanism, teach-back, glossary...) into the language, cached. Provenance
// (paperTitle/authors/venue), the grounding sourceText, and emoji are left as-is.
// The tutor ("Ask the paper") localizes separately at runtime via withLanguage.
export async function localizePaperx(g: PxGenome, language: string | undefined | null): Promise<PxGenome> {
  if (isEnglish(language)) return g;
  const s: string[] = [];
  const add = (x?: string | null) => { if (x && x.trim()) s.push(x); };
  const anyG = g as any;
  add(g.title); add(g.eyebrow); add(g.dek); add(g.bigQuestion); add(g.ideaStatement);
  for (const k of ["hook", "nullBelief", "mechanism", "soWhat"]) { add(anyG[k]?.headline); add(anyG[k]?.body); }
  if (anyG.puzzle) { add(anyG.puzzle.believe); add(anyG.puzzle.expect); add(anyG.puzzle.observe); }
  for (const p of anyG.predicts || []) { add(p.prompt); add(p.reveal); (p.choices || []).forEach(add); }
  const ev = anyG.evidence || {}; add(ev.headline); add(ev.takeaway);
  if (ev.infographic) { add(ev.infographic.caption); (ev.infographic.stats || []).forEach((x: any) => add(x.label)); add(ev.infographic.pictograph?.label); }
  if (ev.chart) { add(ev.chart.title); add(ev.chart.caption); add(ev.chart.annotation); (ev.chart.series || []).forEach((x: any) => add(x.label)); }
  if (anyG.teachBack) { add(anyG.teachBack.prompt); add(anyG.teachBack.audience); (anyG.teachBack.rubric || []).forEach(add); }
  if (anyG.idea) for (const k of ["if_", "then_", "whenZ", "because"]) add(anyG.idea[k]);
  for (const gl of anyG.glossary || []) { add(gl.term); add(gl.def); }

  const map = await localizeStrings(s, language as string);
  if (!map.size) return g;
  const tr = (x?: string | null) => (x && map.has(x) ? map.get(x)! : x);
  const n: any = JSON.parse(JSON.stringify(g));
  n.title = tr(n.title); n.eyebrow = tr(n.eyebrow); n.dek = tr(n.dek); n.bigQuestion = tr(n.bigQuestion); n.ideaStatement = tr(n.ideaStatement);
  for (const k of ["hook", "nullBelief", "mechanism", "soWhat"]) if (n[k]) { n[k].headline = tr(n[k].headline); n[k].body = tr(n[k].body); }
  if (n.puzzle) { n.puzzle.believe = tr(n.puzzle.believe); n.puzzle.expect = tr(n.puzzle.expect); n.puzzle.observe = tr(n.puzzle.observe); }
  n.predicts = (n.predicts || []).map((p: any) => ({ ...p, prompt: tr(p.prompt), reveal: tr(p.reveal), choices: (p.choices || []).map((c: string) => tr(c)) }));
  if (n.evidence) { n.evidence.headline = tr(n.evidence.headline); n.evidence.takeaway = tr(n.evidence.takeaway);
    if (n.evidence.infographic) { n.evidence.infographic.caption = tr(n.evidence.infographic.caption); n.evidence.infographic.stats = (n.evidence.infographic.stats || []).map((x: any) => ({ ...x, label: tr(x.label) })); if (n.evidence.infographic.pictograph) n.evidence.infographic.pictograph.label = tr(n.evidence.infographic.pictograph.label); }
    if (n.evidence.chart) { n.evidence.chart.title = tr(n.evidence.chart.title); n.evidence.chart.caption = tr(n.evidence.chart.caption); n.evidence.chart.annotation = tr(n.evidence.chart.annotation); n.evidence.chart.series = (n.evidence.chart.series || []).map((x: any) => ({ ...x, label: tr(x.label) })); } }
  if (n.teachBack) { n.teachBack.prompt = tr(n.teachBack.prompt); n.teachBack.audience = tr(n.teachBack.audience); n.teachBack.rubric = (n.teachBack.rubric || []).map((r: string) => tr(r)); }
  if (n.idea) for (const k of ["if_", "then_", "whenZ", "because"]) n.idea[k] = tr(n.idea[k]);
  n.glossary = (n.glossary || []).map((gl: any) => ({ ...gl, term: tr(gl.term), def: tr(gl.def) }));
  return n as PxGenome;
}

// Localize an arbitrary object's display strings by field-name whitelist (used for
// Living Case and other bespoke specs). Translates string values under known text
// keys, cached; leaves structure, ids, and everything else intact.
const CASE_TEXT_KEYS = new Set(["title", "subtitle", "name", "label", "prompt", "question", "body", "summary", "description", "hint", "caption", "heading", "blurb", "intro", "brief", "note", "answer", "explanation", "takeaway", "tagline", "dek", "eyebrow"]);
export async function localizeByKeys(obj: any, language: string | undefined | null): Promise<any> {
  if (isEnglish(language) || !obj || typeof obj !== "object") return obj;
  const s: string[] = [];
  const walkCollect = (o: any) => { if (!o || typeof o !== "object") return; for (const [k, v] of Object.entries(o)) { if (typeof v === "string" && CASE_TEXT_KEYS.has(k) && v.trim()) s.push(v); else if (Array.isArray(v)) v.forEach(walkCollect); else if (v && typeof v === "object") walkCollect(v); } };
  walkCollect(obj);
  const map = await localizeStrings(s, language as string);
  if (!map.size) return obj;
  const n = JSON.parse(JSON.stringify(obj));
  const walkApply = (o: any) => { if (!o || typeof o !== "object") return; for (const [k, v] of Object.entries(o)) { if (typeof v === "string" && CASE_TEXT_KEYS.has(k) && map.has(v)) o[k] = map.get(v)!; else if (Array.isArray(v)) v.forEach(walkApply); else if (v && typeof v === "object") walkApply(v); } };
  walkApply(n);
  return n;
}

// Convenience for run pages: localize a client-safe spec to the viewer's language.
// This is the ONE line every module run render should call on its display data, so
// translation is structural — a new module type is covered by using it. No-op for
// signed-out or English viewers.
export async function localizeForViewer<T>(data: T, supabase: any, userId: string | null | undefined): Promise<T> {
  if (!userId || !data) return data;
  try {
    const { getUserLanguage } = await import("@/lib/lang");
    const lang = await getUserLanguage(supabase, userId);
    return (await localizeByKeys(data, lang)) as T;
  } catch { return data; }
}
