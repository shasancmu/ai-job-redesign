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
  ratings?: { key: string; label: string }[]; // 0–100 scorecard dimensions (e.g. the 4 A's) → also the cohort heatmap
  hasScore?: { label: string }; // show a single 0–100 meter (e.g. capability fit)
  hasVerdict?: { label: string }; // show a headline verdict
};

const ACCENTS = { human: "#3F7A52", ai: "#CE8F2C", both: "#7C5CBF", sage: "#3F7A52", gold: "#CE8F2C", plum: "#7C5CBF" };
export function accentColor(a?: string) {
  return (a && (ACCENTS as any)[a]) || "#3F7A52";
}

// Red → amber → green ramp for 0–100 scores (rating bars + cohort heatmap).
export function scoreColor(v: number) {
  const t = Math.max(0, Math.min(100, v)) / 100;
  const hue = 8 + t * 122; // 8 (clay red) → 130 (sage green)
  return `hsl(${hue} 55% 42%)`;
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
  interviewSystem: `You are a sharp AI-strategy advisor interviewing someone about ONE workflow they want to augment with AI, to fill out the GAS canvas (Generality, Accuracy, Simplicity) from Hasan, Samila & Oettl. The framework's logic guides your questions:
- GENERALITY vs. ACCURACY is a trade-off frontier: an AI that handles a wider range of situations tends to be less accurate on any one of them, and vice versa. The strategic choice is WHERE on that frontier this workflow needs to sit — you cannot maximize both.
- ACCURACY requirement is set by the COST OF ERRORS: the more damaging a mistake, the more accuracy (and human oversight) the task demands.
- GENERALITY requirement is set by HOW VARIED the situations are: a narrow, repeatable task can be automated; a wildly varied one needs either a human or a general (less accurate) model.
- SIMPLICITY is about where COMPLEXITY LIVES: complexity is conserved — if you hide it from the user it moves into the interface, the model, the data plumbing, or human oversight. Good design chooses who bears it so users aren't overwhelmed.
Use good interviewing craft:
- Ask exactly ONE short, open question at a time; follow their lead.
- Pull the concrete detail the canvas needs: the workflow and the outcome they actually want; how costly an error is and how failure would show up (→ accuracy); how varied the situations are (→ generality); which steps must stay human vs. AI-assisted vs. fully automated; who the users are and how much complexity they can carry (→ simplicity); what could go wrong (missed nuance, overtrust, misuse).
- Probe where their judgment is the thing that saves it, and where volume is drowning them.
- Do not lecture or fill the canvas yet — just understand it.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You turn an interview into a filled GAS AI Opportunity Canvas (Hasan, Samila & Oettl). Apply the framework's logic: set required ACCURACY from the cost of errors; set required GENERALITY from how varied the situations are; treat these as a trade-off (a workflow that needs both high accuracy AND high generality is a warning sign — narrow it or keep a human in the loop). Split tasks so high-stakes / low-error-tolerance work stays human or human-in-the-loop, and narrow, error-tolerant work goes to AI. For SIMPLICITY, be explicit about where complexity lives so users aren't overwhelmed. Be specific to THIS workflow — no generic "leverage AI".`,
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

// ---------------------------------------------------------------------------
// 4) 4A Execution Diagnostic (Alignment · Ability · Architecture · Agility)
// ---------------------------------------------------------------------------
const FOURA: CanvasDef = {
  slug: "execution-4a",
  exercise: "four-a",
  name: "4A Execution Diagnostic",
  subjectLabel: "initiative",
  setupTitle: "The strategy or initiative you're trying to execute",
  setupHint: "A real change you're responsible for landing. Your AI partner will diagnose it across the 4 A's.",
  setupPlaceholder: "e.g. Rolling out the new pricing model across the sales org",
  interviewSystem: `You are an execution advisor interviewing a manager about ONE strategy or initiative they're trying to land, using the 4A framework (Alignment, Ability, Architecture, Agility). Use good interviewing craft:
- Ask exactly ONE short, open question at a time; follow their lead.
- ALIGNMENT: is there a clear, shared goal everyone is actually pulling toward, or is it interpreted differently across silos?
- ABILITY: do they have the leadership, talent, and skills the initiative needs — and who is the linchpin?
- ARCHITECTURE: do the structures, processes, and incentives make this easier or actively fight it?
- AGILITY: can they sense and adapt as conditions change, or is the plan brittle?
- Probe where execution actually breaks — the gap between the plan and what happens on the ground.
- Do not diagnose or score yet — just understand it.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You diagnose how well a specific initiative is set up to EXECUTE across the 4A framework: Alignment (clear shared goal, unity across silos), Ability (leadership, talent, skills), Architecture (structures, processes, incentives that enable vs. impede), Agility (sensing and adapting to change). For each A, score execution readiness 0–100 for THIS initiative (be discerning — spread the scores, don't cluster), diagnose where it stands, and give the single highest-leverage fix. Be specific and honest — name the real weakness.`,
  ratings: [
    { key: "alignment", label: "Alignment" },
    { key: "ability", label: "Ability" },
    { key: "architecture", label: "Architecture" },
    { key: "agility", label: "Agility" },
  ],
  fields: [
    { key: "alignment_diag", label: "Where alignment stands", hint: "Is the goal shared and clear, or read differently across silos?", kind: "long", group: "Alignment", accent: "sage" },
    { key: "alignment_fix", label: "Highest-leverage fix", kind: "long", group: "Alignment", accent: "gold" },
    { key: "ability_diag", label: "Where ability stands", hint: "Leadership, talent, and the skills this needs", kind: "long", group: "Ability", accent: "sage" },
    { key: "ability_fix", label: "Highest-leverage fix", kind: "long", group: "Ability", accent: "gold" },
    { key: "architecture_diag", label: "Where architecture stands", hint: "Do structures, processes, incentives help or fight it?", kind: "long", group: "Architecture", accent: "sage" },
    { key: "architecture_fix", label: "Highest-leverage fix", kind: "long", group: "Architecture", accent: "gold" },
    { key: "agility_diag", label: "Where agility stands", hint: "Can you sense and adapt as things change?", kind: "long", group: "Agility", accent: "sage" },
    { key: "agility_fix", label: "Highest-leverage fix", kind: "long", group: "Agility", accent: "gold" },
  ],
  hasVerdict: { label: "The one move that unlocks execution" },
};

export const CANVASES: CanvasDef[] = [FOURA, GAS, OCFIT, EXPERIMENT];

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
