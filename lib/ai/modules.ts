// AI domain functions — modules. Split from the former monolithic lib/ai.ts; the
// shared engine + interview primitives live in lib/ai/core.ts.
import { COMPETENCE_CALIBRATION } from "@/lib/grading";
import type { ChatMsg } from "@/lib/ai/core";
import { MODEL, complete, completeJson, extractJson } from "@/lib/ai/core";


// The Earnings Call examiner: grades the QUALITY of the analyst's questions and
// the calibration of their verdict against the hidden truth of the call. The
// scenario answer key comes from lib/earnings; the transcript and verdict come
// from the run. Runs on the fast model (json, no streaming).
export async function earningsReportAI(input: {
  scenario: { truth: string; narrative: string; tell: string; naiveAI: string; dimensions: { probe: string; value: string; answer: string }[] };
  transcript: string;
  verdict: { call: string; confidence: number; flip: string };
}): Promise<any> {
  const s = input.scenario;
  const order: Record<string, number> = { high: 0, med: 1, low: 2 };
  const probes = [...s.dimensions]
    .sort((a, b) => (order[a.value] ?? 3) - (order[b.value] ?? 3))
    .map((d) => `- [${d.value.toUpperCase()}] ${d.probe}. Underlying truth and how Voss handled it: ${d.answer}`)
    .join("\n");

  const system = `You are a forensic-accounting instructor grading an analyst's earnings-call interrogation. You know the hidden truth of this call and a ranked bank of the most diagnostic questions available. You are grading the QUALITY OF THE ANALYST'S QUESTIONS and the calibration of their final judgment, NOT whether they guessed the label. Do not use em dashes anywhere.

HIDDEN TRUTH: ${s.truth === "stuffing" ? "This quarter WAS channel stuffing." : s.truth === "clean" ? "This quarter was CLEAN; the alarming surface was a false positive." : "This quarter is GENUINELY AMBIGUOUS; no available question resolves it, so the correct verdict is 'cant_tell' with the decisive missing facts named."}
WHY: ${s.narrative}
WHAT ACTUALLY DISCRIMINATED: ${s.tell}

RANKED DIAGNOSTIC PROBES (high value means asking it moves you most toward the truth in THIS call):
${probes}

SCORING:
- Map each question the analyst asked to the nearest probe. A question that squarely hits a HIGH probe is worth the most; MED less; LOW little; an open or vague question ("are you optimistic?", "any comment on the short report?") is worth none.
- The score (0 to 100) rewards covering the HIGH probes with few wasted questions given a 7-question budget.
- verdict_correct: true only if their call matches the hidden truth. For an ambiguous call, 'cant_tell' is the correct answer and a confident 'stuffing'/'clean' is NOT correct even if it leans the right way.
- calibration: judge their stated confidence against what their questions actually justified. Overconfident if they claimed high certainty without asking the discriminating questions; underconfident if they had the evidence but hedged. On the ambiguous scenario, a high-confidence call is overconfident by definition.

Return STRICT JSON only, no prose outside it:
{
  "score": 0,
  "verdict_correct": true,
  "calibration": "well-calibrated" | "overconfident" | "underconfident",
  "calibration_note": "one sentence",
  "questions": [ { "text": "the analyst's question, trimmed", "value": "high" | "med" | "low" | "none", "note": "one line: what it bought them" } ],
  "info_map": [ { "probe": "short label", "value": "high" | "med" | "low", "asked": true } ],
  "best_miss": "one or two sentences naming the single highest-value question they never asked and what it would have revealed",
  "the_tell": "one or two sentences: what actually discriminated this call, and whether their questions touched it",
  "naive_ai": "the confident wrong read a general AI gave (use the provided one verbatim)",
  "principle": "two sentences lifting the lesson off this case: forensic analysis is a search for the question with the highest expected information gain, and the numbers rarely confess on their own"
}
info_map must list every probe from the bank above, ranked high to low, marking asked true or false. questions must have one entry per question the analyst actually asked, in order.${COMPETENCE_CALIBRATION}`;

  const user = `THE ANALYST'S FINAL VERDICT: call=${input.verdict.call}, confidence=${input.verdict.confidence}%, "the one fact that would flip me"=${JSON.stringify(input.verdict.flip || "")}

THE NAIVE-AI READ TO ECHO IN naive_ai: ${s.naiveAI}

THE TRANSCRIPT (analyst questions and Voss's answers):
${(input.transcript || "(no questions asked)").slice(0, 9000)}`;

  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: 0.4, maxTokens: 2400 });
  return extractJson(raw);
}

// Regression Detective — invent a realistic data-generating process for the
// chosen context + difficulty. The AI owns realism (variable names, scenario,
// which effects are real vs. red herrings); CODE simulates the data from this
// spec and grades against it, so the "true model" is genuinely known.
export async function regressionDgpAI(input: { context: string; difficulty: "easy" | "hard" }): Promise<any> {
  const easy = input.difficulty === "easy";
  const system = `You design realistic teaching datasets for a regression course. Given a real-world CONTEXT, invent an outcome to explain and a set of predictor variables, then specify a TRUE data-generating process. Some predictors are genuine DRIVERS (they appear in the true model, possibly through a transform or interaction); others are realistic DISTRACTORS that do NOT belong in the model but look plausible — often correlated with a driver so a naive regression makes them look significant. The student will only see the data and the variable names; your job is to make discovering the true model a genuine, fair puzzle.

Return STRICT JSON only, no prose outside it:
{
  "scenario": "2-4 sentences setting up the outcome and what the analyst is trying to explain, in this context",
  "outcome": { "name": "snake_case_name", "label": "Human label with units" },
  "vars": [
    { "name": "snake_case", "label": "Human label", "dist": <one of the dist forms below>, "role": "driver" | "distractor" }
  ],
  "intercept": <number>,
  "terms": [
    { "kind": "linear", "var": "driver_name", "beta": <nonzero number> },
    { "kind": "transform", "var": "driver_name", "fn": "log" | "sqrt" | "square", "beta": <nonzero number> },
    { "kind": "interaction", "vars": ["driver_a", "driver_b"], "beta": <nonzero number> }
  ],
  "correlations": [ { "a": "name", "b": "name", "rho": <between -0.8 and 0.8> } ],
  "noiseSd": <positive number>
}
dist forms: {"kind":"normal","mean":N,"sd":N} | {"kind":"lognormal","mean":N,"sd":N} (mean/sd are of the underlying normal; always positive) | {"kind":"uniform","min":N,"max":N} | {"kind":"binary","p":N}

HARD RULES (a violation makes the puzzle unfair or impossible):
- 6 to 9 predictor variables, all names unique snake_case, distinct from the outcome name.
- Include at least 2 distractors. Every driver must appear in at least one term; distractors must appear in NO term.
- terms may only reference variables whose role is "driver".
- Any variable used inside log() or sqrt() MUST be strictly positive — give it dist lognormal, or uniform with min>0.
- Interactions should be between two drivers (a binary x continuous interaction is ideal for heterogeneity).
- Keep every number realistic for the context and on a sane scale.
- Keep coefficients readable: avoid |beta| < 0.01. If a variable's values (or an interaction's product) are large in magnitude, give that variable a smaller-scale distribution rather than compensating with a microscopic coefficient, so no term's coefficient would round to zero when displayed.

DIFFICULTY = ${input.difficulty}:
${easy
  ? "- 2-3 true terms, all linear (at most one simple interaction). Large signal: choose betas so the model R^2 lands around 0.70-0.85 given noiseSd. Predictor correlations few and small (|rho| <= 0.25). The right answer should be discoverable with basic correlations and one multiple regression."
  : "- 3-4 true terms including at LEAST one nonlinear term (log or sqrt) and at LEAST one interaction. Smaller signal: R^2 around 0.35-0.55. Give 2-3 distractors a correlation of 0.4-0.7 with a driver so they show up as spuriously significant until the driver is controlled for. Subtle, rewards careful work (binscatter to spot curvature, checking predictor correlations for confounding)."}`;
  const user = `CONTEXT: ${input.context}\nDIFFICULTY: ${input.difficulty}\nInvent a fresh, specific scenario for this context (not a generic template). Vary the variables and the true model from run to run.`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: easy ? 0.8 : 0.95, maxTokens: 2000 });
  return extractJson(raw);
}

// Regression Detective — qualitative feedback on the student's reasoning, on top
// of the objective score. It is shown the true model (the answer), the student's
// submitted model, their write-up, and the computed score breakdown.
export async function regressionFeedbackAI(input: {
  context: string;
  scenario: string;
  trueModel: string;
  studentModel: string;
  writeup: string;
  breakdown: { score: number; correct: string[]; missed: string[]; extra: { label: string; why: string }[] };
}): Promise<any> {
  const system = `You are a warm but rigorous econometrics professor giving feedback on a student's attempt to recover the TRUE data-generating process from a dataset. You already know the answer and an objective score has already been computed; do not re-grade the number. Give specific, teaching feedback on their PROCESS and REASONING. Refer to the actual variables and forms. Do not use em dashes.

Return STRICT JSON only:
{
  "headline": "one sentence overall read of how they did",
  "strengths": ["1-3 specific things they got right, referencing their model or write-up"],
  "gaps": ["1-3 substantive misses tied to the true model, e.g. 'you missed that commute enters as log(distance) - the effect flattens out, which a binscatter would have revealed'"],
  "process_tips": ["1-3 concrete console moves that would have helped, e.g. 'binscatter y against each predictor to spot curvature', 'check cor() among predictors before trusting a single regression'"],
  "one_thing": "the single most important lesson from this challenge, in one or two sentences"
}`;
  const b = input.breakdown;
  const user = `CONTEXT: ${input.context}
SCENARIO: ${input.scenario}
TRUE MODEL (the answer): ${input.trueModel}
STUDENT'S SUBMITTED MODEL: ${input.studentModel}
OBJECTIVE RESULT: score ${b.score}/100; recovered terms: ${b.correct.join(", ") || "none"}; missed terms: ${b.missed.join(", ") || "none"}; junk terms included: ${b.extra.map((e) => `${e.label} (${e.why})`).join(", ") || "none"}.
STUDENT'S WRITE-UP:
${(input.writeup || "(no write-up provided)").slice(0, 4000)}`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: 0.5, maxTokens: 1400 });
  return extractJson(raw);
}

// Star Hire — invent a hiring scenario grounded in human capital theory. The AI
// owns realism (a firm, a role, and a slate of candidates whose observable
// records look strong); CODE owns the truth (portable vs. non-portable capital)
// and grades against it. No case-study references; pure human-capital theory.
export async function starHireScenarioAI(input: { context: string; difficulty: "easy" | "hard" }): Promise<any> {
  const easy = input.difficulty === "easy";
  const system = `You design hiring puzzles for a strategy course built on HUMAN CAPITAL THEORY. Invent a firm, an open role, and EXACTLY 4 candidates. Every candidate's OBSERVABLE record looks strong; the hidden truth is how much of their success is PORTABLE human capital versus stuck to their old context. Do not reference any real case study, company, or HBS material. Do not use em dashes.

Four TRANSFERABLE human-capital types the role weights:
- general: broadly transferable skills (analysis, communication, judgment)
- strategic: skills aligned with THIS firm's strategy and long-term goals
- industry: industry-specific expertise
- relationship: social capital, networks, client relationships
Two things that do NOT transfer with the person: company-specific human capital (knowledge of the OLD firm's culture/processes) and the firm effect (the old firm's platform, brand, team, and resources that inflated their results).

Return STRICT JSON only:
{
  "firm": { "name": "...", "sector": "...", "oneLiner": "one line on the firm" },
  "role": { "title": "...", "brief": "2-4 sentences: the strategic objective of this seat and what success looks like" },
  "roleWeights": { "general": 0-1, "strategic": 0-1, "industry": 0-1, "relationship": 0-1 },
  "principle": "the human-capital lesson this scenario teaches, 1-2 sentences",
  "candidates": [
    {
      "id": "kebab", "name": "realistic fictional name",
      "headline": "one impressive line",
      "resume": ["3-5 track-record bullets: rankings, wins, tenure, current employer, awards"],
      "ask": "compensation expectation, phrased naturally",
      "archetype": "star_trap" | "best_fit" | "solid" | "specialist" | "internal" | "journeyman",
      "hc": { "general": 0-100, "strategic": 0-100, "industry": 0-100, "relationship": 0-100 },
      "companyPrior": 0-100, "firmEffect": 0-100, "portableFraction": 0-1,
      "matchEffect": -30..30, "wage": number (same scale across candidates), "tailRisk": 0-1,
      "observedRating": 0-100,
      "tell": "the single diagnostic fact a sharp question would surface",
      "probes": [ { "q": "a diagnostic question", "value": "high" | "med" | "low" } ]
    }
  ]
}

Structure rules (a violation makes the puzzle unfair):
- EXACTLY 4 candidates, each a DISTINCT archetype, built around real hiring tensions (portability, fit, tail risk, loyalty, potential vs history).
- EXACTLY ONE "star_trap": the flashiest resume (observedRating 85-95) whose success is mostly NON-portable (high firmEffect and/or companyPrior, portableFraction 0.2-0.4, only moderate portable hc), usually a high wage. Their TRUE value must NOT be the highest.
- EXACTLY ONE "best_fit": a more modest resume (observedRating 55-72) but portable hc strongly aligned with roleWeights, positive matchEffect, sensible wage, low tailRisk. Their TRUE value must be the HIGHEST.
- The value model grades on: sum(roleWeights * hc) + matchEffect - wagePenalty - tailRisk*45. Set the numbers so best_fit clearly beats star_trap on this, while star_trap looks better on paper.
- The other two: a mix (a specialist strong in ONE hc type the role only partly needs; an internal candidate with high companyPrior + matchEffect but thin experience; or a journeyman job-hopper with a loyalty/consistency tail risk).
- Give each candidate 3-5 probes: questions that would surface the truth (attributing past wins to self vs firm/team/market, fit with this firm's strategy and culture, why they are really leaving, references, consistency, tail-risk signals). Mark the most revealing "high".

DIFFICULTY = ${input.difficulty}:
${easy
  ? "- Make the star_trap obviously context-boosted and the best_fit clearly the top value. Concentrate roleWeights on one or two HC types so fit is easy to reason about. Moderate wages and tail risks."
  : "- Make the star_trap very seductive (huge observedRating, a plausible portability story) and the best_fit only modestly ahead. Add a strong specialist distractor whose one great HC type is NOT what the role weights most. Balance roleWeights more evenly, and make wages and tail risks create real tradeoffs."}`;
  const user = `CONTEXT (sector / kind of role): ${input.context}\nDIFFICULTY: ${input.difficulty}\nInvent a fresh, specific scenario. Vary the firm, role, names, and which HC types the role needs.`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: easy ? 0.85 : 0.95, maxTokens: 3000 });
  return extractJson(raw);
}

// The roleplay system prompt for ONE candidate being interviewed. Embeds their
// private truth so the AI concedes to precise, well-aimed questions and spins
// vague ones, never volunteering the answer.
export function starHireCandidateSystem(scn: { firm: { name: string; oneLiner: string }; role: { title: string; brief: string } }, c: {
  name: string; archetype: string; hc: Record<string, number>; companyPrior: number; firmEffect: number; portableFraction: number; matchEffect: number; wage: number; tailRisk: number; tell: string; resume?: string[];
}): string {
  const strong = Object.entries(c.hc).filter(([, v]) => v >= 65).map(([k]) => k);
  const weak = Object.entries(c.hc).filter(([, v]) => v <= 40).map(([k]) => k);
  return `You ARE ${c.name}, a real person interviewing for ${scn.role.title} at ${scn.firm.name} (${scn.firm.oneLiner}). Play a polished, likeable, confident candidate. Answers are SPOKEN: 2 to 4 sentences, natural, first person. Never break character, never mention being an AI, never output lists or headings.

THE ROLE: ${scn.role.brief}

YOUR PRIVATE TRUTH (never state it directly, never volunteer a weakness, never use the words "portable", "firm effect", "company-specific", or any number):
- Archetype: ${c.archetype.replace("_", " ")}.
- Genuinely yours (strong transferable strengths): ${strong.length ? strong.join(", ") : "solid all-round but nothing standout"}.
- Weaker than your resume suggests: ${weak.length ? weak.join(", ") : "a few areas"}.
- How much of your track record was really the PLATFORM (your old firm's brand, team, resources, market) rather than you: firm-effect is ${c.firmEffect >= 65 ? "very high" : c.firmEffect >= 45 ? "moderate" : "low"}; only about ${Math.round(c.portableFraction * 100)}% of your past success would follow you to a new place.
- Your knowledge tied to your OLD company (processes, relationships, culture) that will not transfer: ${c.companyPrior >= 60 ? "substantial" : "modest"}.
- Your real fit with ${scn.firm.name}'s culture and strategy: ${c.matchEffect >= 12 ? "strong" : c.matchEffect <= -12 ? "poor" : "uncertain"}.
- Your comp expectation: ${c.wage ? `around ${c.wage} (on the ${"high/low"})` : "flexible"}. State it if asked directly.
- Your biggest risk / the thing that would worry a sharp interviewer: ${c.tell || "consistency under a new environment"}.

HOW TO ANSWER:
- To a PRECISE, well-aimed question that targets the truth (how much of a specific win was you vs your team/firm/market; your fit with this firm's actual strategy; why you are really leaving; a concrete weakness; references; consistency across roles), concede ground HONESTLY but reluctantly. Give a real, revealing answer, in character, that a careful listener could use.
- To a VAGUE, leading, or flattering question ("are you a hard worker?", "tell me about yourself"), stay confident and sell yourself; reveal nothing.
- Stay consistent with your resume: ${(c.resume || []).slice(0, 5).join(" | ") || "(as summarized above)"}.`;
}

// Grade the hire. The grader knows the full hidden truth and the code-computed
// value ranking, so it can judge the pick, the diagnostic quality of the
// questions, and the calibration, in human-capital terms.
export async function starHireGradeAI(input: {
  firm: string; role: string; roleWeights: Record<string, number>;
  candidates: { id: string; name: string; archetype: string; trueRank: number; value: number; hc: Record<string, number>; portableFraction: number; firmEffect: number; companyPrior: number; matchEffect: number; wage: number; tailRisk: number; observedRating: number; tell: string }[];
  bestId: string; decisionScore: number;
  pick: { id: string; name: string; confidence: number; flip: string };
  transcripts: string; principle: string;
}): Promise<any> {
  const roster = input.candidates
    .map((c) => `- ${c.name} [${c.id}] archetype=${c.archetype} TRUE_RANK=${c.trueRank} value=${c.value.toFixed(1)} looksLike=${c.observedRating}/100 portable=${Math.round(c.portableFraction * 100)}% firmEffect=${c.firmEffect} companyPrior=${c.companyPrior} match=${c.matchEffect} wage=${c.wage} tailRisk=${c.tailRisk.toFixed(2)} hc(g/s/i/r)=${c.hc.general}/${c.hc.strategic}/${c.hc.industry}/${c.hc.relationship}; tell: ${c.tell}`)
    .join("\n");
  const system = `You are a rigorous strategy professor grading a student's HIRE, in the language of HUMAN CAPITAL THEORY (portable vs non-portable capital, firm effect, match effect, selection vs treatment, tail risk). You know the full hidden truth and the code-computed true-value ranking. The objective decision score is already computed; do not restate it as the headline. Judge the QUALITY of their questions and reasoning and the CALIBRATION of their confidence. The single most important idea: the flashiest record is often the least portable, so the right hire is the best FIT for this role's specific human-capital needs, not the biggest name. Do not use em dashes.

Return STRICT JSON only:
{
  "headline": "one sentence read of their hire",
  "best_hire": { "id": "...", "name": "..." },
  "your_pick": { "read": "1-2 sentences on why their pick was or was not the best value, in HC terms" },
  "calibration": "well-calibrated" | "overconfident" | "underconfident",
  "calibration_note": "one sentence weighing their confidence against what their questions actually justified",
  "question_quality": { "score": 0-100, "note": "did they probe attribution/portability/fit/tail-risk, or ask surface questions? reference specific questions" },
  "candidates": [ { "id": "...", "name": "...", "archetype": "...", "reveal": "the true story: what was genuinely theirs vs borrowed from their old platform, and their real fit here" } ],
  "best_question_missed": "the single highest-value question they never asked any candidate, and what it would have surfaced",
  "principle": "the lesson, two sentences"
}
"candidates" must include ALL candidates from the roster, in true-rank order (best first).`;
  const user = `FIRM: ${input.firm}
ROLE: ${input.role}
ROLE HC WEIGHTS (importance): general ${input.roleWeights.general?.toFixed(2)}, strategic ${input.roleWeights.strategic?.toFixed(2)}, industry ${input.roleWeights.industry?.toFixed(2)}, relationship ${input.roleWeights.relationship?.toFixed(2)}
THE TRUE BEST HIRE (highest value): ${input.bestId}
CANDIDATES (hidden truth):
${roster}

THE STUDENT HIRED: ${input.pick.name} [${input.pick.id}] at confidence ${input.pick.confidence}%. Objective decision score: ${input.decisionScore}/100.
"The one fact that would change my mind": ${JSON.stringify(input.pick.flip || "")}

INTERVIEW TRANSCRIPTS (the questions they asked each candidate):
${(input.transcripts || "(no questions asked)").slice(0, 9000)}`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: 0.4, maxTokens: 2200 });
  return extractJson(raw);
}

// The Hot Seat examiner: the student played the CEO. Grade whether they stayed
// truthful and non-misleading under pressure (the legal line), how well they
// hedged versus over-disclosed or stonewalled, and their composure. The grader
// knows the private truth the CEO had, so it can flag any false or materially
// misleading statement. Fast model, json.
export async function hotSeatReportAI(input: {
  scenario: { truth: string; narrative: string };
  transcript: string;
}): Promise<any> {
  const s = input.scenario;
  const system = `You are a securities-disclosure coach grading how a CEO handled a hostile earnings call. The person you are grading played the CEO. You know the private truth of the company that the CEO knew going in, so you can judge whether each of their statements was true, misleading, or a defensible hedge. Do not use em dashes anywhere.

THE PRIVATE TRUTH THE CEO KNEW: ${s.narrative}

THE STANDARD YOU GRADE AGAINST:
- A CEO must never say anything factually false, and must never create a materially false impression through a half-truth or a misleading omission. Both are securities fraud. These are the gravest errors.
- A CEO is NOT required to volunteer damaging specifics. Declining to quantify, or reframing truthfully, is legitimate.
- But stonewalling everything or being vague when the truth is favorable is also a failure: it destroys credibility and lets a false narrative stand.
- Over-disclosing a damaging specific that was not required, or blurting a confession, is a needless self-inflicted wound.
- The best answers are truthful, appropriately hedged, specific where the facts help, and composed.

Judge each CEO answer against the private truth. A "false" flag means it contradicts the truth. A "misleading" flag means it is literally true but engineered to create a false impression (this still counts as fraud). "overshare" means they needlessly volunteered damaging specifics. "stonewall" means they hid behind non-answers where candor was safe and expected.

Return STRICT JSON only, no prose outside it:
{
  "survived": true,
  "headline": "one-sentence verdict on how the call went",
  "legal_risk": "low" | "medium" | "high",
  "truthfulness": 0,
  "poise": 0,
  "flags": [ { "severity": "false" | "misleading" | "overshare" | "stonewall", "quote": "what the CEO said, trimmed", "note": "one line on why it is a problem" } ],
  "best_moment": { "quote": "their strongest answer, trimmed", "note": "why it worked" },
  "worst_moment": { "quote": "their riskiest answer, trimmed", "note": "why it was risky" },
  "analyst_read": "one or two sentences on how the analyst likely left the call: reassured, still suspicious, or smelling blood",
  "coaching": "two or three sentences on how a skilled CEO would have handled the single hardest moment truthfully",
  "principle": "two sentences on the transferable skill: you can protect the company only within the truth, and the line between a legitimate hedge and a misleading half-truth is the whole game"
}
truthfulness (0 to 100) is high only if there were no false or misleading statements. poise (0 to 100) rewards composure, specificity where the truth allowed it, and not being rattled into a lie or a confession. legal_risk is high if there is any false or misleading flag.`;

  const user = `THE TRANSCRIPT (the analyst, Maya Chen, and the CEO played by the student):
${(input.transcript || "(no exchange)").slice(0, 9000)}`;

  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: 0.4, maxTokens: 2400 });
  return extractJson(raw);
}

// The Number (team capstone) grader. The deterministic facts (target, legality,
// detection, value destroyed) are computed by lib/capstone and passed in; the
// AI grades the softer dimensions (reading the mosaic, judgment under pressure,
// the analyst call) and writes the reckoning. Fast model, json.
export async function capstoneReportAI(input: {
  facts: {
    gapCents: number; centsAchieved: number; hitsTarget: boolean; indicted: boolean;
    illegalUsed: string[]; detection: number; valueDestroyed: number;
    picked: { label: string; cents: number; detection: number; valueDestroyed: number; future: string; legal: boolean }[];
  };
  notes: { role: string; note: string }[];
  transcript: string;
}): Promise<any> {
  const f = input.facts;
  const levers = f.picked.map((l) => `- ${l.label} (+${l.cents}c, visibility ${l.detection}/3, destroys ~$${l.valueDestroyed}M)${l.legal ? "" : " [ILLEGAL]"}. Comes due: ${l.future}`).join("\n");
  const notes = input.notes.filter((n) => n.note?.trim()).map((n) => `- ${n.role}: ${n.note}`).join("\n") || "(no analysis notes recorded)";

  const system = `You are the professor grading a team capstone in financial reporting. Four students ran a CFO's office and had to close a gap to analyst consensus using earnings management. You are grading how well they read an unstructured data mosaic, whether they stayed legal, whether the market would catch them, and whether they understood that hitting the number destroyed long-term value. Do not use em dashes anywhere.

THE VERDICT-DETERMINING FACTS (already computed, treat as ground truth):
- Gap to close: ${f.gapCents} cents. Cents they assembled: ${f.centsAchieved}. Hit consensus: ${f.hitsTarget ? "YES" : "NO"}.
- Crossed into fraud: ${f.indicted ? "YES, indicted. This is a catastrophic failure of the exercise: " + f.illegalUsed.join(", ") : "No. They stayed within legal earnings management."}
- Detection risk score: ${f.detection} (higher is worse; a score above ~8 means loud, concentrated, easily-caught levers).
- Long-term value destroyed by their legal choices: about $${f.valueDestroyed}M.

THE LEVERS THEY PULLED:
${levers}

THEIR ANALYSIS NOTES BY ROLE (how they read the data mosaic):
${notes}

THE ANALYST CALL TRANSCRIPT (they defended the quarter to a forensic analyst):
${(input.transcript || "(no call took place)").slice(0, 6000)}

GRADING GUIDANCE:
- mosaic score: did their notes show they found the actually-available levers in the data and sized them sensibly, versus guessing or leaning on one obvious lever? Reward distributed, evidence-based analysis.
- detection_evasion score: given their detection risk and how they handled the call, would the market have caught the management? A high detection score plus a rattled or evasive call means low evasion.
- value_preservation score: for the cents they needed, how little long-term value did they destroy? Hitting the target with quiet, low-cost levers scores high; leaning on channel loading, cutting R&D, or overproduction scores low.
- judgment score: did they resist the illegal shortcut and reason about the tradeoff, or chase cents? Being indicted floors this.
- market_verdict: "clean" (beat looks real), "suspected" (analyst smells something), or "caught" (the manipulation is exposed).

Return STRICT JSON only, no prose outside it:
{
  "headline": "one-sentence verdict on the team's quarter",
  "hit_target": ${f.hitsTarget},
  "indicted": ${f.indicted},
  "market_verdict": "clean" | "suspected" | "caught",
  "scores": { "mosaic": 0, "detection_evasion": 0, "value_preservation": 0, "judgment": 0 },
  "analyst_read": "one or two sentences on how the analyst left the call",
  "flags": [ { "severity": "fraud" | "risky" | "tell", "quote": "a plan choice or call answer worth flagging", "note": "why it is a problem" } ],
  "reckoning": [ { "when": "Next quarter" | "Two quarters out" | "One year out" | "Two years out", "event": "the specific consequence of a lever they pulled, drawn from 'comes due' above" } ],
  "value_destroyed_note": "one or two sentences naming the total value destroyed to buy this quarter and the single most damaging choice",
  "principle": "two sentences: earnings management is feasible within rules that cannot stop it, it buys the quarter, and it destroys long-term value. Real CFOs admit doing exactly this."
}
Order the reckoning timeline from soonest to latest, one entry per meaningful lever they pulled. If they were indicted, say so plainly in the headline and floor the judgment score.`;

  const raw = await complete([{ role: "system", content: system }], { json: true, temperature: 0.4, maxTokens: 2600 });
  return extractJson(raw);
}

// Cross-team synthesis for the instructor: reads every team's plan and outcome
// in a cohort run and surfaces the range of strategies, what separated the good
// from the caught, the common mistakes, and the collective learning.
export async function capstoneCohortAI(input: {
  teams: { code: string; members: string[]; levers: string[]; cents: number; hit: boolean; indicted: boolean; detection: number; valueDestroyed: number; marketVerdict: string }[];
}): Promise<any> {
  const teams = input.teams.map((tm) =>
    `- Team ${tm.code} (${tm.members.join(", ") || "unnamed"}): ${tm.hit ? "hit" : "missed"} the number${tm.indicted ? ", INDICTED" : ""}, market ${tm.marketVerdict || "n/a"}, detection ${tm.detection}, ~$${tm.valueDestroyed}M destroyed. Levers: ${tm.levers.join("; ") || "none"}.`
  ).join("\n");

  const system = `You are the professor debriefing a cohort that just ran a team earnings-management capstone. Every team faced the same company and the same gap to consensus, but chose different levers. Read all the teams below and synthesize the cohort, so the instructor can teach the differences. Do not use em dashes anywhere.

WHAT THE TEACHING POINT IS: earnings management is feasible within the rules, buys the quarter, and destroys long-term value. Good teams hit the number quietly with low-detection, low-destruction levers and stayed legal; weak teams leaned on loud, destructive levers (channel loading, cutting R&D, overproduction) or crossed into fraud.

THE TEAMS:
${teams}

Return STRICT JSON only, no prose outside it:
{
  "overview": "two sentences on the spread of outcomes across the cohort",
  "strategies": [ { "label": "a short name for an approach cluster", "teams": ["codes that took it"], "gist": "one sentence on the approach and how it fared" } ],
  "what_worked": "two sentences on what the strongest teams did differently",
  "common_mistakes": "two sentences on the recurring errors across teams (over-reliance on a loud lever, under-reserving, crossing the line, overshooting consensus)",
  "aha": "two sentences: the collective learning to leave the room with, tied to the teaching point"
}
Cluster the teams into 2 to 4 strategy groups. Name the clusters in plain language (for example 'Quiet accruals', 'Real-activities heavy', 'Crossed the line').`;

  const raw = await complete([{ role: "system", content: system }], { json: true, temperature: 0.45, maxTokens: 2000 });
  return extractJson(raw);
}

// Showcase: synthesize the audience feedback for one presentation into a report
// the presenter can take away. Fast model, json.
export async function showcaseReportAI(input: {
  sessionTitle: string;
  itemTitle: string;
  presenter?: string;
  feedback: { name?: string; text: string; rating?: number | null }[];
}): Promise<any> {
  const ratings = input.feedback.map((f) => f.rating).filter((r): r is number => typeof r === "number" && r > 0);
  const avg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
  const lines = input.feedback.map((f) => `- ${f.name || "Anonymous"}${typeof f.rating === "number" && f.rating > 0 ? ` (${f.rating}/5)` : ""}: ${f.text}`).join("\n").slice(0, 8000);

  const system = `You are synthesizing anonymous audience feedback for a presenter, so they can improve. Be warm, specific, and honest. Ground every point in what people actually said. Do not invent feedback. Do not use em dashes.

The session: "${input.sessionTitle || "Showcase"}". The presentation: "${input.itemTitle}"${input.presenter ? ` by ${input.presenter}` : ""}.
Average rating: ${avg !== null ? `${avg} of 5 across ${ratings.length} ratings` : "no numeric ratings given"}.

THE FEEDBACK:
${lines || "(no feedback was submitted)"}

Return STRICT JSON only, no prose outside it:
{
  "headline": "one warm, honest sentence capturing the overall reception",
  "strengths": ["what landed well, grounded in the comments"],
  "suggestions": ["the most useful, actionable improvements the audience raised"],
  "themes": [ { "label": "a short theme name", "gist": "one sentence on what people said about it" } ],
  "standouts": [ { "quote": "a representative or striking comment, lightly trimmed", "name": "the commenter if given, else empty" } ],
  "encouragement": "one genuine, encouraging closing line for the presenter"
}
Keep strengths and suggestions to the 2 to 4 that matter most. If there was almost no feedback, say so honestly in the headline and keep the rest short.`;

  const raw = await complete([{ role: "system", content: system }], { json: true, temperature: 0.5, maxTokens: 1800 });
  const report = extractJson(raw);
  if (report && typeof report === "object") { report.avg_rating = avg; report.rating_count = ratings.length; report.feedback_count = input.feedback.length; }
  return report;
}

// ---- Publication Pipeline --------------------------------------------------
// Interpret the simulated numbers into a candid, human pipeline strategy. The
// math is done client-side; the AI only advises on it.
export async function pipelineAdviceAI(input: {
  inputs: any;
  result: any;
  context?: string;
}): Promise<any> {
  const i = input.inputs || {};
  const r = input.result || {};
  const facts = `Their situation: wants ${i.target} publications in ${i.years} years; starts about ${i.pace} papers/year; paper strength "${i.quality}"; will try up to ${i.maxJournals} journals before killing a paper; each review cycle ~${i.cycleMonths} months.
Simulated numbers: single-journal acceptance ${Math.round((r.singleJournal || 0) * 100)}%; probability a paper ever lands (within ${i.maxJournals} journals) ${Math.round((r.everPublished || 0) * 100)}%; papers they must WRITE to bank ${i.target} ≈ ${r.papersToWrite}; average submissions per paper ${Number(r.avgSubmissions || 0).toFixed(1)}; ~${Math.round(r.monthsPerPaper || 0)} months in review per paper; keep ~${r.inFlight} in flight at once; pace needed ${Number(r.paceNeeded || 0).toFixed(1)}/year vs their ${i.pace}/year (${r.onTrack ? "on track" : "behind"}).`;

  const system = `You are a candid, been-there advisor on academic publishing, in the spirit of Sharique Hasan's "Topics in Strategy" lecture. The core lesson is counterintuitive and you must land it: at a 3-to-5% acceptance rate, you CANNOT out-write the odds. Writing more papers does not build a portfolio; raising the PROBABILITY each paper gets in does — and that means convincing reviewers. Volume barely moves the math; reviewer conviction moves it a lot.

Given their situation and the simulated numbers, give a short, honest, specific strategy centered on RAISING their per-paper odds, not on writing faster. Do not restate every number; interpret them. Point toward what makes reviewers champion a paper (clarity of the contribution, a convincing identification/mechanism, anticipating objections, journal fit), teeing up the next step: learning what reviewers look for. Be direct without being discouraging. No hedging, no platitudes.

Return STRICT JSON only, no prose outside it:
{
  "reality": "2-3 sentences: what their numbers mean, and why volume is not the lever for them specifically",
  "moves": ["3-4 concrete moves that RAISE the probability a paper gets in (convince reviewers, choose the right journal, handle R&Rs well) — not 'write more'"],
  "watchout": "the trap: mistaking activity (more submissions) for progress (higher acceptance odds)"
}`;

  const raw = await complete(
    [
      { role: "system", content: system },
      { role: "user", content: `${facts}${input.context ? `\n\nThey added: ${input.context}` : ""}` },
    ],
    { json: true, temperature: 0.5, maxTokens: 1600 },
  );
  return extractJson(raw);
}

// ---- Understand a Paper ----------------------------------------------------
// Deconstruct a real paper through the four frameworks the research modules
// teach: the idea (invisible force), the hourglass structure, the five points,
// and the key interaction. Used as a worked example / reading exercise.
export async function paperStudyAI(input: { paper: string; context?: string }): Promise<any> {
  const paper = String(input.paper || "").slice(0, 14000);
  const system = `You are a masterful research mentor deconstructing an academic paper for a PhD student, using Sharique Hasan's frameworks from "Research, Strategy". Read the provided paper text (title/abstract/intro, and more if given) and reverse-engineer it through four lenses. Ground EVERY claim in what the paper actually says; if the text is thin on a lens, infer carefully and say so briefly rather than inventing specifics.

The four lenses:
1) THE IDEA — the invisible force it makes visible; whether it ESTABLISHES A NEW FACT or EXPLAINS A KNOWN one; and the one-sentence insight (why the facts are what they are).
2) THE HOURGLASS — motivation, problem, approach, findings, contribution.
3) THE FIVE POINTS — the five intro topic sentences (it matters; the alternative view; the evidence; the finding; why it matters), one sharp assertable claim each.
4) THE INTERACTION — if the paper has a key moderation/contingency, read it as Y = b0 + b1 X1 + b2 X2 + b3 (X1 x X2): name Y, X1, X2, whether the effect is stronger (especially) or weaker (except) with X2, and the mechanism (the BECAUSE). If there is no clear interaction, say what the main effect is and note that the contribution is a main effect, not a moderation.

Return STRICT JSON only, no prose outside it:
{
  "title": "the paper's title as best you can read it",
  "idea": { "invisibleForce": "...", "kind": "new fact" | "explains a known fact", "insight": "one sharp sentence" },
  "hourglass": { "motivation": "...", "problem": "...", "approach": "...", "findings": "...", "contribution": "..." },
  "points": ["five topic sentences, one point each"],
  "interaction": { "hasInteraction": true | false, "y": "...", "x1": "...", "x2": "...", "direction": "especially" | "except" | "n/a", "mechanism": "...", "mainEffectNote": "if no interaction, what the main effect is" },
  "takeaway": "one sentence a student should remember about how this paper is built"
}`;

  const raw = await complete(
    [
      { role: "system", content: system },
      { role: "user", content: `PAPER:\n${paper}${input.context ? `\n\nThe student notes: ${input.context}` : ""}` },
    ],
    { json: true, temperature: 0.4, maxTokens: 2600 },
  );
  return extractJson(raw);
}

// ---- The Anatomy of an Idea ------------------------------------------------
// Assemble the idea (IF X then Y, especially/except when Z, because R), assess
// the mechanism, and derive the discriminating test: which OTHER outcomes should
// move if the mechanism is true, versus a rival explanation.
export async function interactionIdeaAI(input: {
  x: string;
  y: string;
  z: string;
  direction: string;
  mechanism?: string;
  model?: string;
  guess?: string;
}): Promise<any> {
  const system = `You help a researcher sharpen a research idea using Sharique Hasan's "Research, Strategy". An idea is: IF X then Y, ESPECIALLY or EXCEPT when Z, BECAUSE R — which is the regression Y = b0 + b1·X + b2·Z + b3·(X·Z), where b3 (the interaction) is usually the contribution and R is the mechanism. A mechanism is only real if it (a) rests on a MODEL of why Z changes X's effect, and (b) makes DISCRIMINATING predictions: other outcomes that should move if the mechanism is true, and would NOT move (or move differently) under a plausible rival mechanism. That is how you test a mechanism.

Be specific to their variables. Do not restate the finding as the mechanism. The additional outcomes must genuinely discriminate — if a rival mechanism predicts the same thing, it is not a good test; find ones that separate them.

Return STRICT JSON only, no prose outside it:
{
  "sentence": "the idea in one clean sentence: If X, then Y, especially/except when Z, because [mechanism]",
  "mechanismRead": "1-2 sentences: is R a real causal story grounded in a model, or a restatement of the finding? What would make it sharper?",
  "rivalMechanism": "one plausible alternative mechanism that could produce the same interaction",
  "additionalOutcomes": [
    { "outcome": "another outcome (a different Y) you could measure", "ifYours": "how it should move if YOUR mechanism is true", "ifRival": "how it would move under the rival mechanism instead" }
  ],
  "scopeCheck": "one sentence on whether Z is a genuine scope condition (changes the effect) or just another main effect",
  "sharper": "a sharpened one-line version of the whole idea"
}
Give 2 to 3 additionalOutcomes.`;

  const dir = input.direction === "except" ? "except (b3 negative: the effect weakens/vanishes when Z)" : "especially (b3 positive: the effect is stronger when Z)";
  const user = `X (main cause): ${input.x}
Y (outcome): ${input.y}
Z (scope condition): ${input.z}
Interaction direction: ${dir}
Mechanism R (their words): ${input.mechanism || "(not given)"}
The model it comes from: ${input.model || "(not given)"}
${input.guess ? `Their guess at what else would move if the mechanism holds: ${input.guess}` : ""}`;

  const raw = await complete(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0.5, maxTokens: 2000 },
  );
  return extractJson(raw);
}

// ---- The Strategy Experiment ----------------------------------------------
// Two calls: draft the 8-part canvas from a rough description, and turn a
// finished canvas into (a) a critique — intervention pattern, Important/
// Interesting/Ambitious/Craft, design warnings — and (b) a realistic data-
// generating process the app then actually simulates. Grounded in the Strategy
// Experiment Canvas (Hasan, Kim & Koning).
const EXPERIMENT_SYSTEM = `You help a strategy researcher design and pressure-test a FIELD EXPERIMENT using the Strategy Experiment Canvas (Sharique Hasan, Hyunjin Kim, Rembrand Koning). A strategy experiment improves the performance of firms/teams/individuals by changing one thing and seeing how the system reacts. It is the regression Y = b0 + b1·T + b2·X + b3·(T·X): T is the treatment, X a pre-treatment moderator, b1 the average treatment effect, b3 the heterogeneous effect (works more or less for whom).

Be concrete and honest. Field-experiment effects are usually MODEST: standardized effects (Cohen's d) are typically 0.1 to 0.5; larger than 0.6 is rare and should be flagged as optimistic. Do not inflate. The six intervention patterns are Training, Information, Incentives, Spillovers, Process, Resource.`;

export async function experimentDraftAI(input: { idea: string }): Promise<any> {
  const system = `${EXPERIMENT_SYSTEM}

From the researcher's rough description, draft the eight canvas parts. Keep each to 1-2 tight sentences, specific to their idea.

CRITICAL: The description will often be rough, short, or vague. That is expected and fine. NEVER ask questions, never ask for more detail, never reply with prose. Make reasonable, specific assumptions to fill any gaps and ALWAYS produce a complete draft of all eight parts. It is a starting point the user will edit, so a confident best-guess draft is exactly what's wanted. Reply with ONLY the JSON object below, nothing else.

Return STRICT JSON only:
{
  "setup": "the phenomenon and why it's interesting/important",
  "subjects": "who/what the subjects are, where, and roughly how many",
  "friction": "the challenge they face in improving performance",
  "insight": "the unique insight about how to address it",
  "solution": "the treatment you'd design",
  "mechanism": "why it works, and when it will and won't",
  "nullComparison": "what the control gets, and why it's a credible comparison",
  "impact": "the behavior/performance that changes, and how you'd measure it"
}`;
  return completeJson(
    [ { role: "system", content: system }, { role: "user", content: `Rough idea:\n${input.idea.slice(0, 1500)}` } ],
    { temperature: 0.6, maxTokens: 900 },
  );
}

export async function experimentDesignAI(input: { canvas: Record<string, string> }): Promise<any> {
  const system = `${EXPERIMENT_SYSTEM}

Read the canvas and return two things: a critique, and a realistic data-generating process the app will SIMULATE (so the numbers must be plausible field-experiment magnitudes, not wishful). Express treatment effects as standardized effects (Cohen's d). Return STRICT JSON only, no prose outside it:
{
  "pattern": "one of: Training | Information | Incentives | Spillovers | Process | Resource",
  "patternWhy": "one sentence on why the treatment fits that pattern",
  "iia": { "important": 1-5, "interesting": 1-5, "ambitious": 1-5, "craft": 1-5, "note": "2-3 sentences of honest critique on Important/Interesting/Ambitious/Craft" },
  "warnings": ["specific design risks: e.g. underpowered N, attrition, weak/confounded null, moderator measured post-treatment, ceiling effects — 2 to 4 items"],
  "dgp": {
    "outcomeName": "the main outcome Y in plain words",
    "outcomeUnit": "short axis unit, e.g. 'rating' or '$k'",
    "baseline": "control-group mean of Y (a number)",
    "sd": "within-group standard deviation of Y (a number > 0)",
    "effectD": "average treatment effect as Cohen's d (0.1-0.5 typical; be honest)",
    "moderatorName": "the pre-treatment moderator X in a few words",
    "moderatorShare": "fraction of subjects who are 'high' on the moderator (0-1)",
    "hetD": "EXTRA effect (in d) for the high-moderator group; can be negative",
    "n": "total sample across both arms (use the canvas number if given, else a realistic default)",
    "attrition": "fraction lost before measurement (0-0.3)",
    "secondary": { "name": "a mechanism/secondary outcome", "unit": "unit", "effectD": "its d" },
    "longTerm": { "name": "a downstream/long-run outcome", "unit": "unit", "effectD": "its d (usually smaller)" }
  }
}`;
  const parts = Object.entries(input.canvas).map(([k, v]) => `${k}: ${v}`).join("\n");
  return completeJson(
    [ { role: "system", content: system }, { role: "user", content: `The canvas:\n${parts.slice(0, 3000)}` } ],
    { temperature: 0.4, maxTokens: 1400 },
  );
}

// ---- Vendor Disclosure review --------------------------------------------
// Scores a vendor's completed disclosure against the framework's minimum-
// transparency bar: per-domain completeness, red/amber flags, and follow-ups.
export async function disclosureReviewAI(input: {
  vendor: string;
  product: string;
  framework: string; // "the HAIP AI Vendor Disclosure Framework" | "a vendor disclosure framework (adapted from HAIP)"
  domains: { key: string; title: string; questions: { key: string; label: string }[] }[];
  responses: Record<string, string>;
}): Promise<any> {
  const body = input.domains
    .map((d) => {
      const qs = d.questions
        .map((q) => `  Q (${q.key}): ${q.label}\n  A: ${(input.responses[q.key] || "").trim() || "[no answer]"}`)
        .join("\n");
      return `## ${d.title} [${d.key}]\n${qs}`;
    })
    .join("\n\n");
  const sys = `You are a rigorous, skeptical vendor-risk reviewer applying ${input.framework}. You assess a vendor's completed disclosure against the framework's "minimum information required for transparency". Judge each answer for whether it actually discloses what the question asks, a vague, evasive, or missing answer is NOT complete. Flag red flags hard: unanswered high-stakes items (secondary data use / IP ownership, liability, exit/data portability, external validation, subgroup bias, regulatory status), refusals to accept liability, claims of owning or training on the buyer's data, or "trust us" answers with no evidence. Output STRICT JSON only, no prose, no code fences.`;
  const user = `Vendor: ${input.vendor || "(unnamed)"}, Product: ${input.product || "(unnamed)"}

DISCLOSURE:
${body.slice(0, 12000)}

Return JSON with EXACTLY these keys:
{
  "score": integer 0–100 (overall disclosure completeness/quality),
  "overall": "2–3 sentences: is this disclosure adequate to make a decision, and the single biggest concern",
  "domains": [ one per domain above, { "key": "<domain key>", "score": integer 0–100, "summary": "1 sentence on what's solid and what's thin" } ],
  "flags": [ up to 8, most severe first, { "severity": "red" | "amber", "topic": "<short label>", "issue": "what's missing or concerning, specific" } ],
  "followups": [ 3–6 specific questions to send back to the vendor to close the biggest gaps ]
}`;
  const raw = await complete(
    [{ role: "system", content: sys }, { role: "user", content: user }],
    { json: true, temperature: 0.3, maxTokens: 3000 }
  );
  return extractJson(raw);
}

// ===========================================================================
// Experiment agent. The LLM ONLY proposes subtle variants and narrates results
// in plain language. It never computes significance, that is done in code
// (lib/experiments.ts). Kept deliberately conservative: small, reversible nudges.
// ===========================================================================

export async function experimentProposeAI(input: {
  flow: string;
  flowLabel: string;
  target?: "interview" | "report";
  goal?: string;
  past?: { hypothesis: string; outcome: string }[];
}): Promise<any> {
  const past = (input.past || []).map((p, i) => `${i + 1}. Tried: ${p.hypothesis} -> ${p.outcome}`).join("\n").slice(0, 3000);
  const isReport = input.target === "report";
  const knob = isReport
    ? `The treatment is a SUBTLE change to how the FINAL REPORT (the write-up the person receives at the end) is WORDED, expressed as a short instruction ("nudge") appended to the report-generation prompt. Think: make the bottom-line more direct, lead with the single biggest takeaway, warmer or more confident phrasing, one vivid concrete detail, a punchier headline. It must NEVER change the substance, the analysis, or add any claim, only the framing and wording. The natural metric here is "shared" (they share or act on the report).`
    : `The treatment is a SUBTLE adjustment to how the AI INTERVIEWER talks, expressed as a short instruction ("nudge") appended to its prompt. Think: a touch warmer opener, reflecting the person's words back a bit more, one more concrete follow-up, a slightly shorter arc. It must NOT change what the flow does or its integrity. Good metrics here are "completion" or "depth".`;
  const system = `You design ONE small, careful A/B experiment to improve engagement in "${input.flowLabel}", NEVER a drastic redesign, always reversible and low-risk.

${knob}

The metric is one of: "completion" (they reach a finished report), "depth" (they answer more questions), "shared" (they share the result). Pick the one that best fits this change.

Return STRICT JSON only:
{
  "name": "a short experiment name",
  "hypothesis": "one sentence: the change, and why it might lift the metric",
  "metric": "completion" | "depth" | "shared",
  "min_per_arm": integer (a sensible required sample size per arm, 80-300),
  "treatmentNudge": "the subtle instruction appended to the ${isReport ? "report" : "interviewer"}'s prompt (1-2 sentences, specific, gentle)",
  "treatmentLabel": "a 2-4 word label for the treatment"
}`;
  const user = `Flow: ${input.flowLabel} (${input.flow}). Experimenting on: ${isReport ? "the final report's wording" : "the interview"}. Goal: ${input.goal || "increase engagement without degrading quality"}.\n\nPast experiments on this flow:\n${past || "(none yet)"}`;
  const raw = await complete([{ role: "system", content: system }, { role: "user", content: user }], { json: true, temperature: 0.8, maxTokens: 700 });
  return extractJson(raw);
}

export async function experimentNarrateAI(input: { name: string; metric: string; analysis: any }): Promise<string> {
  const a = input.analysis || {};
  const arms = (a.arms || []).map((x: any) => `${x.label}: ${(x.rate * 100).toFixed(1)}% (${x.successes}/${x.n})`).join("; ");
  const facts = `Metric: ${input.metric}. Arms: ${arms}. Lift (best vs control): ${a.liftAbs != null ? (a.liftAbs * 100).toFixed(1) + " pts" : "n/a"}. p-value: ${a.pValue != null ? a.pValue.toFixed(3) : "n/a"}. Reached required sample: ${a.reachedSample}. Statistically significant: ${a.significant}. CONCLUSIVE (code's verdict): ${a.conclusive}.`;
  const system = `You explain an A/B experiment's results to a busy facilitator in 2-4 short sentences of plain English. You are given the statistics, which are AUTHORITATIVE, computed in code. NEVER contradict them: if it is not conclusive, do not claim a winner, say what is trending and how much more data is needed. If it is conclusive, state the result and give a clear recommendation (adopt or reject the treatment). No hype, no jargon, no fake certainty.`;
  return complete([{ role: "system", content: system }, { role: "user", content: `Experiment: ${input.name}.\n${facts}` }], { temperature: 0.4, maxTokens: 260 });
}

// ---- Mechanism coder ------------------------------------------------------
// Qualitative mechanism: given a sample of conversations from the adaptive policy
// arm and from the frozen holdout (original prompt), name what CONCRETELY differs
// in how the conversation goes. Grounds the numeric mediation in the transcripts.
export async function mechanismCodeAI(input: { flowLabel: string; policy: string[]; holdout: string[] }): Promise<any> {
  const trim = (xs: string[]) => xs.slice(0, 12).map((t, i) => `--- transcript ${i + 1} ---\n${t}`).join("\n\n").slice(0, 12000);
  const system = `You are a conversation analyst. You are shown two samples of the SAME practice exercise: group A ran under an adjusted prompt (the "policy"), group B under the original prompt (the "holdout"). Identify what CONCRETELY differs in how the conversations go — not whether one is "better". Look at: who drives, question depth and follow-ups, concreteness/specificity, how much the human elaborates, whether they reach commitment or a decision, tone. Ground every point in what is actually visible; if there is no clear difference, say so plainly. Output STRICT JSON only:
{"differences":[{"dimension":"a short label","policy":"what group A does","holdout":"what group B does"}],"mechanism":"one or two sentences: the likely pathway from the prompt change to any change in the conversation","confidence":"low"|"medium"|"high"}. 3-6 differences. No hype, no invented specifics.`;
  const user = `Exercise: ${input.flowLabel}.\n\n=== GROUP A (policy) ===\n${trim(input.policy)}\n\n=== GROUP B (holdout) ===\n${trim(input.holdout)}`;
  const raw = await complete([{ role: "system", content: system }, { role: "user", content: user }], { json: true, temperature: 0.4, maxTokens: 900 });
  return extractJson(raw);
}

// ---------------------------------------------------------------------------
// Cohort synthesis: roll a whole room's paired-exercise work up into a crisp,
// present-back summary for the instructor. Aggregation (pairs, tallies) happens
// in the caller; this narrates the qualitative themes. Runs on the fast model.
// ---------------------------------------------------------------------------
export async function cohortSynthesisAI(input: {
  exercise: string; // "job" | "workflow"
  framework: string; // one line naming the framework to tie learnings back to
  participantCount: number;
  pairCount: number;
  digest: string; // pre-aggregated text of the room's work
}): Promise<{
  headline: string;
  keptHuman: { theme: string; detail: string }[];
  gaveAI: { theme: string; detail: string }[];
  conversationFocus: { theme: string; detail: string }[];
  learnings: { title: string; detail: string }[];
}> {
  const isWorkflow = input.exercise === "workflow" || input.exercise === "workflow-solo";
  const solo = input.pairCount === 0;
  const what = isWorkflow
    ? (solo
        ? "each person mapped one of their real workflows and redesigned it with AI, deciding what a human, AI, or both should own at each step."
        : "pairs mapped a real workflow and redesigned it around what a human, AI, or both should own at each step.")
    : (solo
        ? "each person redesigned their own job with AI, using a 2x4 model: four things AI does well (Search, Structure, Think, Translate) and four only humans do (Lead, Own, Judge, Integrate)."
        : "pairs interviewed each other, then redesigned each other's jobs with a 2x4 model: four things AI does well (Search, Structure, Think, Translate) and four only humans do (Lead, Own, Judge, Integrate).");
  const system = `You synthesize what a COHORT of learners produced in an exercise into a crisp, room-level summary the instructor presents back to the class. Ground every point in the supplied material; never invent specifics. No em dashes; use commas or colons.

The exercise: ${what}
Tie learnings back to this framework: ${input.framework}

Return STRICT JSON only, no prose, no code fences:
{
 "headline": "one vivid sentence on what this room, as a group, did and saw",
 "keptHuman": [{"theme":"3-6 words","detail":"one sentence: what people chose to keep as human work, and why, grounded in the room"}],
 "gaveAI": [{"theme":"3-6 words","detail":"one sentence: what people handed to AI"}],
 "conversationFocus": [{"theme":"3-6 words","detail":"one sentence: what people kept coming back to, or focused on most"}],
 "learnings": [{"title":"3-6 words","detail":"one sentence: a high-level takeaway that ties back to the framework"}]
}
Rules: 3 to 4 items per array, the most common and telling patterns across the WHOLE room (not one person). Concrete, specific to the material below, plainly worded.`;
  const user = `${input.participantCount} participants, ${input.pairCount} pairs.\n\n${(input.digest || "").slice(0, 12000)}`;

  const raw: any = await completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.4, maxTokens: 1600 });
  const pair = (v: any, a: string, b: string) =>
    Array.isArray(v) ? v.slice(0, 4).map((x: any) => ({ [a]: String(x?.[a] || ""), [b]: String(x?.[b] || "") })).filter((x: any) => x[a]) : [];
  return {
    headline: String(raw?.headline || ""),
    keptHuman: pair(raw?.keptHuman, "theme", "detail") as any,
    gaveAI: pair(raw?.gaveAI, "theme", "detail") as any,
    conversationFocus: pair(raw?.conversationFocus, "theme", "detail") as any,
    learnings: pair(raw?.learnings, "title", "detail") as any,
  };
}

// ---------------------------------------------------------------------------
// Live group chat adjudicator. Reads the whole open chat and renders a fair,
// grounded read of it right now: positions, tensions, and a reasoned verdict,
// following the presenter's adjudication instructions. Fast model.
// ---------------------------------------------------------------------------
export async function chatAdjudicateAI(input: {
  topic: string;
  instructions: string;
  messages: { name: string; text: string }[];
}): Promise<{ headline: string; positions: { title: string; detail: string }[]; tensions: { title: string; detail: string }[]; verdict: string }> {
  const transcript = (input.messages || [])
    .slice(-400)
    .map((m) => `${(m.name || "anon").slice(0, 24)}: ${String(m.text || "").slice(0, 300)}`)
    .join("\n")
    .slice(0, 14000);
  const instr = input.instructions?.trim() ? `\n\nThe presenter's adjudication instructions (follow them): ${input.instructions.trim().slice(0, 600)}` : "";
  const system = `You are the live AI adjudicator of a big open group chat in a room. Read the whole thread and render a clear, fair read of it RIGHT NOW, grounded ONLY in what people wrote. Your value is turning a firehose of messages into signal, and adjudicating: naming where the room agrees, where it splits, and giving a reasoned verdict. No em dashes; use commas or colons.

The topic on screen: "${input.topic || "(open)"}".${instr}

Return STRICT JSON only, no prose, no code fences:
{
 "headline": "one present-tense sentence on where the conversation stands",
 "positions": [{"title":"3-6 words","detail":"one sentence: a position or theme the room is voicing, and roughly how widely"}],
 "tensions": [{"title":"3-6 words","detail":"one sentence: a fault line or disagreement in the chat"}],
 "verdict": "2 to 4 sentences: your adjudication, following the presenter's instructions. If asked to judge, pick, or rule, do it and say why, grounded in the chat. Otherwise give a fair synthesis of where the room lands."
}
Rules: at most 4 positions and 3 tensions, the most represented. Ground everything in the messages; do not invent. Specific and plainly worded.`;
  const user = `The chat so far:\n${transcript || "(no messages yet)"}`;
  const raw: any = await completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.4, maxTokens: 1300 });
  const arr = (v: any, n: number) =>
    Array.isArray(v) ? v.slice(0, n).map((x: any) => ({ title: String(x?.title || ""), detail: String(x?.detail || "") })).filter((x: any) => x.title || x.detail) : [];
  return { headline: String(raw?.headline || ""), positions: arr(raw?.positions, 4), tensions: arr(raw?.tensions, 3), verdict: String(raw?.verdict || "") };
}

// ============================================================================
// The Incentive Lab — design a reward system, then watch AI worker-agents game
// it. The main model invents the world; the FAST/low model runs the tournament
// (cheap, many small calls). Code owns the true-value scoring.
// ============================================================================

// Invent the scenario: a firm's true objective, the measurable metrics (one of
// which is deliberately hard to game), and a menu of worker actions with hidden
// true-value effects. There must EXIST a good incentive design to discover.
export async function incentiveScenarioAI(input: { context: string; difficulty: "easy" | "hard" }): Promise<any> {
  const easy = input.difficulty === "easy";
  const system = `You design incentive-gaming puzzles for a strategy course (Goodhart's law, the multitasking principal-agent problem, Wells Fargo). Invent a firm, a frontline role, the firm's TRUE objective, a set of measurable METRICS a manager could reward, and a menu of concrete worker ACTIONS. Some actions create real value, some only inflate metrics (gaming), some inflate a metric while destroying real value (harmful), and some create real value that no metric captures (neglected work). The point: a student will design an incentive, and AI workers will game it. Do not use em dashes.

Return STRICT JSON only:
{
  "firm": { "name": "...", "oneLiner": "..." },
  "role": { "title": "...", "brief": "2-3 sentences: the honest purpose of this job" },
  "trueObjective": "1-2 sentences: what the firm actually wants, in plain terms",
  "metrics": [ { "key": "snake", "label": "...", "unit": "optional" } ],
  "trueDims": [ { "key": "snake", "label": "a dimension of real value", "weight": 0-1 } ],
  "leisure": 15-25,
  "principle": "the lesson this scenario teaches, 1-2 sentences",
  "actions": [
    { "key": "snake", "label": "...", "description": "one line",
      "effort": 0.2-1.0,
      "kind": "productive" | "gaming" | "harmful" | "unmeasured_good",
      "metricEffect": { "<metricKey>": 0-100 },   // per full unit of effort; how the DASHBOARD moves. Workers can see this.
      "valueEffect": { "<trueDimKey>": -100..100 } // per full unit; the HIDDEN true value. gaming ~ 0, harmful negative, productive high.
    }
  ]
}

HARD RULES (a violation makes the puzzle unteachable):
- 3 to 5 metrics. Include AT LEAST ONE "obvious volume metric" (throughput, sales count, tickets closed) that gaming actions inflate cheaply, AND AT LEAST ONE "gaming-resistant quality metric" (an audit score, a verified-outcome rate, a mystery-shopper score) that the PRODUCTIVE actions dominate and gaming actions barely move. The quality metric is the lever a smart designer will find.
- 3 true-value dimensions, weights sum ~1. At least one dimension must be barely captured by any metric (the neglected value).
- 5 to 7 actions: at least 2 productive (real value AND they move the quality metric best), at least 2 gaming (inflate the obvious metrics, near-zero true value), at least 1 harmful (inflates a metric but NEGATIVE on a true dimension), at least 1 unmeasured_good (high true value, almost no metric effect).
- CALIBRATE so both are true: (a) rewarding the obvious metric alone gets gamed to near-zero true value; (b) there EXISTS a design (rewarding the quality metric, possibly with floors) under which the worker's best play yields high true value. The productive action should be the best way to move the quality metric.
- effort: gaming/harmful actions are usually CHEAP (0.2-0.5); productive actions cost more (0.6-1.0). Leisure is the worker's outside option, so cheap gaming that pays well is tempting.

DIFFICULTY = ${input.difficulty}:
${easy
  ? "- One clear gaming-resistant quality metric, 5 actions, gaming is obvious once revealed. The good design is discoverable in a round or two."
  : "- Multiple tempting gaming actions, a quality metric that is only PARTLY gaming-resistant, and a heavily-weighted true dimension that no single metric captures well (so the designer must combine metrics and floors). Subtle."}`;
  const user = `CONTEXT (industry / kind of frontline role): ${input.context}\nDIFFICULTY: ${input.difficulty}\nInvent a fresh, specific scenario. Vary the firm, role, metrics, and actions.`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: easy ? 0.85 : 0.95, maxTokens: 3000 });
  return extractJson(raw);
}

// One worker-agent's move in the tournament. Runs on the FAST/low model. The
// agent sees the incentive rules and each action's effect on the DASHBOARD (not
// the true value), and returns an effort allocation to maximize its own payoff.
export async function incentiveAgentTurn(input: {
  firm: string; role: string; disposition: string; dispositionNote: string; leisure: number;
  rewardRules: string; actionsText: string; currentBest?: string;
}): Promise<any> {
  const system = `You are a frontline worker deciding how to spend your effort to MAXIMIZE YOUR OWN PAY under the incentive plan your manager set. You care about your bonus and your free time, not the company's unstated goals. ${input.dispositionNote} You can see exactly how each action moves the metrics you're paid on. Split one unit of effort across the actions to maximize your reward (plus the value of any effort you don't spend, since your time is worth ${input.leisure} to you). Be cunning: if a cheap action spikes a rewarded metric, exploit it.

Return STRICT JSON only: { "alloc": { "<actionKey>": 0.0-1.0, ... }, "tactic": "one sentence naming your angle in plain, human terms" }
The allocations are the SHARE of your effort on each action; they should not require more effort than you have.`;
  const user = `FIRM: ${input.firm}
ROLE: ${input.role}
YOUR PAY IS DETERMINED BY (the incentive plan): ${input.rewardRules}
YOUR TIME (unspent effort) is worth: ${input.leisure} out of 100.
ACTIONS YOU CAN TAKE (effort cost, and how each moves the metrics you're paid on):
${input.actionsText}
${input.currentBest ? `\nA coworker is currently winning the most pay with this play: ${input.currentBest}\nBeat it if you can.` : ""}`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: 0.7, maxTokens: 500, low: true });
  return extractJson(raw);
}

// Narrate the result: the winning exploit in-character, what real value broke,
// and a nudge toward a better design. Fast model.
export async function incentiveNarrateAI(input: {
  firm: string; role: string; trueObjective: string; designText: string;
  winnerTactic: string; winnerActions: string; reward: number; trueValue: number; pctOfOptimum: number;
  dashboard: string; brokenDims: string; neglected: string; principle: string; firstRun: boolean;
}): Promise<any> {
  const system = `You are a sharp operations professor debriefing a student who just designed an incentive system and watched AI workers game it. Be vivid and specific but concise. Explain, in human terms, how the workers exploited the plan, what real value quietly broke, and nudge the student toward a better design WITHOUT handing them the full answer. Do not use em dashes.

Return STRICT JSON only:
{
  "headline": "one punchy sentence on what happened",
  "exploit_story": "2-3 sentences: how a rational worker gamed this plan, in plain language, naming the moves",
  "what_broke": "1-2 sentences: which parts of the true objective collapsed while the dashboard looked fine",
  "missing_lever": "1-2 sentences nudging toward what a better design would reward or cap, without spelling out the exact weights",
  "coach": "1-2 sentences of direct advice for the redesign",
  "principle": "one sentence lifting the general lesson"
}`;
  const user = `FIRM: ${input.firm}
ROLE: ${input.role}
WHAT THE FIRM ACTUALLY WANTS: ${input.trueObjective}
THE STUDENT'S INCENTIVE DESIGN: ${input.designText}
THE WORKERS' WINNING PLAY: ${input.winnerActions} (their words: "${input.winnerTactic}")
RESULT: the dashboard the manager sees = ${input.dashboard}. But true value delivered = ${input.trueValue}/100 (that is ${input.pctOfOptimum}% of what a good design could get). The worker earned ${input.reward}/100 in pay.
WHAT BROKE (true dimensions that scored low): ${input.brokenDims}
NEGLECTED VALUABLE WORK (no one bothered): ${input.neglected}
${input.firstRun ? "This is their first attempt." : "They are iterating on an earlier design."}
The underlying principle: ${input.principle}`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: 0.5, maxTokens: 700, low: true });
  return extractJson(raw);
}

// ---- Living Case generator -------------------------------------------------
// Drafts an interactive "case genome": decision-first, outcome hidden until the
// reader commits. NEVER invents media (verified videos are added at the gate).
const CASE_SPEC_SHAPE = `Return STRICT JSON only, exactly this shape (no extra keys):
{
 "eyebrow": "3-4 words, e.g. Strategy · supplier power · timing",
 "title": "a vivid, specific hero line (a claim or tension, not a label)",
 "dek": "2-4 sentences setting the scene and the decision, second person, ends by asking the reader to decide. Light markdown allowed.",
 "protagonist": "Name, role. Use a REAL named person only for a public strategic decision; for anything resembling a hidden truth about a real individual, use a clearly-framed composite.",
 "decision": "short phrase, e.g. 'hold the line on price, or don't'",
 "meta": "e.g. '~12 min · 6 sources'",
 "situationBeats": [ { "n":"1", "kicker":"the situation · YEAR or PLACE", "title":"...", "body":"a rich paragraph (120-220 words), light markdown, with inline [source label](https://real-url) links where you cite a real fact", "deeper":[{"label":"a drill-down question a curious reader would click","body":"80-150 words going deeper, may include a [link](https://url)"}], "teach":"one instructor-only sentence on what to teach here" } ],
 "commitPrompt": "the decision question put to the reader, in the protagonist's shoes",
 "commitOptions": [ {"k":"a","label":"short label","blurb":"one sentence on the tradeoff"} ],
 "revealBeats": [ { "n":"4", "kicker":"the reveal · YEAR", "title":"...", "body":"a rich paragraph on what actually happened, honest about luck vs skill", "deeper":[...], "teach":"..." } ],
 "interrogate": [ {"q":"a sharp question a student would ask the protagonist","a":"how the protagonist answers — concede to a sharp one, deflect a vague one"} ],
 "sources": [ {"label":"real publication or org","href":"https://a-real-url-you-are-confident-exists"} ],
 "teachingIntro": "one instructor-only sentence framing the whole case (a theory lens)"
}`;
const CASE_RULES = `Rules:
- Target roughly 2000-2400 words TOTAL across all beat bodies and deeper panels: write 3 situationBeats (the last, 'your move', tees up the decision) and 2 revealBeats, each body ~110-160 words, with a deeper panel on about half the beats. 3 commitOptions, 4-6 sources, 2 interrogate items. CRITICAL: keep it tight enough that the WHOLE JSON completes — the interrogate and sources arrays come last and must NOT be cut off. Never return an empty sources array.
- Ground every factual claim in the real, public record. Do NOT fabricate specific numbers you are unsure of; prefer qualitative truth over invented precision.
- For sources, give REAL URLs you are confident exist (official sites, Wikipedia, major publications). Never invent a fake article URL.
- Do NOT include any video, image, or youtube id — verified media is added later. There are no video fields in the JSON.
- Keep the outcome ENTIRELY inside revealBeats; situationBeats must not spoil it.
- No em dashes. Be concrete; name real people, places, firms.`;

export async function caseGenomeAI(input: { idea: string; decision: string; protagonist?: string; style?: string }): Promise<any> {
  const system = `You are a world-class business-school case writer building an INTERACTIVE "living case", with the narrative craft of a great HBS case but the honesty of a documentary.\n\n${CASE_SPEC_SHAPE}\n\n${CASE_RULES}`;
  const user = `BUSINESS IDEA OR COMPANY: ${input.idea}\nDECISION TO TEACH: ${input.decision}\nPROTAGONIST: ${input.protagonist?.trim() || "(choose a realistic real or composite protagonist)"}${input.style || ""}`;
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.7, maxTokens: 5200, timeoutMs: 90000 });
}

// Grounded variant used by the authoring studio: builds the case from the
// instructor's uploaded materials + brief, and (when provided) real web research.
// This is the path behind the "Living Case" module type.
export async function caseGenomeFromMaterialsAI(input: { intent: string; sourceText?: string; opinion?: "low" | "high"; research?: string; style?: string }): Promise<any> {
  const system = `You are a world-class business-school case writer building an INTERACTIVE "living case" from an instructor's own teaching materials. First infer the CORE IDEA / concept / learning goal the materials are really about, then build a decision-first case that teaches it, with the craft of a great HBS case and the honesty of a documentary.\n\n${CASE_SPEC_SHAPE}\n\n${CASE_RULES}\n- Anchor the case NARRATIVE in the SOURCE MATERIAL: use its situation, facts, names, numbers, and terminology. The learning goal in the brief is the concept the case must teach.\n- IMPORTANT: the "use my materials" constraint governs the narrative, NOT the sources list. You MUST always populate 4-6 sources with real, well-known, verifiable URLs relevant to the topic (official sites, Wikipedia, major publications, trade bodies) even when the uploaded materials contain no links. Citing a real public URL is not inventing. Never leave sources empty.\n- When WEB RESEARCH is provided, prefer its real facts, quotes, and URLs for your sources; cite its links inline in the beats where you use them.`;
  const research = input.research?.trim() ? `\n\nWEB RESEARCH (real results found for this topic — use these facts, quotes, and URLs for the sources list; they are verified):\n${input.research.trim().slice(0, 8000)}` : "";
  // A case-specific source framing (not the verbatim "use my materials" block,
  // which suppresses the required external source URLs). Ground the facts here;
  // the sources list still comes from real public URLs / the web research.
  const src = input.sourceText?.trim() ? `\n\nSOURCE MATERIAL (ground the case's situation, facts, names, and numbers in this; quote and synthesize it, but do not merely transcribe it):\n${input.sourceText.trim().slice(0, 12000)}` : "";
  const user = `LEARNING GOAL / BRIEF:\n${input.intent}${src}${research}${input.style || ""}\n\nWrite the full living case now. Remember: the sources list must contain 4-6 real, verifiable URLs, and the JSON must finish completely.`;
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.65, maxTokens: 6800, timeoutMs: 112000 });
}

// ---- Living Case improvement loop --------------------------------------------
// Turns REAL engagement (completion, the decisions students made, the questions
// they asked the tutor) into concrete, actionable edits for the author. This is
// the observe->improve half of the loop: the case gets better the more it runs.
export async function caseImproveAI(input: { title: string; decision: string; readers: number; completionPct: number; decisions: string; questions: string }): Promise<any> {
  const system = `You are an expert instructional designer reviewing how a live interactive case study actually performed with students, using their real engagement data. Propose specific, high-leverage edits the author could make so the case teaches better next time. Ground every suggestion in the data given; do not invent numbers.

Return STRICT JSON only: { "suggestions": [ { "title": "a short imperative, e.g. Add a drill-down on X", "why": "one sentence citing the specific signal in the data", "action": "one concrete sentence on the edit to make" } ] }
Rules: 3 to 5 suggestions, best first. Look for: low completion (students dropping before the reveal), a lopsided decision split (weak alternatives), and recurring questions (a gap the case should address inline). No em dashes.`;
  const user = `CASE: ${input.title}\nDECISION: ${input.decision}\nENGAGEMENT: ${input.readers} students opened it; ${input.completionPct}% made a call (completion).\nWHAT THEY DECIDED: ${input.decisions || "(no decisions yet)"}\nQUESTIONS THEY ASKED THE TUTOR: ${input.questions || "(none)"}`;
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.5, maxTokens: 900, low: true });
}

// ============================================================================
// Paper Explainer — turn an uploaded academic paper into an interactive, visual
// explainer whose goal is deep conceptual understanding + the ability to teach
// it. Built on Sharique Hasan's "Research, Strategy" frameworks.
// ============================================================================
const PX_SPEC_SHAPE = `Return STRICT JSON with EXACTLY these keys:
{
  "paperTitle": "the paper's real title",
  "authors": "Last names + year, e.g. Gartenberg, Hasan, Murray & Pierce (2026)",
  "venue": "the journal or venue if stated, else empty",
  "title": "a punchy, curiosity-provoking title for the EXPLAINER (not the paper's title) — 3 to 7 words",
  "eyebrow": "3 topic tags joined by ' · ', e.g. AI · peer review · incentives",
  "emoji": "one emoji that fits the idea",
  "dek": "a one-paragraph hook (40-70 words) that makes a non-expert want to know more",
  "bigQuestion": "the single motivating question the paper answers, one line",
  "hook": { "headline": "why anyone should care", "body": "60-90 words making the stakes vivid and concrete" },
  "nullBelief": { "headline": "what everyone assumes", "body": "60-90 words stating the conventional wisdom / null model the paper pushes against — the thing a smart person would believe by default" },
  "puzzle": { "believe": "we believe X (the null, one sentence)", "expect": "if that were true we'd expect to see Z (one sentence)", "observe": "but we actually observe R (the surprising fact, one sentence)" },
  "predicts": [ { "prompt": "a guess-first question about the key finding", "choices": ["3-4 plausible options"], "answer": 0, "reveal": "40-70 words explaining the real answer and why the intuitive guess is wrong" } ],
  "ideaStatement": "the core insight in ONE or TWO plain, vivid sentences a smart non-expert would remember. NO 'IF/THEN/EXCEPT/BECAUSE' scaffolding — write it as natural prose, e.g. 'Cheap AI writing plus publish-or-perish incentives push scientists to produce more papers, not better ones.'",
  "idea": { "if_": "the cause/condition X (a fragment, no 'IF' prefix)", "then_": "the effect Y", "whenZ": "the condition where it's stronger or breaks", "because": "the mechanism, one crisp sentence" },
  "evidence": { "headline": "the key result", "infographic": { "stats": [ { "value": "+42%", "label": "short label, e.g. more submissions since ChatGPT", "tone": "up|down|neutral", "icon": "one emoji" } ], "pictograph": { "total": 10, "filled": 7, "label": "what the filled share represents, e.g. of the growth is AI-generated", "icon": "📄", "tone": "down" }, "caption": "optional one-line note" }, "takeaway": "40-70 words on what the evidence shows" },
  "mechanism": { "headline": "why it happens", "body": "70-110 words on the mechanism / the twist — the deeper 'why' behind the pattern" },
  "soWhat": { "headline": "why it matters", "body": "60-90 words on the implications: what changes, who should act, what we now see differently" },
  "teachBack": { "prompt": "Explain this paper's core idea to <audience> in three sentences.", "audience": "e.g. a smart friend outside your field", "rubric": ["3-5 short criteria a good explanation must hit — the puzzle, the mechanism, the evidence, clarity for a non-expert"] },
  "glossary": [ { "term": "a key term", "def": "a one-line plain-language definition" } ]
}`;
const PX_RULES = `Rules:
- Ground EVERYTHING in the actual paper provided. Use its real numbers, findings, and terms. Do NOT invent statistics; if a precise number isn't in the text, describe the finding qualitatively instead.
- The evidence visual is an INFOGRAPHIC, not a data chart. Use 1-4 big-number STAT callouts, each a real headline number or fact FROM THE PAPER with a short label, a direction 'tone' (up = increase/good, down = decrease/bad, neutral), and one emoji 'icon'. Use the paper's actual numbers (e.g. +42%, -1.28 SD, 3-7% acceptance). Every number must be real; never invent precision.
- The stat 'value' is the BIG headline and must be SHORT: a number, or at most a one-to-two-word phrase (aim for under ~14 characters, e.g. "+42%", "3x", "Lower", "Clustered"). NEVER put a sentence or a long phrase in 'value' — all description and context goes in 'label'. If a finding is purely qualitative, use a short word like "Lower" or "Contiguous" as the value and explain it in the label. Write real words, not truncated ones (e.g. "Much lower", never "Substantial lower").
- Optionally add ONE 'pictograph' to make a single PROPORTION tangible: 'total' icons (2-20) with 'filled' of them shaded to show a share (e.g. total 10, filled 7 for "70% of the growth is AI-generated"). Only include a pictograph when there is a clean real proportion; otherwise omit it.
- Keep the infographic to the few most important numbers. Omit the whole infographic only if the paper genuinely has no quantitative results. Do NOT output a "chart" object.
- Write for an intelligent NON-EXPERT. Entertaining but honest: vivid, plain language, zero jargon that isn't defined in the glossary. Short sentences.
- The whole point is the reader should end able to EXPLAIN the idea. Make the puzzle (violated expectation) and the mechanism unmistakably clear.
- 1 or 2 predicts, best first. The 'answer' is the 0-based index of the correct choice. LOGIC MUST BE AIRTIGHT: the marked answer has to be genuinely, defensibly correct given the paper AND basic reasoning, and every distractor genuinely wrong. Never mark a common-sense-correct option as wrong. Check any quantitative claim: a RATE is a ratio, so if the denominator rises and the numerator does not, the rate FALLS (e.g. if submissions surge but acceptances do not, the acceptance rate goes down, even if editors reject most of the new submissions). The reveal must be consistent with both the paper's findings and the arithmetic, and must explain WHY the intuitive-but-wrong guess is wrong without contradicting itself. A good predict makes the surprising-but-true finding the correct answer and a plausible naive belief the distractor, never the reverse.
- The SETUP of a predict must be internally CONSISTENT: never give the same item two contradictory properties. If a scenario numbers or lists steps/items, each label appears once and each is assigned ONE clear property (e.g. do not write "AI is good at steps 2, 3, and 4 but mediocre at step 2" — the same step cannot be both). Re-read your own premise: if any entity is described two different ways, or the numbering does not line up with the labels, rewrite it before finalizing.
- No em dashes anywhere, including inside JSON string values. CRITICAL: keep the JSON tight enough to finish — glossary comes last and must not be cut off.`;

// Generate the explainer genome from the paper's extracted text.
export async function paperExplainerAI(input: { paperText: string; style?: string }): Promise<any> {
  const system = `You are a brilliant science communicator and teacher building an INTERACTIVE, VISUAL explainer of a single academic paper. Your goal: a curious non-expert reads it in ten minutes, deeply understands the ONE core research idea, and can then explain it clearly to someone else. You deconstruct the paper the way a great researcher would, using this lens: a research idea makes the invisible visible against a NULL (the conventional wisdom); the contribution is usually an INTERACTION (IF X THEN Y, ESPECIALLY or EXCEPT WHEN Z, BECAUSE a mechanism); the PUZZLE is a violated expectation (we believe X, so we'd expect Z, but we observe R).\n\n${PX_SPEC_SHAPE}\n\n${PX_RULES}`;
  const user = `THE PAPER (extracted text; may be truncated):\n${String(input.paperText || "").slice(0, 24000)}${input.style || ""}`;
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.6, maxTokens: 4200, timeoutMs: 95000 });
}

// "Ask the paper" — a grounded companion that answers questions about ONE
// paper, using the explainer context and (when available) the paper's own text.
// Streamed. `context` is built by the route so this stays decoupled from types.
export async function paperxAskReply(context: string, history: { role: "user" | "assistant"; content: string }[], onToken?: (d: string) => void): Promise<string> {
  const system = `You are a sharp, plain-spoken guide helping someone understand ONE specific academic paper. Answer from the PAPER CONTEXT below. Be accurate and honest: explain in plain language, define any jargon, and distinguish what the paper actually shows from your own general knowledge. If the paper does not address something, say so briefly instead of inventing a finding or a number, and never fabricate statistics. Keep answers short (a few sentences) unless asked to go deeper. If a question is off-topic, answer briefly and steer back to the paper.\n\nPAPER CONTEXT:\n${context}`;
  const convo: ChatMsg[] = history.length ? history : [{ role: "user", content: "(What would you like to know about this paper?)" }];
  return complete([{ role: "system", content: system }, ...convo], { temperature: 0.3, maxTokens: 650, onToken });
}

// Grade a learner's teach-back attempt against the paper's core idea.
export async function paperxTeachbackAI(input: { title: string; puzzle: string; idea: string; mechanism: string; audience: string; rubric: string[]; attempt: string }): Promise<any> {
  const system = `You are a warm but exacting teacher evaluating whether someone truly understood a research idea, by judging how they explained it to ${input.audience}. The test of understanding is a clear, honest explanation a non-expert could follow. Be encouraging but specific; never flatter a vague answer.\n\nReturn STRICT JSON: { "score": 0-100, "verdict": "one honest sentence", "strengths": ["what they nailed"], "gaps": ["what a listener would still be confused about, or what they got wrong"], "model": "a model 3-sentence explanation they can compare against" }\nRules: score on whether they captured the puzzle, the mechanism, and the evidence, AND whether it's clear to a non-expert. 1-3 strengths, 1-3 gaps. The model explanation must be genuinely excellent and jargon-free. No em dashes.`;
  const user = `THE IDEA (ground truth):\nTitle: ${input.title}\nPuzzle: ${input.puzzle}\nCore idea: ${input.idea}\nMechanism: ${input.mechanism}\nWhat a good explanation must hit: ${input.rubric.join("; ")}\n\nTHE LEARNER'S EXPLANATION:\n${input.attempt.slice(0, 2000)}`;
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.3, maxTokens: 900, low: true, timeoutMs: 45000 });
}

