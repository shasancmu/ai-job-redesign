import type { PxGenome, PxChart, PxPredict, PxSeries, PxTone } from "./types";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "explainer";
const str = (v: any, d = "") => (typeof v === "string" ? v.trim() : d);
const clampNum = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const KINDS = ["slope", "bars", "stacked", "hbars", "line", "area", "scatter", "coef"];
const optNum = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
function chart(raw: any): PxChart | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const kind = KINDS.includes(raw.kind) ? raw.kind : "bars";
  const series: PxSeries[] = (Array.isArray(raw.series) ? raw.series : []).slice(0, 3).map((s: any) => ({
    label: str(s?.label),
    tone: (["up", "down", "neutral"].includes(s?.tone) ? s.tone : "neutral") as PxTone,
    trend: s?.trend === true || undefined,
    points: (Array.isArray(s?.points) ? s.points : []).slice(0, 24).map((p: any) => ({ x: str(p?.x, ""), y: clampNum(p?.y), lo: optNum(p?.lo), hi: optNum(p?.hi) })).filter((p: any) => p.x !== ""),
  })).filter((s: PxSeries) => s.points.length > 0);
  if (!series.length) return undefined;
  return { kind, title: str(raw.title, "The finding"), caption: str(raw.caption) || undefined, xLabel: str(raw.xLabel) || undefined, yLabel: str(raw.yLabel) || undefined, series, annotation: str(raw.annotation) || undefined };
}

function predicts(raw: any): PxPredict[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 2).map((p: any) => {
    const choices = (Array.isArray(p?.choices) ? p.choices : []).slice(0, 4).map((c: any) => str(c)).filter(Boolean);
    let answer = Number.isInteger(p?.answer) ? p.answer : 0;
    if (answer < 0 || answer >= choices.length) answer = 0;
    return { prompt: str(p?.prompt), choices, answer, reveal: str(p?.reveal) };
  }).filter((p: PxPredict) => p.prompt && p.choices.length >= 2 && p.reveal);
}

// Coerce whatever the model returned into a valid genome.
export function sanitizePx(raw: any, fallbackTitle: string): PxGenome {
  const sect = (o: any, dh = "", db = "") => ({ headline: str(o?.headline, dh), body: str(o?.body, db) });
  return {
    slug: slugify(str(raw?.title, fallbackTitle)),
    paperTitle: str(raw?.paperTitle, fallbackTitle),
    authors: str(raw?.authors, ""),
    venue: str(raw?.venue) || undefined,
    title: str(raw?.title, fallbackTitle),
    eyebrow: str(raw?.eyebrow, "Research"),
    emoji: str(raw?.emoji, "💡").slice(0, 4) || "💡",
    dek: str(raw?.dek),
    bigQuestion: str(raw?.bigQuestion),
    hook: sect(raw?.hook),
    nullBelief: sect(raw?.nullBelief),
    puzzle: { believe: str(raw?.puzzle?.believe), expect: str(raw?.puzzle?.expect), observe: str(raw?.puzzle?.observe) },
    predicts: predicts(raw?.predicts),
    idea: { if_: str(raw?.idea?.if_ ?? raw?.idea?.if), then_: str(raw?.idea?.then_ ?? raw?.idea?.then), whenZ: str(raw?.idea?.whenZ), because: str(raw?.idea?.because) },
    evidence: { headline: str(raw?.evidence?.headline, "The evidence"), chart: chart(raw?.evidence?.chart), takeaway: str(raw?.evidence?.takeaway) },
    mechanism: sect(raw?.mechanism),
    soWhat: sect(raw?.soWhat),
    teachBack: {
      prompt: str(raw?.teachBack?.prompt, "Explain this paper's core idea in three sentences."),
      audience: str(raw?.teachBack?.audience, "a smart friend outside your field"),
      rubric: (Array.isArray(raw?.teachBack?.rubric) ? raw.teachBack.rubric : []).slice(0, 5).map((r: any) => str(r)).filter(Boolean),
    },
    glossary: (Array.isArray(raw?.glossary) ? raw.glossary : []).slice(0, 8).map((g: any) => ({ term: str(g?.term), def: str(g?.def) })).filter((g: any) => g.term && g.def),
    generated: true,
  };
}

// Enough to render a real explainer and teach-back.
export function pxComplete(g: PxGenome): boolean {
  return !!(g.hook.body && g.nullBelief.body && g.puzzle.observe && g.idea.if_ && g.idea.then_ && g.idea.because && g.evidence.takeaway && g.mechanism.body && g.soWhat.body && g.teachBack.rubric.length > 0);
}
