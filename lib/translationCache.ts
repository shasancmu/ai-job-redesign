// On-demand translation with a persistent cache (translation memory). Covers the
// module text the static messages/*.json bundle can't: custom (Studio) modules'
// authored labels, and any NEW module's text. Each unique string is translated by
// the model at most once per language, then reused for free. Best-effort: any
// failure falls back to the original English, so nothing ever breaks.
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateStringsAI } from "@/lib/ai";
import type { CanvasDef } from "@/lib/canvases";

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
