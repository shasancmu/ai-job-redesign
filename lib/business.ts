// ============================================================================
// The 30-Minute Consult — a guided business diagnostic for an owner.
// Combines: a qualitative interview (Small & Calarco craft), the Bloom–Van
// Reenen–Sadun management-practices survey, an AI photo read of the business,
// an 80/20 concentration check, and a business-model / margin analysis grounded
// in Hasan's "Business Model Competition" framework (value creation & capture:
// win by raising willingness-to-pay OR cutting cost; profit pools / "what's the
// popcorn"; the levers of profit = q·p − c).
// ============================================================================

export type ConsultStep = { key: string; title: string; minutes: number };

export const CONSULT_STEPS: ConsultStep[] = [
  { key: "intake", title: "Your business", minutes: 4 },
  { key: "interview", title: "The conversation", minutes: 8 },
  { key: "practices", title: "Management practices", minutes: 6 },
  { key: "eighty", title: "The 80/20", minutes: 4 },
  { key: "photos", title: "See the business", minutes: 3 },
  { key: "report", title: "Your consult", minutes: 5 },
];

// ---- Management practices: Bloom–Van Reenen–Sadun, adapted to plain owner
// language, anchored 1 (weak) / 3 (some) / 5 (strong). Four areas. ----------
export type WmsOption = { score: number; label: string };
export type WmsQuestion = { id: string; area: WmsAreaKey; prompt: string; options: WmsOption[] };
export type WmsAreaKey = "operations" | "monitoring" | "targets" | "people";

export const WMS_AREAS: { key: WmsAreaKey; label: string }[] = [
  { key: "operations", label: "Operations" },
  { key: "monitoring", label: "Monitoring" },
  { key: "targets", label: "Targets" },
  { key: "people", label: "People" },
];

const A = (one: string, three: string, five: string): WmsOption[] => [
  { score: 1, label: one },
  { score: 3, label: three },
  { score: 5, label: five },
];

export const WMS: WmsQuestion[] = [
  {
    id: "ops1",
    area: "operations",
    prompt: "When something goes wrong (a defect, a delay, a mistake), what usually happens?",
    options: A("We fix it and move on.", "We fix it and sometimes ask why.", "We find the root cause and change the process so it can't recur."),
  },
  {
    id: "ops2",
    area: "operations",
    prompt: "How standardized are your day-to-day processes?",
    options: A("Mostly in people's heads.", "Some are written down.", "Key processes are documented and improved regularly."),
  },
  {
    id: "mon1",
    area: "monitoring",
    prompt: "What performance numbers do you track?",
    options: A("Mainly what's in the bank.", "A few key numbers, checked occasionally.", "A clear set of KPIs on a regular cadence."),
  },
  {
    id: "mon3",
    area: "monitoring",
    prompt: "When a number is off-track, what happens?",
    options: A("We notice eventually.", "We talk about it.", "It triggers a specific review and a concrete action."),
  },
  {
    id: "tgt1",
    area: "targets",
    prompt: "Do you set clear goals or targets?",
    options: A("Not really.", "Loose goals.", "Specific, time-bound targets people know."),
  },
  {
    id: "tgt2",
    area: "targets",
    prompt: "How stretching are those targets?",
    options: A("Whatever happens, happens.", "Comfortable.", "Realistic but genuinely stretching."),
  },
  {
    id: "ppl1",
    area: "people",
    prompt: "How do you handle a persistent underperformer?",
    options: A("Tolerate it.", "Eventually address it.", "Coach quickly, and move them on if it doesn't improve."),
  },
  {
    id: "ppl2",
    area: "people",
    prompt: "How do you reward your strongest people?",
    options: A("Everyone's treated the same.", "Ad hoc.", "Consistently recognized and rewarded for performance."),
  },
];

export function wmsScore(answers: Record<string, number>): {
  overall: number;
  byArea: Record<WmsAreaKey, number>;
  answered: number;
} {
  const byArea: Record<string, { sum: number; n: number }> = {};
  let sum = 0;
  let n = 0;
  for (const q of WMS) {
    const v = answers[q.id];
    if (typeof v !== "number") continue;
    n += 1;
    sum += v;
    byArea[q.area] = byArea[q.area] || { sum: 0, n: 0 };
    byArea[q.area].sum += v;
    byArea[q.area].n += 1;
  }
  const out: any = {};
  for (const a of WMS_AREAS) {
    const b = byArea[a.key];
    out[a.key] = b ? Math.round((b.sum / b.n) * 10) / 10 : 0;
  }
  return { overall: n ? Math.round((sum / n) * 10) / 10 : 0, byArea: out, answered: n };
}

// The report shape the AI returns.
export type ConsultReport = {
  headline: string;
  businessType: { axis: "cost" | "value" | "mixed"; label: string; why: string };
  marginEngine: { summary: string; drivers: { lever: "volume" | "price" | "cost"; note: string }[] };
  profitPool: { popcorn: string; note: string };
  practices: { summary: string; gaps: { area: string; issue: string; fix: string }[] };
  eightyTwenty: { summary: string; risks: string[] };
  upstream: string[];
  plan: { title: string; why: string; firstStep: string }[];
};
