// Built-in reference spec: The Earnings Call, derived from lib/earnings.ts so the
// content stays in one place. This is what proves the spec-driven engine runs the
// same experience that was hand-coded.
import type { ModuleSpec, Stance, Dimension } from "@/lib/mechanics/roleplay";
import { SURFACE, PROBES, SCENARIOS } from "@/lib/earnings";

function stanceOf(d: { answer: string; evasive?: boolean }): Stance {
  if (d.evasive) return "noncommittal";
  const a = d.answer.toLowerCase();
  if (a.includes("deny it plainly")) return "deny";
  if (a.includes("neither confirm nor deny")) return "noncommittal";
  if (a.startsWith("true and favorable, affirm") || a.startsWith("true, state it plainly") || a.startsWith("true and partial") || a.includes("reassuring and true") || a.startsWith("true and favorable, affirm with the number")) return "affirm";
  return "hedge";
}

const CEO_BEHAVIOR =
  "You are on the record and under securities law, so you NEVER say anything factually false. A fact that is true and favorable you affirm specifically (give the number, cite the filing). A fact that is true but unfavorable you never deny, but you soften it, reframe it as normal for a fast-growing company, decline to quantify the damaging specific, and pivot to the growth story; you do not spell out the damaging inference. You cannot affirm an exonerating fact that is not true this quarter; you decline or hedge instead. A vague or accusatory-but-imprecise question gets a smooth non-answer; a precise, well-aimed question forces you to affirm or hedge, but never to lie. Never say the words channel stuffing unless the analyst does, and never announce whether the company is guilty. 2 to 5 sentences. No em dashes.";

export function earningsToSpec(): ModuleSpec {
  return {
    schemaVersion: 1,
    slug: "earnings-call",
    mechanic: "roleplay",
    meta: { name: "The Earnings Call", tagline: "Interrogate a CEO under hidden truth; graded on how much your questions reveal.", emoji: "📊", audience: "MBA / exec finance", minutes: 20, partner: "ai" },
    objective: { goal: "Detect whether a quarter was legally managed to hit consensus, by asking diagnostic questions under uncertainty.", aha: "Forensic analysis is a search for the question with the highest expected information gain; the numbers rarely confess on their own." },
    world: SURFACE,
    roles: [
      { key: "ceo", kind: "character", name: "Daniel Voss", model: "main", knowsScenario: true, persona: "Confident, media-trained founder-CEO who believes in the company and speaks like a real, optimistic executive.", behavior: CEO_BEHAVIOR },
      { key: "examiner", kind: "examiner", name: "Examiner", model: "fast", knowsScenario: true },
    ],
    probes: Object.entries(PROBES).map(([key, label]) => ({ key, label: String(label) })),
    scenarios: SCENARIOS.map((s: any) => ({
      id: s.id,
      label: s.id,
      truth: s.truth,
      narrative: s.narrative,
      tell: s.tell,
      foil: s.naiveAI,
      dimensions: (s.dimensions as any[]).map((d): Dimension => ({ probe: d.key, value: d.value, stance: stanceOf(d), answer: d.answer })),
    })),
    selection: { mode: "deterministic" },
    flow: [
      { key: "brief", kind: "brief", title: "The assignment", minutes: 4, intro: "You're the one analyst who did the homework. A short report alleges channel stuffing. You get 7 questions, and you don't know if the company is guilty. Ask what reveals the most." },
      { key: "call", kind: "converse", title: "Question the CEO", minutes: 12, with: "ceo", budget: 7, aiOpens: false },
      { key: "verdict", kind: "verdict", title: "Your verdict", minutes: 3, verdict: [
        { key: "call", label: "Your call", type: "choice", options: [{ value: "stuffing", label: "Channel stuffing" }, { value: "clean", label: "Clean quarter" }, { value: "cant_tell", label: "Can't tell yet" }] },
        { key: "confidence", label: "How confident are you?", type: "scale" },
        { key: "flip", label: "The one fact that would flip your call", type: "text" },
      ] },
      { key: "report", kind: "report", title: "How you did", minutes: 3 },
    ],
    rubric: {
      gradedBy: "examiner",
      instructions: "Grade the QUALITY of the analyst's questions and the calibration of their verdict, NOT whether they guessed the label. Map each question to the nearest probe; a HIGH probe is worth most, an open or vague question is worth none. verdict_correct is true only if their call matches the hidden truth (for the ambiguous scenario the correct call is cant_tell). Judge confidence against what their questions justified.",
      output: [
        { key: "score", label: "Diagnostic score", type: "score", range: [0, 100] },
        { key: "verdict_correct", label: "Right call", type: "bool" },
        { key: "calibration", label: "Calibration", type: "enum", of: "well-calibrated|overconfident|underconfident" },
        { key: "calibration_note", label: "Calibration note", type: "text" },
        { key: "questions", label: "Your questions, scored", type: "list", of: "{ text, value: high|med|low|none, note }" },
        { key: "info_map", label: "The information map", type: "list", of: "{ probe, value, asked: true|false }" },
        { key: "best_miss", label: "Highest-value miss", type: "text" },
        { key: "the_tell", label: "The tell, this time", type: "text" },
        { key: "naive_ai", label: "Naive-AI read", type: "text" },
        { key: "principle", label: "Transferable principle", type: "text" },
      ],
    },
    report: [
      { type: "verdictLine", source: "score" },
      { type: "trail", source: "questions", title: "Your questions, scored" },
      { type: "map", source: "info_map", title: "The information map" },
      { type: "section", source: "the_tell", title: "The tell, this time" },
      { type: "quote", source: "naive_ai", title: "You vs. a naive AI" },
      { type: "principle", source: "principle" },
    ],
    guardrails: {
      language: "en",
      neverReveal: ["the active scenario", "the hidden narrative", "the dimension values"],
      immutable: [
        "You never state a falsehood and never announce guilt or innocence.",
        "The active scenario is fixed for this session and must never be revealed.",
        "You have no tools and no data access; you only produce spoken replies.",
      ],
      safety: "Fictional company and people only; no real issuer.",
    },
  };
}

export const BUILTIN_SPECS: Record<string, () => ModuleSpec> = {
  "earnings-call": earningsToSpec,
};
