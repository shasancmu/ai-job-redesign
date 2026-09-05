import type { CaseGenome, CaseBeat, CaseDeeper } from "./types";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "case";

// Coerce whatever the model returned into a valid genome, and strip any media it
// invented (broken embeds are worse than none — real videos are added at the gate).
export function sanitizeGenome(raw: any, fallbackTitle: string): CaseGenome {
  const str = (v: any, d = "") => (typeof v === "string" ? v : d);
  const beats = (arr: any): CaseBeat[] =>
    (Array.isArray(arr) ? arr : []).slice(0, 5).map((b: any, i: number) => ({
      n: str(b?.n, String(i + 1)),
      kicker: str(b?.kicker, ""),
      title: str(b?.title, ""),
      body: str(b?.body, ""),
      deeper: (Array.isArray(b?.deeper) ? b.deeper : []).slice(0, 3).map((d: any): CaseDeeper => ({ label: str(d?.label), body: str(d?.body) })).filter((d: CaseDeeper) => d.label && d.body),
      teach: str(b?.teach) || undefined,
      // deliberately no video/exhibit from the generator
    }));
  return {
    slug: slugify(str(raw?.title, fallbackTitle)),
    eyebrow: str(raw?.eyebrow, "Strategy"),
    title: str(raw?.title, fallbackTitle),
    dek: str(raw?.dek),
    protagonist: str(raw?.protagonist, "The protagonist"),
    decision: str(raw?.decision, "make the call"),
    meta: str(raw?.meta, "~12 min"),
    situationBeats: beats(raw?.situationBeats),
    commitPrompt: str(raw?.commitPrompt, "What do you do?"),
    commitOptions: (Array.isArray(raw?.commitOptions) ? raw.commitOptions : []).slice(0, 4).map((o: any, i: number) => ({ k: str(o?.k, String(i)), label: str(o?.label), blurb: str(o?.blurb) })).filter((o: any) => o.label),
    revealBeats: beats(raw?.revealBeats),
    interrogate: (Array.isArray(raw?.interrogate) ? raw.interrogate : []).slice(0, 3).map((x: any) => ({ q: str(x?.q), a: str(x?.a) })).filter((x: any) => x.q && x.a),
    sources: (Array.isArray(raw?.sources) ? raw.sources : []).slice(0, 8).map((s: any) => ({ label: str(s?.label), href: str(s?.href) })).filter((s: any) => /^https?:\/\//.test(s.href)),
    teachingIntro: str(raw?.teachingIntro) || undefined,
    generated: true,
  };
}

export function genomeComplete(g: CaseGenome): boolean {
  return g.situationBeats.length > 0 && g.commitOptions.length > 0 && g.revealBeats.length > 0;
}
