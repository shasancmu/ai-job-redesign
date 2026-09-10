import type { PxGenome, PxChart, PxInfographic, PxPredict, PxSeries, PxStat, PxTone } from "./types";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "explainer";
const str = (v: any, d = "") => (typeof v === "string" ? v.trim() : d);
const clampNum = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const KINDS = ["slope", "bars", "stacked", "hbars", "line", "area", "scatter", "coef"];
const optNum = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
function chart(raw: any): PxChart | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  let kind = KINDS.includes(raw.kind) ? raw.kind : "bars";
  const series: PxSeries[] = (Array.isArray(raw.series) ? raw.series : []).slice(0, 3).map((s: any) => ({
    label: str(s?.label),
    tone: (["up", "down", "neutral"].includes(s?.tone) ? s.tone : "neutral") as PxTone,
    trend: s?.trend === true || undefined,
    points: (Array.isArray(s?.points) ? s.points : []).slice(0, 24).map((p: any) => ({ x: str(p?.x, ""), y: clampNum(p?.y), lo: optNum(p?.lo), hi: optNum(p?.hi) })).filter((p: any) => p.x !== ""),
  })).filter((s: PxSeries) => s.points.length > 0);
  if (!series.length) return undefined;
  // 'coef' is only meaningful as an effect-size plot of >=2 real coefficients
  // with intervals; a single point (a summary stat misused as coef) renders as a
  // lonely dot, so fall back to a bar.
  const coefPts = series.reduce((n, s) => n + s.points.length, 0);
  const hasCI = series.some((s) => s.points.some((p) => p.lo !== undefined && p.hi !== undefined));
  if (kind === "coef" && (coefPts < 2 || !hasCI)) kind = "bars";
  return { kind, title: str(raw.title, "The finding"), caption: str(raw.caption) || undefined, xLabel: str(raw.xLabel) || undefined, yLabel: str(raw.yLabel) || undefined, series, annotation: str(raw.annotation) || undefined };
}

const tone = (v: any): PxTone => (["up", "down", "neutral"].includes(v) ? v : "neutral");
function infographic(raw: any): PxInfographic | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const stats: PxStat[] = (Array.isArray(raw.stats) ? raw.stats : []).slice(0, 4).map((s: any) => ({
    value: str(s?.value).slice(0, 24), label: str(s?.label).slice(0, 80), tone: tone(s?.tone), icon: str(s?.icon).slice(0, 4) || undefined,
  })).filter((s: PxStat) => s.value && s.label);
  let pictograph;
  const p = raw.pictograph;
  if (p && typeof p === "object") {
    const total = Math.max(2, Math.min(20, Math.round(Number(p.total) || 0)));
    const filled = Math.max(0, Math.min(total, Math.round(Number(p.filled) || 0)));
    const label = str(p.label).slice(0, 90);
    if (total >= 2 && label) pictograph = { total, filled, label, icon: str(p.icon).slice(0, 4) || undefined, tone: tone(p.tone) };
  }
  if (!stats.length && !pictograph) return undefined;
  return { stats, pictograph, caption: str(raw.caption).slice(0, 160) || undefined };
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
    ideaStatement: str(raw?.ideaStatement) || ideaProse(raw?.idea),
    idea: { if_: str(raw?.idea?.if_ ?? raw?.idea?.if), then_: str(raw?.idea?.then_ ?? raw?.idea?.then), whenZ: str(raw?.idea?.whenZ), because: str(raw?.idea?.because) },
    evidence: { headline: str(raw?.evidence?.headline, "The evidence"), infographic: infographic(raw?.evidence?.infographic), chart: chart(raw?.evidence?.chart), takeaway: str(raw?.evidence?.takeaway) },
    mechanism: sect(raw?.mechanism),
    soWhat: sect(raw?.soWhat),
    teachBack: {
      prompt: str(raw?.teachBack?.prompt, "Explain this paper's core idea in three sentences."),
      audience: str(raw?.teachBack?.audience, "a smart friend outside your field"),
      rubric: (Array.isArray(raw?.teachBack?.rubric) ? raw.teachBack.rubric : []).slice(0, 5).map((r: any) => str(r)).filter(Boolean),
    },
    glossary: (Array.isArray(raw?.glossary) ? raw.glossary : []).slice(0, 8).map((g: any) => ({ term: str(g?.term), def: str(g?.def) })).filter((g: any) => g.term && g.def),
    sourceText: typeof raw?.sourceText === "string" ? raw.sourceText.slice(0, 16000) : undefined,
    generated: true,
  };
}

// A readable fallback for older genomes with no ideaStatement: compose the
// structured parts into one plain sentence, dropping the IF/THEN scaffolding.
function ideaProse(idea: any): string {
  const lc = (s: string) => { const t = str(s); return t ? t.charAt(0).toLowerCase() + t.slice(1) : ""; };
  const then_ = str(idea?.then_ ?? idea?.then);
  const if_ = str(idea?.if_ ?? idea?.if);
  const because = str(idea?.because);
  if (!then_ && !if_) return "";
  const head = if_ ? `When ${lc(if_)}, ${lc(then_) || "the outcome changes"}` : then_;
  return `${head}${because ? `, because ${lc(because)}` : ""}.`.replace(/\.\.$/, ".");
}

// Enough to render a real explainer and teach-back.
export function pxComplete(g: PxGenome): boolean {
  return !!(g.hook.body && g.nullBelief.body && g.puzzle.observe && g.ideaStatement && g.evidence.takeaway && g.mechanism.body && g.soWhat.body && g.teachBack.rubric.length > 0);
}
