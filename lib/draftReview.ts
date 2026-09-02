// The decisions worth an author's attention, per format, in the order they
// matter.
//
// A generated draft is ~3,000 words across dozens of fields, and the editor
// treats every one as equally important. They are not: the hidden truth *is* a
// role-play, and the emoji is not. Faced with a wall of boxes and no ranking,
// an author reads everything, trusts nothing, and gets tired — which is harder
// work than writing it themselves, and the opposite of the promise.
//
// So the review surfaces four or five decisions, each with what was chosen, why
// it leads, and a way to change it. Everything else stays a default the author
// can ignore forever, still available in the editor.
//
// These lists are a judgement about teaching, not about software. They are
// meant to be argued with and edited.
export type ReviewStep = {
  key: string;
  title: string;
  /** One line on why this decision leads. */
  why: string;
  /** Pull the current value out of the spec for display. */
  read: (spec: any) => string;
  /** The instruction sent to the copilot for "try a different one". */
  reroll: string;
  /** Write an author's own text back into the spec. Omit for read-only steps. */
  write?: (spec: any, text: string) => any;
};

const clone = (s: any) => JSON.parse(JSON.stringify(s));
const joinList = (xs: any[] | undefined, pick: (x: any) => string, empty = "—") =>
  !xs?.length ? empty : xs.map((x) => `• ${pick(x)}`).join("\n");

const ROLEPLAY: ReviewStep[] = [
  {
    key: "objective",
    title: "What learners should walk away able to do",
    why: "Everything else is downstream of this. Wrong here means wrong everywhere.",
    read: (s) => [s?.objective?.goal, s?.objective?.aha && `The aha: ${s.objective.aha}`].filter(Boolean).join("\n\n") || "—",
    reroll: "Rewrite the objective (goal and aha) to be sharper and more specific about what the learner can do afterwards. Keep everything else.",
    write: (s, t) => { const n = clone(s); n.objective = { ...(n.objective || {}), goal: t }; return n; },
  },
  {
    key: "truth",
    title: "The hidden truth",
    why: "This is the mechanic itself — what makes it a role-play instead of a quiz.",
    read: (s) => joinList(s?.scenarios, (x) => `${x.label || x.id}: ${x.truth}`),
    reroll: "Invent different hidden truths for the scenarios — same situation and objective, but a different thing the learner has to uncover. Keep everything else.",
  },
  {
    key: "behavior",
    title: "How hard the character pushes back",
    why: "This is the difficulty dial. Too soft and there is nothing to practise.",
    read: (s) => joinList(s?.roles, (r) => `${r.name || r.key}: ${r.behavior || r.persona || "—"}`),
    reroll: "Make the character meaningfully harder to read — more evasive and more plausible, while never stating a falsehood. Keep everything else.",
  },
  {
    key: "rubric",
    title: "What counts as good",
    why: "Decides the grade and the feedback every learner gets.",
    read: (s) => [s?.rubric?.instructions, joinList(s?.rubric?.output, (f) => f.label || f.key, "")].filter(Boolean).join("\n\n") || "—",
    reroll: "Rewrite the rubric to grade the quality of the learner's questioning and reasoning rather than whether they reached the right answer. Keep everything else.",
  },
  {
    key: "decision",
    title: "The call the learner has to make",
    why: "What they actually walk away having done.",
    read: (s) => joinList(s?.flow?.filter((p: any) => p.kind === "decide" || p.kind === "verdict"), (p) => `${p.title}${p.intro ? ` — ${p.intro}` : ""}`),
    reroll: "Sharpen the decision the learner must commit to, so it is concrete and consequential. Keep everything else.",
  },
];

const INTERVIEW: ReviewStep[] = [
  {
    key: "subject",
    title: "What the learner brings",
    why: "The module only works if they arrive with a real situation of their own.",
    read: (s) => [s?.subject, s?.setupHint].filter(Boolean).join("\n\n") || "—",
    reroll: "Make the subject the learner brings more concrete and easier to name in one line. Keep everything else.",
    write: (s, t) => ({ ...clone(s), subject: t }),
  },
  {
    key: "framework",
    title: "The framework it applies",
    why: "This is what separates a real analysis from generic advice.",
    read: (s) => s?.framework || "None set — the interview will be unstructured.",
    reroll: "Ground the module in a named, established framework and apply it explicitly. Keep everything else.",
    write: (s, t) => ({ ...clone(s), framework: t }),
  },
  {
    key: "topics",
    title: "What the interview draws out",
    why: "The questions decide the quality of everything downstream.",
    read: (s) => joinList(s?.topics, (t) => String(t)),
    reroll: "Rewrite the interview topics so they draw out specifics and evidence rather than opinions. Keep everything else.",
  },
  {
    key: "output",
    title: "What they leave with",
    why: "The artifact is the point — a grade is not.",
    read: (s) => joinList(s?.sections, (x) => x.title || x.key),
    reroll: "Rework the report sections so the learner leaves with something they could act on tomorrow. Keep everything else.",
  },
];

const NEGOTIATION: ReviewStep[] = [
  {
    key: "situation",
    title: "The situation and the two sides",
    why: "Sets whether this feels like a real deal or an exercise.",
    read: (s) => [s?.scenario, s?.counterpartName && `Counterpart: ${s.counterpartName}`].filter(Boolean).join("\n\n") || "—",
    reroll: "Make the situation more concrete and higher-stakes, keeping the same issues. Keep everything else.",
  },
  {
    key: "issues",
    title: "The issues, and the hidden payoffs",
    why: "Where the value-creating trades live — the whole mechanic.",
    read: (s) => joinList(s?.issues, (i) => i.label || i.key),
    reroll: "Rebalance the payoff tables so there are clear integrative trades: issues one side values far more than the other. Keep everything else.",
  },
  {
    key: "batna",
    title: "The walk-away",
    why: "Without a credible walk-away there is no negotiation to practise.",
    read: (s) => (s?.yourBatna != null ? String(s.yourBatna) : "—"),
    reroll: "Set a walk-away that makes the negotiation genuinely tense without making it unwinnable. Keep everything else.",
  },
];

const BENCHMARK: ReviewStep[] = [
  {
    key: "questions",
    title: "The questions",
    why: "A quiz is only as good as what it asks.",
    read: (s) => joinList(s?.questions, (q) => q.prompt || `Question ${q.id}`),
    reroll: "Rewrite the questions to test understanding and application rather than recall. Keep everything else.",
  },
  {
    key: "distractors",
    title: "The wrong answers",
    why: "Plausible distractors are what make a score mean anything.",
    read: (s) => joinList(s?.questions?.slice(0, 3), (q) => `${q.prompt?.slice(0, 60) || q.id}: ${(q.options || []).map((o: any) => o.label || o).join(" / ")}`),
    reroll: "Make the wrong answers more plausible — each should reflect a specific, common misunderstanding. Keep everything else.",
  },
  {
    key: "time",
    title: "The time limit",
    why: "Decides whether this measures thinking or typing speed.",
    read: (s) => (s?.timeLimitSec ? `${Math.round(s.timeLimitSec / 60)} minutes for ${s?.questions?.length ?? "?"} questions` : "—"),
    reroll: "Set a time limit that rewards thinking rather than rushing, given the number of questions. Keep everything else.",
  },
];

const ANALYTICAL: ReviewStep[] = [
  {
    key: "units",
    title: "How the subject gets broken up",
    why: "The unit of analysis determines what the instrument can see.",
    read: (s) => [s?.subject && `Subject: ${s.subject}`, s?.unitLabel && `Unit: ${s.unitLabel}`, s?.decompose].filter(Boolean).join("\n\n") || "—",
    reroll: "Choose a sharper unit of analysis and explain the decomposition more precisely. Keep everything else.",
  },
  {
    key: "levels",
    title: "The scale",
    why: "Scores are only comparable if the levels are genuinely distinct.",
    read: (s) => joinList(s?.levels, (l) => `${l.label}${l.hint ? ` — ${l.hint}` : ""}`),
    reroll: "Make the scale levels mutually exclusive and clearly distinguishable, with a concrete test for each. Keep everything else.",
  },
  {
    key: "lens",
    title: "The lens it scores against",
    why: "Without a stated standard, the scoring is just vibes.",
    read: (s) => s?.lens || "None set.",
    reroll: "Ground the scoring in an explicit, named standard the AI must apply. Keep everything else.",
    write: (s, t) => ({ ...clone(s), lens: t }),
  },
];

const EXPLAINER: ReviewStep[] = [
  {
    key: "takeaway",
    title: "The one thing to remember",
    why: "An explainer that teaches everything teaches nothing.",
    read: (s) => s?.takeaway || "None set.",
    reroll: "Name a single, sharp takeaway and make every section serve it. Keep everything else.",
    write: (s, t) => ({ ...clone(s), takeaway: t }),
  },
  {
    key: "intro",
    title: "The hook",
    why: "Decides whether anyone reads the second paragraph.",
    read: (s) => s?.intro || "—",
    reroll: "Rewrite the opening so it starts from a concrete problem the reader recognises. Keep everything else.",
    write: (s, t) => ({ ...clone(s), intro: t }),
  },
  {
    key: "sections",
    title: "The walkthrough",
    why: "The order is the teaching.",
    read: (s) => joinList(s?.sections, (x) => x.title),
    reroll: "Reorder and retitle the sections so each one earns the next. Keep everything else.",
  },
];

const NEWSFRAME: ReviewStep[] = [
  {
    key: "framework",
    title: "The framework",
    why: "The lens the learner applies to whatever broke this week.",
    read: (s) => [s?.framework, s?.frameworkLogic].filter(Boolean).join("\n\n") || "—",
    reroll: "Ground it in a named framework and state precisely how to apply it. Keep everything else.",
  },
  {
    key: "topic",
    title: "The beat",
    why: "Too narrow and there is no news; too broad and it is not about anything.",
    read: (s) => s?.topic || "—",
    reroll: "Choose a beat wide enough to produce stories every week but specific enough to stay coherent. Keep everything else.",
    write: (s, t) => ({ ...clone(s), topic: t }),
  },
  {
    key: "call",
    title: "The call the learner makes",
    why: "Applying a framework without committing to a judgement teaches little.",
    read: (s) => [s?.verdict?.label, joinList(s?.verdict?.options, (o) => o.label, "")].filter(Boolean).join("\n") || "—",
    reroll: "Sharpen the verdict so the learner has to commit to a real judgement. Keep everything else.",
  },
];

const REDESIGN: ReviewStep[] = [
  {
    key: "subject",
    title: "What partners redesign for each other",
    why: "It has to be real work of their own, or the redesign is hypothetical.",
    read: (s) => [s?.subject, s?.setupPrompt].filter(Boolean).join("\n\n") || "—",
    reroll: "Make the subject something every learner can name from their own work in one line. Keep everything else.",
  },
  {
    key: "interview",
    title: "What the interview draws out",
    why: "The partner can only redesign what the interview surfaces.",
    read: (s) => s?.interviewPrompt || "—",
    reroll: "Rewrite the interview prompt to surface what is actually hard, not just what is time-consuming. Keep everything else.",
    write: (s, t) => ({ ...clone(s), interviewPrompt: t }),
  },
  {
    key: "buckets",
    title: "The instrument they redesign on",
    why: "The categories are the argument you are teaching.",
    read: (s) => joinList(s?.buckets, (b) => `${b.label}${b.hint ? ` — ${b.hint}` : ""}`),
    reroll: "Sharpen the buckets so the split between human and AI work is a real judgement rather than an obvious sort. Keep everything else.",
  },
];

export const REVIEW_STEPS: Record<string, ReviewStep[]> = {
  roleplay: ROLEPLAY,
  interview: INTERVIEW,
  negotiation: NEGOTIATION,
  benchmark: BENCHMARK,
  analytical: ANALYTICAL,
  explainer: EXPLAINER,
  newsframe: NEWSFRAME,
  redesign: REDESIGN,
};

export function reviewStepsFor(formatId: string, spec: any): ReviewStep[] {
  // Only show a step that actually has something to show — a spec missing a
  // field shouldn't produce a review page reading "—".
  return (REVIEW_STEPS[formatId] || []).filter((s) => {
    const v = s.read(spec);
    return v && v !== "—";
  });
}
