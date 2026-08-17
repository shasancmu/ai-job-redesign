// ============================================================================
// Strategy-canvas modules — a generic engine that turns a framework into a
// Solo + AI exercise: name the subject → AI interviews you → AI drafts the
// canvas → you edit it → keep a printable artifact. Add a framework by adding
// a CanvasDef here (+ a module registry entry). No new room engine needed.
// ============================================================================

export type CanvasField = {
  key: string;
  label: string;
  hint?: string;
  kind: "text" | "long" | "list";
  group: string; // section heading in the room + artifact
  accent?: "human" | "ai" | "both" | "sage" | "gold" | "plum";
};

export type CanvasDef = {
  slug: string; // module slug (registry)
  exercise: string; // sessions.exercise key
  name: string;
  subjectLabel: string; // "workflow" | "opportunity" | "bet"
  setupTitle: string;
  setupHint: string;
  setupPlaceholder: string;
  interviewSystem: string;
  draftSystem: string;
  fields: CanvasField[];
  hasScore?: { label: string }; // show a 0–100 meter (e.g. capability fit)
  hasVerdict?: { label: string }; // show a headline verdict
};

const ACCENTS = { human: "#3F7A52", ai: "#CE8F2C", both: "#7C5CBF", sage: "#3F7A52", gold: "#CE8F2C", plum: "#7C5CBF" };
export function accentColor(a?: string) {
  return (a && (ACCENTS as any)[a]) || "#3F7A52";
}

// ---------------------------------------------------------------------------
// 1) AI Opportunity Canvas (the GAS canvas — Hasan, Oettl & Samila)
// ---------------------------------------------------------------------------
const GAS: CanvasDef = {
  slug: "ai-canvas",
  exercise: "gas",
  name: "AI Opportunity Canvas",
  subjectLabel: "workflow",
  setupTitle: "The workflow you want to augment with AI",
  setupHint: "One task, process, or decision — be specific. Your AI partner will interview you about it.",
  setupPlaceholder: "e.g. Triaging inbound support tickets and drafting first replies",
  interviewSystem: `You are a sharp AI-strategy advisor interviewing someone about ONE workflow they want to augment with AI, to fill out the GAS canvas (Generality, Accuracy, Simplicity). Use good interviewing craft:
- Ask exactly ONE short, open question at a time; follow their lead.
- Pull the concrete detail you need for the canvas: what the workflow is and the outcome they actually want; how accurate the AI must be and how failure would show up; whether it faces varied situations or a narrow domain; which steps must stay human vs. could be AI-assisted vs. fully automated; who the users are and how much complexity they can handle; what could go wrong (missed nuance, overtrust, misuse).
- Probe where their judgment is the thing that saves it, and where volume is drowning them.
- Do not lecture or fill the canvas yet — just understand it.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You turn an interview about a workflow into a filled GAS AI Opportunity Canvas (Hasan, Oettl & Samila). Be specific to THIS workflow — no generic "leverage AI".`,
  fields: [
    { key: "strategic_outcome", label: "Strategic outcome", hint: "The value/impact you expect — speed, volume, cost, accuracy, quality", kind: "long", group: "The bet", accent: "sage" },
    { key: "required_accuracy", label: "Required accuracy", hint: "How exact must it be to avoid costly mistakes, and how you'd measure it", kind: "long", group: "Capabilities", accent: "gold" },
    { key: "required_generality", label: "Required generality", hint: "Handle varied situations, or stay in a narrow domain?", kind: "long", group: "Capabilities", accent: "gold" },
    { key: "human_tasks", label: "Human tasks", hint: "Stay human-led — and why humans are essential there", kind: "list", group: "The split", accent: "human" },
    { key: "humanai_tasks", label: "Human + AI tasks", hint: "AI supports the human (drafts, suggests, flags)", kind: "list", group: "The split", accent: "both" },
    { key: "ai_tasks", label: "AI tasks", hint: "AI handles independently, no human in the loop", kind: "list", group: "The split", accent: "gold" },
    { key: "user_simplicity", label: "User-level simplicity", hint: "Who are the users, and how much complexity can they manage?", kind: "long", group: "Control", accent: "plum" },
    { key: "distributed_complexity", label: "Where complexity lives", hint: "UI, infrastructure, model, or human oversight?", kind: "long", group: "Control", accent: "plum" },
    { key: "risks", label: "Risks", hint: "Missed nuance, overtrust, misuse, blind spots", kind: "list", group: "Control", accent: "plum" },
    { key: "deployment", label: "Deployment strategy", hint: "Off-the-shelf, RAG, or fine-tuned — and why", kind: "long", group: "Make it real", accent: "sage" },
  ],
  hasVerdict: { label: "The opportunity in one line" },
};

// ---------------------------------------------------------------------------
// 2) Opportunity–Capability Fit ("making bets that align with capabilities")
// ---------------------------------------------------------------------------
const OCFIT: CanvasDef = {
  slug: "opportunity-capability",
  exercise: "ocfit",
  name: "Opportunity–Capability Fit",
  subjectLabel: "opportunity",
  setupTitle: "The opportunity or bet you're weighing",
  setupHint: "A move you're considering — a market, product, or initiative. Your AI partner will interview you to test the fit.",
  setupPlaceholder: "e.g. Launch a self-serve product for small businesses",
  interviewSystem: `You are a strategy advisor interviewing someone about ONE opportunity they're weighing, to assess how well it fits their organization's capabilities across four dimensions: Tasks (the activities the work requires), People (skills, talent), Formal Systems (processes, structure, incentives, tools), and Culture (norms, how things really get done). Use good interviewing craft:
- Ask exactly ONE short, open question at a time; follow their lead.
- For each dimension, pull what the opportunity would REQUIRE and what they actually HAVE today — and where the gap is honest, not flattering.
- Probe the uncomfortable gap: the capability that looks fine on paper but would break under this bet.
- Do not give a verdict yet — just understand it.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You assess how well an opportunity fits an organization's capabilities (Tasks, People, Formal Systems, Culture). Be specific and honest — name the real gap, not a reassurance.`,
  fields: [
    { key: "tasks", label: "Tasks", hint: "What the work requires vs. what you can do today", kind: "long", group: "Capability alignment", accent: "sage" },
    { key: "people", label: "People", hint: "Skills and talent the bet needs vs. what you have", kind: "long", group: "Capability alignment", accent: "sage" },
    { key: "systems", label: "Formal systems", hint: "Processes, structure, incentives, tools", kind: "long", group: "Capability alignment", accent: "sage" },
    { key: "culture", label: "Culture", hint: "Norms and how things actually get done", kind: "long", group: "Capability alignment", accent: "sage" },
    { key: "biggest_gap", label: "The biggest gap", hint: "The capability most likely to break this bet", kind: "long", group: "The call", accent: "gold" },
    { key: "to_build", label: "What to build first", hint: "The capability to close before you commit", kind: "list", group: "The call", accent: "gold" },
  ],
  hasScore: { label: "Capability fit" },
  hasVerdict: { label: "The call" },
};

// ---------------------------------------------------------------------------
// 3) Test-the-Bet (the Business Experiment canvas)
// ---------------------------------------------------------------------------
const EXPERIMENT: CanvasDef = {
  slug: "test-the-bet",
  exercise: "experiment",
  name: "Test-the-Bet",
  subjectLabel: "bet",
  setupTitle: "The bet you want to test before committing",
  setupHint: "A belief you're about to spend real money or time on. Your AI partner will help you design a clean experiment.",
  setupPlaceholder: "e.g. Adding live chat will lift trial-to-paid conversion",
  interviewSystem: `You are a crisp experimentation coach interviewing someone about a strategic bet they want to TEST before committing, to design a clean business experiment. Use good interviewing craft:
- Ask exactly ONE short, open question at a time.
- Pull: the belief/hypothesis stated so it can be falsified; the smallest real change that would test it (condition A vs B); the ONE outcome metric that actually matters (the "so what"); what result would make them scale it vs. kill it; what could confound the result.
- Push them from vague ("see if it works") to a specific, measurable, time-boxed test.
- Do not design it fully yet — just understand the bet.
After about 5 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You turn a strategic bet into a clean, runnable business experiment. Make it specific, measurable, and time-boxed — a test someone could start this week.`,
  fields: [
    { key: "hypothesis", label: "Hypothesis", hint: "Stated so it can be proven wrong", kind: "long", group: "The test", accent: "sage" },
    { key: "condition_a", label: "Condition A (control)", hint: "What stays the same", kind: "long", group: "The test", accent: "human" },
    { key: "condition_b", label: "Condition B (change)", hint: "The one thing you change", kind: "long", group: "The test", accent: "gold" },
    { key: "metric", label: "Outcome metric — the 'so what'", hint: "The single number that decides it", kind: "long", group: "The test", accent: "plum" },
    { key: "design", label: "How to run it", hint: "Sample, duration, and how to keep it fair", kind: "list", group: "Make it clean", accent: "sage" },
    { key: "decision_rule", label: "Decision rule", hint: "What result scales it, what result kills it", kind: "long", group: "Make it clean", accent: "gold" },
    { key: "confounds", label: "What could fool you", hint: "Confounds to control for", kind: "list", group: "Make it clean", accent: "plum" },
  ],
  hasVerdict: { label: "The test in one line" },
};

export const CANVASES: CanvasDef[] = [GAS, OCFIT, EXPERIMENT];

export function canvasByExercise(exercise: string): CanvasDef | undefined {
  return CANVASES.find((c) => c.exercise === exercise);
}
export function canvasBySlug(slug: string): CanvasDef | undefined {
  return CANVASES.find((c) => c.slug === slug);
}
export const CANVAS_EXERCISES = CANVASES.map((c) => c.exercise);

// The four-step flow every canvas shares.
export const CANVAS_STEPS = [
  { key: "setup", title: "Name it", minutes: 2 },
  { key: "interview", title: "Talk it through with AI", minutes: 7 },
  { key: "canvas", title: "Your canvas", minutes: 8 },
  { key: "artifact", title: "Keep the plan", minutes: 2 },
];
