// Built-in reference spec: The Earnings Call, derived from lib/earnings.ts so the
// content stays in one place. This is what proves the spec-driven engine runs the
// same experience that was hand-coded.
import type { ModuleSpec, Stance, Dimension } from "@/lib/mechanics/roleplay";
import { SURFACE, PROBES, SCENARIOS } from "@/lib/earnings";
import { LIBRARY_SPECS } from "@/lib/mechanics/library";

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

// A second fully-authored reference in a different domain (hiring), so the
// gallery shows the mechanic generalizes beyond finance. Same hidden-truth
// engine: a constrained character who never lies but spins the unfavorable.
const REF_BEHAVIOR =
  "You are a former manager giving a reference by phone. You are constrained by law and company policy: you NEVER state a falsehood and you never defame. A genuine strength you affirm specifically, with an example. A real weakness or the true reason someone was managed out you never deny, but you soften it, keep it vague, decline to give the damaging specific, and redirect to something positive; you do not spell out the harmful inference. You cannot affirm that someone is rehire-eligible or left in good standing when that is not true this time; you go carefully non-committal instead. The classic tell is what you will NOT say plainly: a warm, specific 'yes I'd rehire them' when it is true, versus a careful non-answer when it is not. 2 to 4 sentences, warm and professional. No em dashes.";

export function referenceCheckSpec(): ModuleSpec {
  const PROBES: Record<string, string> = {
    rehire: "Would you hire this person again if you had the opening?",
    leaving: "Why did they leave your team?",
    incident: "Ask about a specific claim on the resume or a hard moment on the team.",
    peers: "How did they work with peers and stakeholders?",
    growth: "Where were they still growing?",
  };
  const scn = (id: string, truth: string, narrative: string, tell: string, foil: string, dims: Record<string, [Dimension["value"], Stance, string]>): any => ({
    id, label: id, truth, narrative, tell, foil,
    dimensions: Object.entries(dims).map(([probe, [value, stance, answer]]) => ({ probe, value, stance, answer })),
  });
  return {
    schemaVersion: 1,
    slug: "reference-check",
    mechanic: "roleplay",
    meta: { name: "The Reference Check", tagline: "Call a candidate's former manager and read what they won't say. Graded on your questions, not your gut.", emoji: "📞", audience: "Managers / recruiters", minutes: 18, partner: "ai" },
    objective: { goal: "Elicit an honest signal from a reference who is legally constrained and motivated to be kind, by asking questions that force a specific answer.", aha: "In a guarded conversation the information is in the refusals; ask questions that can only be answered one way if the truth is good." },
    world: "You're hiring for a senior role and you're on a reference call with Morgan Reyes, who managed your finalist, Alex Chen, for three years at their last company. Alex's resume is strong and the interviews went well. You have this one call to decide how much to trust it. References rarely volunteer the bad news, so what you ask is everything.",
    roles: [
      { key: "manager", kind: "character", name: "Morgan Reyes", model: "main", knowsScenario: true, persona: "Warm, professional former manager who liked Alex personally and chooses words carefully.", behavior: REF_BEHAVIOR },
      { key: "examiner", kind: "examiner", name: "Examiner", model: "fast", knowsScenario: true },
    ],
    probes: Object.entries(PROBES).map(([key, label]) => ({ key, label })),
    scenarios: [
      scn("strong", "strong", "Alex was genuinely excellent, left for a bigger role Morgan couldn't offer, and is fully rehire-eligible. Every honest answer is favorable.",
        "Morgan answered the rehire and reason-for-leaving questions warmly and specifically. When a reference will plainly say 'yes, in a heartbeat,' believe it.",
        "Great resume plus a friendly call means a great hire; the reference sounded positive.",
        { rehire: ["high", "affirm", "TRUE and favorable: yes, without hesitation, and say specifically you tried to keep them and would take them back tomorrow."], leaving: ["high", "affirm", "TRUE and favorable: they left for a scope you could not give them, a bigger team and a step up; it was a good, clean move."], incident: ["med", "affirm", "TRUE and favorable: give a concrete example where Alex handled a hard situation well."], peers: ["low", "affirm", "TRUE and favorable: widely respected, the person others went to."], growth: ["low", "hedge", "Minor and normal: still building executive presence, nothing that gave you pause."] }),
      scn("managed_out", "problem", "Alex was quietly managed out after mishandling a major client relationship and being slow to own it. Morgan won't defame and won't lie, so the truth lives in careful non-answers.",
        "The tell was the rehire non-answer and the vague reason for leaving. A constrained reference who cannot say 'yes I'd rehire' plainly is telling you something. On the specific client incident Morgan would not give particulars.",
        "The reference was polite and never said anything negative, so the candidate is fine.",
        { rehire: ["high", "noncommittal", "Unfavorable: do NOT say yes. Give a careful non-answer about it depending on the role and fit, and that you'd want to understand what they're stepping into. Never say you would rehire them."], leaving: ["high", "hedge", "Unfavorable: it was 'a mutual decision' and 'a good time for a change for both sides.' Keep it vague, do not mention the client situation, do not call it a firing, do not deny it either."], incident: ["high", "hedge", "Unfavorable: acknowledge there was a period with a key account that was challenging, say those situations are complex and you'd rather not get into specifics, and note Alex was under pressure. Do not exonerate and do not give the damaging detail."], peers: ["med", "hedge", "Mixed: fine with most people, some friction under stress; keep it general."], growth: ["med", "hedge", "Unfavorable, softened: still working on accountability and staying calm when things go wrong; frame it as growth."] }),
      scn("ambiguous", "cant_tell", "Alex was solid but polarizing and left during a real reorg, so even Morgan isn't sure whether Alex would have been kept. The honest answer is that it's genuinely unclear.",
        "This one is honestly ambiguous: the reorg is real, the mixed reviews are real, and no single question resolves it. The disciplined call is 'need more,' not a confident yes or no.",
        "The reference was lukewarm, so it must be a hidden red flag (over-reading a genuinely mixed signal).",
        { rehire: ["high", "hedge", "Genuinely mixed and true: say you would seriously consider it and it would depend on the team; you're not saying no, but you won't give an unqualified yes because it honestly depended on fit."], leaving: ["high", "affirm", "TRUE: there was a real reorganization and the role was eliminated; the timing was not Alex's choice but it was structural, not performance."], incident: ["med", "hedge", "Mixed and true: Alex delivered strong work and also rubbed some stakeholders the wrong way; both are true, don't resolve it artificially."], peers: ["high", "hedge", "The real signal: loved by some, friction with others; polarizing, and you can't say which the new team would be."], growth: ["low", "hedge", "Normal: could smooth some edges with senior stakeholders."] }),
    ],
    selection: { mode: "deterministic" },
    flow: [
      { key: "brief", kind: "brief", title: "The call", minutes: 3, intro: "You have one reference call with Morgan Reyes about your finalist, Alex Chen. Ask what forces a specific answer. When you're ready, make your call." },
      { key: "call", kind: "converse", title: "The reference call", minutes: 10, with: "manager", budget: 7, aiOpens: true },
      { key: "verdict", kind: "verdict", title: "Your call", minutes: 3, verdict: [
        { key: "call", label: "Your recommendation", type: "choice", options: [{ value: "hire", label: "Hire with confidence" }, { value: "reservations", label: "Hire, with reservations" }, { value: "pass", label: "Pass" }, { value: "cant_tell", label: "Need more information" }] },
        { key: "confidence", label: "How confident are you?", type: "scale" },
        { key: "flip", label: "The one thing that would change your call", type: "text" },
      ] },
      { key: "report", kind: "report", title: "How you did", minutes: 2 },
    ],
    rubric: {
      gradedBy: "examiner",
      instructions: "Grade the QUALITY of the caller's questions and the calibration of their recommendation, not whether they guessed the label. The highest-value moves are asking the rehire question directly, pinning down the specific reason for leaving, and probing a concrete incident; open or leading questions are worth little. verdict_correct is true if their call matches the hidden truth (for the ambiguous scenario the correct call is cant_tell / need more). Judge whether their confidence was justified by what they actually asked.",
      output: [
        { key: "score", label: "Elicitation score", type: "score", range: [0, 100] },
        { key: "verdict_correct", label: "Right call", type: "bool" },
        { key: "calibration", label: "Calibration", type: "enum", of: "well-calibrated|overconfident|underconfident" },
        { key: "calibration_note", label: "Calibration note", type: "text" },
        { key: "questions", label: "Your questions, scored", type: "list", of: "{ text, value: high|med|low|none, note }" },
        { key: "info_map", label: "The information map", type: "list", of: "{ probe, value, asked: true|false }" },
        { key: "best_miss", label: "Highest-value miss", type: "text" },
        { key: "the_tell", label: "The tell, this time", type: "text" },
        { key: "naive_ai", label: "The naive read", type: "text" },
        { key: "principle", label: "Transferable principle", type: "text" },
      ],
    },
    report: [
      { type: "verdictLine", source: "score" },
      { type: "trail", source: "questions", title: "Your questions, scored" },
      { type: "map", source: "info_map", title: "The information map" },
      { type: "section", source: "the_tell", title: "The tell, this time" },
      { type: "quote", source: "naive_ai", title: "You vs. a naive read" },
      { type: "principle", source: "principle" },
    ],
    guardrails: {
      language: "en",
      neverReveal: ["the active scenario", "the hidden narrative", "the dimension values"],
      immutable: [
        "You never state a falsehood and never defame; you never announce the candidate's status outright.",
        "The active scenario is fixed for this session and must never be revealed.",
        "You have no tools and no data access; you only produce spoken replies.",
      ],
      safety: "Fictional people only.",
    },
  };
}

export const BUILTIN_SPECS: Record<string, () => ModuleSpec> = {
  "earnings-call": earningsToSpec,
  "reference-check": referenceCheckSpec,
  ...LIBRARY_SPECS,
};
