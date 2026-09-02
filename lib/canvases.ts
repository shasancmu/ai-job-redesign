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
  kind: "text" | "long" | "list" | "pairs"; // pairs = list of {a,b}, e.g. measure → target
  group: string; // section heading in the room + artifact
  accent?: "human" | "ai" | "both" | "sage" | "gold" | "plum" | "clay";
  leftLabel?: string; // pairs: label for the "a" side (e.g. "Measure")
  rightLabel?: string; // pairs: label for the "b" side (e.g. "Target")
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
  // "explore" (default) = warm, non-directive qualitative interview; "grill" = a
  // rigorous, adversarial cross-examination (an econometrician / referee) that
  // attacks the argument instead of collecting a narrative.
  interviewStyle?: "explore" | "grill";
  // How many exchanges the interview should run before closing. The prompts
  // have always said "after about N exchanges" and were never held to it;
  // this is the number the pacing directive enforces. Defaults to 6.
  interviewTurns?: number;
  draftSystem: string;
  fields: CanvasField[];
  ratings?: { key: string; label: string }[]; // 0–100 scorecard dimensions (e.g. the 4 A's) → also the cohort heatmap
  hasScore?: { label: string }; // show a single 0–100 meter (e.g. capability fit)
  hasVerdict?: { label: string }; // show a headline verdict
  frontier?: {
    xLabel: string;
    yLabel: string;
    mode?: "complexity" | "quadrant"; // default complexity (GAS G–A map)
    heading?: string; // section heading override
    xDesc?: string; // how the AI should score x (0–100) — defaults to GAS Generality
    yDesc?: string; // how the AI should score y (0–100) — defaults to GAS Accuracy
    quadrants?: { bl: string; br: string; tl: string; tr: string }; // corner labels (quadrant mode)
  };
  brand?: { label: string; logoUrl?: string | null }; // author-built modules: the org's badge
  about?: string; // shown during the exercise — what the framework is
  groupNotes?: Record<string, string>; // one-line explainer under each section heading
  canvasTip?: { title: string; items: string[] }; // a teaching callout on the canvas step
  calculator?: {
    kind: "unit-economics";
    inputs: { key: string; label: string; prefix?: string; suffix?: string }[];
  }; // a live calculator; AI seeds the numbers, the user tweaks them
};

const ACCENTS = { human: "#3F7A52", ai: "#CE8F2C", both: "#7C5CBF", sage: "#3F7A52", gold: "#CE8F2C", plum: "#7C5CBF", clay: "#C0603A" };
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
  setupHint: "One task, process, or decision. Be specific. Your AI partner will interview you about it.",
  setupPlaceholder: "e.g. Triaging inbound support tickets and drafting first replies",
  interviewSystem: `You are a sharp AI-strategy advisor interviewing someone about ONE workflow they want to augment with AI, to fill the AI Opportunity Canvas. Ground every question in the GAS framework (Hasan, Oettl & Samila, "From Model Design to Organizational Design"):
- GENERALITY (breadth of situations handled), ACCURACY (how well outputs match reality), and SIMPLICITY (ease of use AND where the underlying complexity resides) trade off. You cannot maximize all three. The strategic question is WHERE on the Generality–Accuracy frontier this workflow must sit.
- Position the workflow on Dhar's map: PREDICTABILITY of the task vs. COST PER MISTAKE. Low error-cost / predictable work (drafting copy, code scaffolds, brainstorming) can be automated; MID-risk work (support replies, compliance emails, enterprise search) creates an "overproduction" problem where the human becomes a CURATOR of machine output; HIGH error-cost work (legal, medical, safety-critical) keeps AI as an ADJUNCT only: retrieval and ideation, never the core decision.
- SIMPLICITY is not the absence of complexity. It is RELOCATED. A simple interface pushes complexity into infrastructure, data pipelines, model-risk/compliance, and specialist roles (prompt engineering, data governance, oversight). Ask where the hidden complexity will land and who owns it.
- LLMs have an ACCURACY CEILING (they pattern-match); in high-stakes use the ceiling becomes the binding constraint. Complements RISE in value: judgment, relationships, data quality, and the oversight capacity to catch errors.
Interview craft: ask exactly ONE short, open question at a time; follow their lead. Pull the concrete detail the canvas needs: the outcome they want; how costly a mistake is and how failure shows up; how varied the situations are; which steps stay human vs. copilot vs. automated; who the users are and where complexity should live; what could go wrong. Do not lecture or fill the canvas yet.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You fill the AI Opportunity Canvas using the GAS framework (Hasan, Oettl & Samila). Apply its logic rigorously:
- Set required ACCURACY from the COST PER MISTAKE; set required GENERALITY from how VARIED the situations are; treat them as a frontier: a workflow demanding BOTH high accuracy and high generality is a warning sign (narrow the domain, or keep a human in the loop).
- Place the workflow on the frontier and pick the pattern: AUTOMATE (predictable, low error-cost), COPILOT / human-curates (mid-risk, overproduction), or ADJUNCT only (high error-cost). Let that drive the human / human+AI / AI task split.
- SIMPLICITY: name where the relocated complexity lands (infrastructure, data, compliance/model-risk, specialist roles). Don't pretend it disappears.
- Name the human COMPLEMENTS that rise in value here. Be specific to THIS workflow: no generic "leverage AI".`,
  fields: [
    { key: "strategic_outcome", label: "Strategic outcome", hint: "The value/impact you expect: speed, volume, cost, accuracy, quality", kind: "long", group: "The bet", accent: "sage" },
    { key: "required_accuracy", label: "Required accuracy", hint: "How costly is a mistake? High error-cost demands more accuracy + oversight. How would you measure it?", kind: "long", group: "The frontier", accent: "gold" },
    { key: "required_generality", label: "Required generality", hint: "How varied are the situations? Narrow → automatable; broad → trades accuracy", kind: "long", group: "The frontier", accent: "gold" },
    { key: "frontier_position", label: "Where it sits on the frontier", hint: "Automate (predictable, low error-cost) · Copilot/human-curates (mid-risk) · Adjunct only (high error-cost)", kind: "long", group: "The frontier", accent: "gold" },
    { key: "human_tasks", label: "Human tasks", hint: "Stay human-led, and why humans are essential there", kind: "list", group: "The split", accent: "human" },
    { key: "humanai_tasks", label: "Human + AI tasks", hint: "AI drafts / suggests / flags; the human curates and does the accuracy check", kind: "list", group: "The split", accent: "both" },
    { key: "ai_tasks", label: "AI tasks", hint: "AI handles independently, only where errors are cheap and tolerable", kind: "list", group: "The split", accent: "gold" },
    { key: "user_simplicity", label: "User-facing simplicity", hint: "Who are the users, and how much complexity can they carry?", kind: "long", group: "Where complexity lands", accent: "plum" },
    { key: "distributed_complexity", label: "Where the complexity relocates", hint: "It doesn't vanish: infrastructure, data pipelines, compliance/model-risk, and specialist roles. Who owns it?", kind: "long", group: "Where complexity lands", accent: "plum" },
    { key: "risks", label: "Risks", hint: "The accuracy ceiling: missed nuance, overtrust, misuse, blind spots", kind: "list", group: "Where complexity lands", accent: "plum" },
    { key: "complements", label: "Complements that rise in value", hint: "Judgment, relationships, data quality, oversight capacity", kind: "list", group: "Make it real", accent: "sage" },
    { key: "deployment", label: "Deployment strategy", hint: "Autonomous vs. human-in-the-loop (end-user check or provider review); off-the-shelf / RAG / fine-tuned", kind: "long", group: "Make it real", accent: "sage" },
  ],
  hasVerdict: { label: "Where it sits on the G–A frontier, and the play" },
  frontier: { xLabel: "Generality (G) →", yLabel: "Accuracy (A) →" },
  about:
    "The GAS framework (Hasan, Oettl & Samila): AI trades off Generality, Accuracy, and Simplicity. You can't max all three. A simple experience for users doesn't remove complexity; it relocates it to data, infrastructure, compliance, and new expertise. Advantage comes from choosing where to sit on the Generality–Accuracy frontier and mastering the complexity that moves. This canvas walks one workflow through that choice.",
  groupNotes: {
    "The bet": "The value you're actually chasing: speed, volume, cost, or quality.",
    "The frontier":
      "Each curve is a fixed level of complexity behind the interface. Reaching both high Generality and high Accuracy means mastering an outer, higher-complexity curve, or keeping a human in the loop.",
    "The split": "Give AI the predictable, low-stakes work; keep judgment, relationships, and the final accuracy check with people.",
    "Where complexity lands":
      "A simple experience for users doesn't remove complexity. It moves it to data, infrastructure, compliance, and specialist roles. Decide who owns it.",
    "Make it real": "The human complements that get more valuable here, and how you'd actually deploy it.",
  },
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
  setupHint: "A move you're considering: a market, product, or initiative. Your AI partner will interview you to test the fit.",
  setupPlaceholder: "e.g. Launch a self-serve product for small businesses",
  interviewSystem: `You are a strategy advisor interviewing someone about ONE opportunity they're weighing, to assess how well it fits their organization's capabilities across four dimensions: Tasks (the activities the work requires), People (skills, talent), Formal Systems (processes, structure, incentives, tools), and Culture (norms, how things really get done). Use good interviewing craft:
- Ask exactly ONE short, open question at a time; follow their lead.
- For each dimension, pull what the opportunity would REQUIRE and what they actually HAVE today, and where the gap is honest, not flattering.
- Probe the uncomfortable gap: the capability that looks fine on paper but would break under this bet.
- Do not give a verdict yet, just understand it.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You assess how well an opportunity fits an organization's capabilities (Tasks, People, Formal Systems, Culture). Be specific and honest: name the real gap, not a reassurance.`,
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
- Do not design it fully yet, just understand the bet.
After about 5 exchanges, reflect the shape back, ask what you missed, then close.`,
    interviewTurns: 5,
  draftSystem: `You turn a strategic bet into a clean, runnable business experiment. Make it specific, measurable, and time-boxed, a test someone could start this week.`,
  fields: [
    { key: "hypothesis", label: "Hypothesis", hint: "Stated so it can be proven wrong", kind: "long", group: "The test", accent: "sage" },
    { key: "condition_a", label: "Condition A (control)", hint: "What stays the same", kind: "long", group: "The test", accent: "human" },
    { key: "condition_b", label: "Condition B (change)", hint: "The one thing you change", kind: "long", group: "The test", accent: "gold" },
    { key: "metric", label: "Outcome metric: the 'so what'", hint: "The single number that decides it", kind: "long", group: "The test", accent: "plum" },
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
- ABILITY: do they have the leadership, talent, and skills the initiative needs, and who is the linchpin?
- ARCHITECTURE: do the structures, processes, and incentives make this easier or actively fight it?
- AGILITY: can they sense and adapt as conditions change, or is the plan brittle?
- Probe where execution actually breaks: the gap between the plan and what happens on the ground.
- Do not diagnose or score yet, just understand it.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You diagnose how well a specific initiative is set up to EXECUTE across the 4A framework: Alignment (clear shared goal, unity across silos), Ability (leadership, talent, skills), Architecture (structures, processes, incentives that enable vs. impede), Agility (sensing and adapting to change). For each A, score execution readiness 0–100 for THIS initiative (be discerning, spread the scores, don't cluster), diagnose where it stands, and give the single highest-leverage fix. Be specific and honest: name the real weakness.`,
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

// ---------------------------------------------------------------------------
// 5) Balanced Scorecard (Kaplan & Norton) — OKRs + initiatives across the four
//    linked perspectives: Financial, Customer, Internal Process, Learning.
// ---------------------------------------------------------------------------
const SCORECARD: CanvasDef = {
  slug: "balanced-scorecard",
  exercise: "scorecard",
  name: "Balanced Scorecard",
  subjectLabel: "strategy",
  setupTitle: "The strategy or goal you're turning into a scorecard",
  setupHint: "One strategy you're responsible for delivering. Your AI partner will interview you, then build the scorecard across four linked perspectives.",
  setupPlaceholder: "e.g. Become the #1 self-serve product for small businesses within 18 months",
  interviewSystem: `You are a strategy advisor helping translate ONE strategy or goal into a Balanced Scorecard (Kaplan & Norton), essentially OKRs plus the initiatives to hit them, across four linked perspectives: Financial, Customer, Internal Process, and Learning & Growth. These form a cause-and-effect chain: investing in LEARNING & GROWTH improves internal PROCESSES, which improves the CUSTOMER experience, which drives FINANCIAL results.
Your job in this interview is to understand the strategy well enough to build that scorecard. Across the four perspectives, draw out: the Objective (what success looks like there), how they would MEASURE progress, and the Initiatives (what they'd actually do). Each key result is a MEASURE paired with a TARGET. Help them separate the two: first "how would you know you're making progress?" (the measure), then "what counts as enough?" (the target, a number and timeframe).
Actively help them think through the measures. A good measure is relevant, accurate, reliable, clear, timely, and cost-effective. Watch for the Wells Fargo trap: a single high-stakes measure tied to narrow incentives (like "sell eight accounts per customer") gets gamed; short-term-only or purely quantitative measures miss what matters. So probe: "Could this measure be gamed, and how?", "What would it miss?", and nudge toward a balanced set (leading and lagging, quantitative and qualitative). Also probe how the perspectives connect: which internal capability actually drives the customer and financial outcomes. Do not fill the scorecard yet, just understand the strategy, the metrics that matter, and the levers they have.`,
  draftSystem: `You translate a strategy into a Balanced Scorecard (Kaplan & Norton) = OKRs + initiatives across four LINKED perspectives (Financial, Customer, Internal Process, Learning & Growth) that form a cause-and-effect chain (Learning → Process → Customer → Financial). For EACH perspective write: one clear Objective; 2–3 Key Results, EACH split into a MEASURE (what you track) and a TARGET (a concrete number + timeframe); and 1–2 Initiatives (the work that moves them). Choose measures that are relevant, accurate, reliable, clear, timely, and cost-effective. Avoid a single gameable metric tied to narrow incentives (the Wells Fargo "Eight is Great" trap); balance leading and lagging, quantitative and qualitative. Make the perspectives LINK: the learning and process initiatives should plausibly drive the customer and financial results. Be specific to THIS strategy: no generic "increase revenue".`,
  fields: [
    { key: "fin_obj", label: "Objective", hint: "The financial result: revenue, margin, cost", kind: "long", group: "Financial", accent: "sage" },
    { key: "fin_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Financial", accent: "gold" },
    { key: "fin_init", label: "Initiatives", kind: "list", group: "Financial", accent: "plum" },
    { key: "cust_obj", label: "Objective", hint: "The value customers feel: why they choose and stay", kind: "long", group: "Customer", accent: "sage" },
    { key: "cust_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Customer", accent: "gold" },
    { key: "cust_init", label: "Initiatives", kind: "list", group: "Customer", accent: "plum" },
    { key: "proc_obj", label: "Objective", hint: "The few processes you must excel at", kind: "long", group: "Internal process", accent: "sage" },
    { key: "proc_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Internal process", accent: "gold" },
    { key: "proc_init", label: "Initiatives", kind: "list", group: "Internal process", accent: "plum" },
    { key: "learn_obj", label: "Objective", hint: "The people, skills, and tools that power it", kind: "long", group: "Learning & growth", accent: "sage" },
    { key: "learn_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Learning & growth", accent: "gold" },
    { key: "learn_init", label: "Initiatives", kind: "list", group: "Learning & growth", accent: "plum" },
  ],
  hasVerdict: { label: "The through-line: from learning to financial results" },
  about:
    "The Balanced Scorecard (Kaplan & Norton) turns a strategy into measurable objectives across four linked perspectives: Financial, Customer, Internal Process, and Learning & Growth. It's OKRs plus the initiatives to hit them: each perspective gets an Objective, Key Results (a Measure + a Target), and Initiatives. The four form a cause-and-effect chain: investing in learning improves process, which improves the customer experience, which drives financial results.",
  groupNotes: {
    Financial: "The results owners and investors see: revenue, margin, cost. The end of the chain.",
    Customer: "The value customers feel: what makes them choose and stay. This drives the financials.",
    "Internal process": "The few processes you must excel at to deliver that customer value.",
    "Learning & growth": "The people, skills, and tools that power the processes. The start of the chain.",
  },
  canvasTip: {
    title: "What makes a good measure?",
    items: [
      "Relevant, accurate, reliable, clear, timely, cost-effective.",
      "Balanced: pair leading with lagging, quantitative with qualitative.",
      "Could it be gamed? A single high-stakes metric tied to narrow incentives gets gamed. Wells Fargo's “Eight is Great” drove millions of fake accounts.",
      "The target is what counts as “enough progress”: a number and a timeframe.",
    ],
  },
};

// ---------------------------------------------------------------------------
// 6) Is This a Good Business? — a rigorous, framework-driven read on a venture:
//    Five Forces, VRIN, activity systems, profit pools + unit economics.
// ---------------------------------------------------------------------------
const VENTURE: CanvasDef = {
  slug: "good-business",
  exercise: "venture",
  name: "Is This a Good Business?",
  subjectLabel: "business idea",
  setupTitle: "The business you're thinking about starting",
  setupHint: "In a line or two: what it is and who it's for. Your AI partner will interview you, then analyze whether it's a good business.",
  setupPlaceholder: "e.g. A subscription meal-prep service for busy families in Austin",
  interviewSystem: `You are a sharp venture strategist and investor interviewing a founder about a business they're considering starting, to judge whether it's a GOOD business. Keep every question natural and concrete (NEVER name a framework or use jargon), but over the conversation make sure you understand each of these (the underlying lenses in brackets are for you only):
- The idea and the customer: who exactly it's for, what job it does for them, and what they do today instead. [buyer power, substitutes]
- Competition and entry: who else solves this, how crowded it is, and how easily a copycat or a big incumbent could move in. [rivalry, barriers to entry, Five Forces]
- The unfair advantage: what they'd have that's genuinely hard for others to get or copy, and whether it would last. [VRIN]
- How the pieces fit: the few things they'd do differently that reinforce each other and would be hard to imitate as a whole. [activity systems]
- Where the money is: in this kind of business, who actually keeps the profit along the chain: them, suppliers, platforms, landlords, distributors? [profit pools]
- The numbers: what they'd charge, what each sale costs them, how they'd get customers and what that might cost, how often customers buy or how long they stay, and how big and fast-growing the market is. [unit economics, TAM, growth]
Draw out real numbers wherever you can. Press gently for actual figures, not ranges. Do not analyze or give a verdict yet, just understand the idea, the market, and the economics.`,
  draftSystem: `You are a rigorous venture strategist producing an honest analysis of whether a business is a GOOD business, using core strategy frameworks (Porter's Five Forces, VRIN resources, activity-system fit, profit pools) and unit economics. Be QUANTITATIVE: use the numbers the founder gave; where a number is missing, make a clearly reasonable estimate and label it as an assumption. In the unit economics, compute and state: price, variable cost per unit, contribution margin (price − variable cost, and %), CAC, LTV, the LTV:CAC ratio, CAC payback period, and a rough break-even (customers or units/month). In the market, state TAM/SAM, the growth rate, and a realistic share. Score each lens 0–100 (be discerning, spread them). Name the 3–5 things that WOULD NEED TO BE TRUE for this to work (the make-or-break assumptions, stated so they could be tested), and the biggest risks. End with an honest verdict: is this a good business, and under what conditions. Be specific to THIS venture; no generic startup advice.`,
  ratings: [
    { key: "industry", label: "Industry attractiveness" },
    { key: "advantage", label: "Durable advantage" },
    { key: "coherence", label: "Strategic fit" },
    { key: "profit_pool", label: "Profit-pool position" },
  ],
  fields: [
    { key: "idea", label: "The idea & the customer", hint: "What it is, who it's for, and what they do today instead", kind: "long", group: "The idea", accent: "sage" },
    { key: "five_forces", label: "Industry: how attractive?", hint: "Rivalry, ease of entry, buyer & supplier power, substitutes: brutal or benign?", kind: "long", group: "Industry & advantage", accent: "gold" },
    { key: "advantage", label: "Your edge, and does it last?", hint: "Something valuable, rare, hard to copy, with no easy substitute", kind: "long", group: "Industry & advantage", accent: "sage" },
    { key: "activity_system", label: "How the pieces reinforce", hint: "The few choices that fit together and are hard to imitate as a system", kind: "long", group: "How you'd win", accent: "sage" },
    { key: "profit_pool", label: "Where the money actually sits", hint: "Who captures profit along the chain, and can you?", kind: "long", group: "How you'd win", accent: "gold" },
    { key: "market", label: "Market & growth", hint: "TAM / SAM, growth rate, realistic share", kind: "pairs", leftLabel: "Metric", rightLabel: "Value", group: "The numbers", accent: "plum" },
    { key: "would_need_true", label: "What would need to be true", hint: "The make-or-break assumptions, stated so they can be tested", kind: "list", group: "The verdict", accent: "sage" },
    { key: "risks", label: "Biggest risks", kind: "list", group: "The verdict", accent: "plum" },
  ],
  hasVerdict: { label: "Is this a good business?" },
  about:
    "A rigorous read on whether this is a good business, using core strategy frameworks: is the industry attractive (Five Forces), do you have a durable advantage (VRIN), do your choices reinforce each other (activity systems), and where does the money actually sit (profit pools), plus the unit economics. The output names the key numbers and the few things that would need to be true for it to work.",
  groupNotes: {
    "The idea": "What you'd sell, to whom, and what they do today instead.",
    "Industry & advantage": "Is the game worth playing (Five Forces), and do you have an edge that lasts (VRIN)?",
    "How you'd win": "Do your choices reinforce each other (activity system), and can you capture the profit (profit pools)?",
    "The numbers": "The economics that decide it, and the market that has to be there.",
    "The verdict": "The make-or-break assumptions to test, and what could sink it.",
  },
  canvasTip: {
    title: "What makes a business “good”?",
    items: [
      "Attractive industry: not brutally competitive, and hard for others to enter.",
      "A durable edge (valuable, rare, and hard to copy) that lasts, not just a head start.",
      "Coherent activities that reinforce each other and are hard to imitate as a whole.",
      "You keep the profit: it doesn't all leak to suppliers, platforms, landlords, or a price war.",
      "Economics that work: LTV well above CAC (aim ≥ 3×), payback in months, a real path to break-even.",
    ],
  },
  calculator: {
    kind: "unit-economics",
    inputs: [
      { key: "price", label: "Price per sale", prefix: "$" },
      { key: "varCost", label: "Variable cost per sale", prefix: "$" },
      { key: "ordersPerMonth", label: "Purchases / customer / month", suffix: "/mo" },
      { key: "retentionMonths", label: "Avg. customer lifetime", suffix: "mo" },
      { key: "cac", label: "Customer acquisition cost", prefix: "$" },
      { key: "fixedMonthly", label: "Fixed costs / month", prefix: "$" },
    ],
  },
};

// ---------------------------------------------------------------------------
// 7) Dual Uncertainty Canvas (deep tech: technical × market uncertainty)
// ---------------------------------------------------------------------------
const DEEPTECH: CanvasDef = {
  slug: "deeptech-canvas",
  exercise: "deeptech",
  name: "Dual Uncertainty Canvas",
  subjectLabel: "technology",
  setupTitle: "The deep-tech technology you're commercializing",
  setupHint: "A novel physical, material, chemical, or biological capability. Describe it as it exists today. Your AI partner will interview you about it.",
  setupPlaceholder: "e.g. A solid-state electrolyte that enables non-flammable, high-density batteries",
  interviewSystem: `You are a sharp deep-tech commercialization advisor interviewing a founder/scientist to fill the Dual Uncertainty Canvas (Duke University). Deep tech faces TWO uncertainties at once, and your job is to separate them:
- TECHNICAL uncertainty ("can we make it work?"): the gap between what the technology does today and what a real application requires.
- MARKET uncertainty ("will anyone actually buy it?"): whether specific customers want it enough to switch and pay.
Ground the conversation in this framework:
- Anchor on the technology AS IT EXISTS TODAY: its core new capability, its 2–3 key quantitative performance parameters, and which of those parameters trade off against each other. Do not let them describe speculative future applications yet.
- Push for CUSTOMER EVIDENCE, not vision: who specifically would buy this, what they do today instead, and what real conversations/signals suggest they want it. Quantify the economic value in dollars/time where possible.
- For a candidate application, separate the TECHNICAL gap (which metric must improve, by how much, and the known unknowns) from the MARKET gap (adoption barriers, sales cycle, regulation).
- Probe PATH DEPENDENCY: optimizing the technology for one application locks in equipment, expertise, and design choices that may not transfer. Surface what would be hard to reverse.
- Probe the FUNDER fit implicitly: time to first deployment, time to first revenue, and capital to technical validation.
Interview craft: ask exactly ONE short, open question at a time and follow their lead; pull concrete detail, not generalities. Do not lecture or fill the canvas yet.
After about 7 exchanges, reflect the dual-uncertainty picture back, ask what you missed, then close.`,
    interviewTurns: 7,
  draftSystem: `You fill the Dual Uncertainty Canvas (Duke University) for a deep-tech venture. Apply its logic rigorously:
- Describe the technology only as it exists today; keep speculation out of Section 1.
- Everywhere, SEPARATE technical uncertainty ("can we make it work?") from market uncertainty ("will anyone buy it?"). Name which one dominates.
- Choose the PRIORITY application by combined technical readiness AND market certainty (the lowest-risk path forward), and justify it.
- Design a MINIMUM VIABLE EXPERIMENT that resolves the DOMINANT uncertainty first: the simplest test, with an explicit success signal and kill criterion, and the resources it needs. Favor the experiment that, if it fails, saves the most wasted effort downstream.
- Make the IRREVERSIBILITIES explicit: the performance targets being committed to, the capabilities sacrificed, the switching costs of a later pivot, and what a "useful failure" would still teach.
- Match FUNDERS to the uncertainty/timeline profile honestly: government grants (high technical risk, long horizon), corporate partners (clear business fit, 1–3 yrs), early customers/co-development (working prototype soon), venture capital (large proven market, defensible edge), or philanthropic/impact (mission, uncertain returns).
- The verdict must state which uncertainty dominates and the single next experiment to run.`,
  fields: [
    { key: "core_function", label: "Core technical function", hint: "One sentence: the new physical/material/chemical/biological capability that wasn't previously possible or practical", kind: "long", group: "The technology", accent: "sage" },
    { key: "key_parameters", label: "Key technical parameters", hint: "The 2–3 most important quantitative performance metrics (e.g. sensitivity, strength, yield, precision)", kind: "list", group: "The technology", accent: "sage" },
    { key: "tradeoffs", label: "Technical trade-offs", hint: "Which performance metrics are in tension with each other?", kind: "long", group: "The technology", accent: "sage" },
    { key: "candidate_applications", label: "Candidate applications", hint: "The real-world problems well-matched to the technology's current capabilities (one line each)", kind: "list", group: "Where it could go", accent: "gold" },
    { key: "customer_evidence", label: "Customer evidence", hint: "Who specifically would buy this, and what real signals show they want it, not vision", kind: "long", group: "Where it could go", accent: "gold" },
    { key: "economic_value", label: "Economic value & alternatives", hint: "How much value it creates (quantified), what customers do today, and why they'd switch", kind: "long", group: "Where it could go", accent: "gold" },
    { key: "technical_gap", label: "Technical gap & known unknowns", hint: "The gap between current performance and what the priority application needs (which metric, by how much), and the key questions you can't answer today", kind: "long", group: "Where it could go", accent: "gold" },
    { key: "priority_application", label: "The priority application", hint: "The one with the highest combined technical readiness and market certainty (the lowest-risk path), and why", kind: "long", group: "The priority bet", accent: "plum" },
    { key: "primary_uncertainty", label: "The dominant uncertainty", hint: "Technical (can we make it work?), Market (will they buy?), or Both, and exactly what it is", kind: "long", group: "The minimum viable experiment", accent: "clay" },
    { key: "the_experiment", label: "The minimum viable experiment", hint: "The simplest test of that uncertainty: setup, the success signal, the kill criterion, and the resources needed", kind: "long", group: "The minimum viable experiment", accent: "clay" },
    { key: "performance_commitments", label: "Performance commitments", hint: "The 2–3 metrics that will drive all development decisions if you optimize for this path", kind: "list", group: "Commitments & irreversibilities", accent: "plum" },
    { key: "sacrifices", label: "Sacrificed capabilities", hint: "What other performance characteristics or applications you give up by optimizing for this path", kind: "long", group: "Commitments & irreversibilities", accent: "plum" },
    { key: "switching_costs", label: "Switching costs", hint: "If you pivot in 12–24 months, what's hard or impossible to change: equipment, expertise, partnerships, design lock-in", kind: "long", group: "Commitments & irreversibilities", accent: "plum" },
    { key: "useful_failure", label: "Useful failure", hint: "If this application fails, what you'd need to learn to make the effort worthwhile: knowledge that transfers", kind: "long", group: "Commitments & irreversibilities", accent: "plum" },
    { key: "resource_requirements", label: "Resource requirements", hint: "Time to first real-world deployment, time to first revenue, and capital to reach technical validation", kind: "long", group: "Who funds this", accent: "sage" },
    { key: "funder_match", label: "Funder match", hint: "Which funder type(s) realistically fit your uncertainty profile and timeline (grants, corporate, early customers, VC, philanthropic), and why", kind: "long", group: "Who funds this", accent: "sage" },
    { key: "one_sentence_strategy", label: "One-sentence strategy", hint: "We are developing [capability] for [application], resolving [uncertainty] through [experiment] to demonstrate [signal] within [timeline]", kind: "long", group: "The strategy", accent: "gold" },
  ],
  hasVerdict: { label: "The dominant uncertainty, and the single experiment to run next" },
  frontier: {
    mode: "quadrant",
    heading: "The dual-uncertainty map",
    xLabel: "Market uncertainty →",
    yLabel: "Technical uncertainty →",
    xDesc: "x = MARKET uncertainty (0 = customers proven, they clearly want and will pay for this; 100 = you don't yet know if anyone will buy)",
    yDesc: "y = TECHNICAL uncertainty (0 = it demonstrably works at the required performance; 100 = core technical feasibility is unproven)",
    quadrants: {
      bl: "Proven both ways → scale it (venture / growth capital)",
      br: "Tech works, demand unproven → find the buyer (early customers, corporates)",
      tl: "Demand clear, tech unproven → de-risk the tech (grants, corporate R&D)",
      tr: "Both unknown → a frontier bet (government / DARPA / deep-tech VC)",
    },
  },
  about:
    "The Dual Uncertainty Canvas (Duke University): deep tech faces two uncertainties at once: technical (can we make it work?) and market (will anyone buy it?). Progress means resolving the dominant one with the smallest, fastest experiment; choosing a priority application with eyes open to the path dependencies it locks in; and matching funders to your uncertainty profile. This canvas walks one technology through that choice.",
  groupNotes: {
    "The technology": "The new capability as it exists today: its real parameters and the trade-offs between them. No speculation yet.",
    "Where it could go": "Match the technology to real problems, with customer evidence and a separated technical vs. market gap.",
    "The priority bet": "One application: the lowest-risk combination of technical readiness and market certainty.",
    "The minimum viable experiment": "Resolve the dominant uncertainty first, with the test that saves the most wasted effort if it fails.",
    "Commitments & irreversibilities": "Deep-tech application choices create path dependencies. Commit with eyes open to what you can't easily undo.",
    "Who funds this": "Different funders accept different uncertainties. Match the money to your risk profile and timeline.",
    "The strategy": "The whole canvas, distilled to one testable sentence.",
  },
  canvasTip: {
    title: "Deep tech has two uncertainties: resolve the dominant one",
    items: [
      "Separate technical (can we make it work?) from market (will they buy?) at every step.",
      "Run the experiment that, if it fails, saves the most wasted effort downstream.",
      "Early application choices lock in equipment, expertise, and design. Pivot costs are real.",
      "Match funders to your uncertainty: grants for technical risk, customers/VC for market-proven paths.",
    ],
  },
};

// ===========================================================================
// Research modules — frameworks from Sharique Hasan's "Research, Strategy"
// turned into the same Solo + AI canvas exercise. Audience: PhD students and
// early-career researchers.
// ===========================================================================

// (b) What is a research paper? — make the invisible visible
const PAPER_IDEA: CanvasDef = {
  slug: "what-is-a-paper",
  exercise: "paper-idea",
  name: "Make the Invisible Visible",
  subjectLabel: "study",
  setupTitle: "The study or idea you're working on",
  setupHint:
    "A paper you're writing, or a hunch you're chasing. Your AI partner will interview you to find the invisible force it makes visible.",
  setupPlaceholder: "e.g. Whether startups that adopt A/B testing grow faster than those that don't",
  interviewSystem: `You are a seasoned social-science advisor helping a researcher articulate what their paper actually IS, using Hasan's frame from "Research, Strategy":
- Research uncovers and explains the forces that govern our social and physical worlds, both VISIBLE and INVISIBLE. A research idea is a UNIQUE INSIGHT into why the facts are what they are: it addresses something previously UNEXPLAINED, OVERLOOKED, or MISUNDERSTOOD.
- An idea takes one of two forms: (1) ESTABLISHING A NEW FACT (e.g. the large productivity dispersion across firms), or (2) EXPLAINING A KNOWN FACT (e.g. management practices, or resource access, explain that dispersion).
- The strongest insight names an INVISIBLE force and makes it visible through evidence.
Interview to surface: the phenomenon they observe; the hidden force or mechanism behind it; whether they are establishing a new fact or explaining a known one; what prior work overlooked or got wrong; and the single insight in one sentence. Ask exactly ONE short, open question at a time; follow their lead; pull concrete detail. Do not fill the canvas or lecture.`,
  draftSystem: `You fill a canvas that states what a paper IS, using Hasan's frame (an idea is a unique insight into why the facts are what they are; it establishes a new fact or explains a known one; it makes an invisible force visible). Be specific to THEIR study. The one-sentence insight must be sharp, falsifiable, and non-generic: name the invisible force and what becomes visible.`,
  fields: [
    { key: "phenomenon", label: "The phenomenon", hint: "What you observe in the world that puzzles you", kind: "long", group: "What you see", accent: "sage" },
    { key: "invisible_force", label: "The invisible force", hint: "The hidden force or mechanism you think shapes it", kind: "long", group: "What you see", accent: "gold" },
    { key: "idea_type", label: "New fact, or known fact explained?", hint: "Are you establishing a fact people don't know, or explaining one they do?", kind: "text", group: "Why it's an idea", accent: "plum" },
    { key: "overlooked", label: "What's been overlooked or misunderstood", hint: "What prior work missed, ignored, or got wrong", kind: "long", group: "Why it's an idea", accent: "plum" },
    { key: "insight", label: "Your insight, in one sentence", hint: "Why the facts are what they are, the invisible made visible", kind: "long", group: "The insight", accent: "sage" },
    { key: "who_cares", label: "Who should care, and why", hint: "The scholars, and the world, this changes something for", kind: "list", group: "The insight", accent: "sage" },
  ],
  hasVerdict: { label: "The invisible force you make visible" },
  about:
    'Hasan, "Research, Strategy": research uncovers the visible and invisible forces that govern our world. A research idea is a unique insight into why the facts are what they are, it establishes a new fact or explains a known one. This canvas turns your study into that one insight.',
  groupNotes: {
    "What you see": "The puzzle in the world, and the hidden force you suspect is behind it.",
    "Why it's an idea": "An idea addresses something unexplained, overlooked, or misunderstood.",
    "The insight": "One sharp sentence: the invisible force, made visible.",
  },
};

// (d) The structure of an academic paper — the hourglass
const PAPER_STRUCTURE: CanvasDef = {
  slug: "paper-structure",
  exercise: "paper-structure",
  name: "Structure Your Paper",
  subjectLabel: "paper",
  setupTitle: "The paper you're structuring",
  setupHint:
    "The paper you're writing or rewriting. Your AI partner will interview you and lay it out as an hourglass.",
  setupPlaceholder: "e.g. Experimentation and startup performance: evidence from A/B testing",
  interviewSystem: `You are a writing coach helping a researcher structure a paper using Hasan's HOURGLASS from "Research, Strategy":
- A paper opens BROAD (motivation: the big question, why anyone cares), narrows to the PROBLEM (the specific gap), states the APPROACH (method and data in a sentence) and the FINDINGS, then widens back out to the CONTRIBUTION (what we learn and who should pay attention).
- The body has five sections, each with a job: INTRODUCTION (motivate and state the question), THEORY / HYPOTHESES (a null model, then non-obvious claims), DATA & METHODS (context, measures, estimation), RESULTS (main findings, mechanism checks, robustness), DISCUSSION (summary, meaning and contribution, limitations).
Interview to pull, for THIS paper: the big question and why it matters; the specific gap; the approach in one line; the headline finding; the contribution; and anything unusual about its theory, data, or results. Ask exactly ONE short, open question at a time; follow their lead. Do not lecture or fill the canvas.`,
  draftSystem: `You lay out a paper as an hourglass (motivation, problem, approach, findings, contribution) and map its five sections (Intro, Theory, Data & Methods, Results, Discussion) to what each must accomplish for THIS paper. Be concrete and paper-specific, never generic boilerplate.`,
  fields: [
    { key: "motivation", label: "Motivation", hint: "The big question, and why anyone should care", kind: "long", group: "The hourglass", accent: "sage" },
    { key: "problem", label: "Problem", hint: "The specific gap this paper addresses", kind: "long", group: "The hourglass", accent: "gold" },
    { key: "approach", label: "Approach", hint: "What you do, data and method in a sentence", kind: "long", group: "The hourglass", accent: "gold" },
    { key: "findings", label: "Findings", hint: "What you find, the headline result", kind: "long", group: "The hourglass", accent: "gold" },
    { key: "contribution", label: "Contribution", hint: "What we learn, and who should pay attention", kind: "long", group: "The hourglass", accent: "sage" },
    { key: "section_jobs", label: "What each section must do", hint: "Intro, Theory, Data & Methods, Results, Discussion: the job of each for this paper", kind: "pairs", group: "The section map", accent: "plum", leftLabel: "Section", rightLabel: "Its job in this paper" },
  ],
  hasVerdict: { label: "Your paper in one line" },
  about:
    'Hasan, "Research, Strategy": think of a paper as an hourglass, broad motivation narrowing to the problem, approach, and findings, then widening to the contribution. Five sections, each with one job. This canvas lays your paper out that way.',
  groupNotes: {
    "The hourglass": "Broad, then narrow, then broad: motivation, problem, approach, findings, contribution.",
    "The section map": "Intro motivates; Theory makes a non-obvious claim; Data & Methods earns trust; Results show the pattern; Discussion says what we learn.",
  },
};

// (e) Making points — one paragraph, one point
const PAPER_POINTS: CanvasDef = {
  slug: "making-points",
  exercise: "paper-points",
  name: "Make Your Points",
  subjectLabel: "paper",
  setupTitle: "The paper whose argument you're sharpening",
  setupHint:
    "A paper you're writing. Your AI partner will help you reduce it to the five points every paper makes, in parallel.",
  setupPlaceholder: "e.g. My paper on how A/B testing changes which startups succeed",
  interviewSystem: `You help a researcher make their FIVE POINTS, using Hasan's "Research, Strategy". A paper is FIVE POINTS in a repeated, parallel structure — they appear in the abstract, again in the introduction, and again across the paper, always in the same order:
1. MOTIVATION — motivate the study; why the topic matters.
2. THE PUZZLE — stated as a violated expectation: "We believe X about the world. If that were true, we would see Z. But we actually see R." The gap between Z (what the conventional view predicts) and R (what we observe) IS the puzzle.
3. YOUR SOLUTION — the key thing people are missing about the world; your insight that resolves the puzzle.
4. EVIDENCE — what data you used, and what evidence you found.
5. IMPLICATIONS — who cares, what changes because we know this, which literatures it speaks to, and how we should see the world differently.
Interview to pull each point, and especially to sharpen the puzzle into the belief → prediction → observation form. Ask exactly ONE short question at a time; make them state each point as ONE crisp sentence, no hedging.`,
  draftSystem: `You write a paper's argument as FIVE PARALLEL POINTS (Hasan): motivation; the puzzle as "We believe X; if true we'd see Z; but we see R"; your solution (the insight people miss); the evidence (data + finding); and the implications (who cares, what changes, which literatures, how to see the world differently). Each point is ONE sharp assertable sentence. The puzzle MUST use the belief → prediction → observation structure. No hedging, no summaries.`,
  fields: [
    { key: "motivation", label: "1 · Motivation", hint: "Motivate the study — why the topic matters", kind: "long", group: "1 · Motivation", accent: "sage" },
    { key: "belief", label: "We believe…", hint: "The conventional view of how the world works", kind: "long", group: "2 · The puzzle", accent: "gold" },
    { key: "predict", label: "…if true, we'd see…", hint: "What that view predicts we should observe (Z)", kind: "long", group: "2 · The puzzle", accent: "gold" },
    { key: "observe", label: "…but we actually see", hint: "What we really observe (R) — the gap is the puzzle", kind: "long", group: "2 · The puzzle", accent: "clay" },
    { key: "solution", label: "3 · Your solution", hint: "The key thing people miss about the world — your insight", kind: "long", group: "3 · The solution", accent: "plum" },
    { key: "evidence", label: "4 · Evidence", hint: "What data you used, and what you found", kind: "long", group: "4 · Evidence", accent: "sage" },
    { key: "implications", label: "5 · Implications", hint: "Who cares, what changes, which literatures, how to see the world differently", kind: "long", group: "5 · Implications", accent: "gold" },
  ],
  hasVerdict: { label: "Your paper in one sentence" },
  about:
    'Hasan, "Research, Strategy": a paper is five points in a repeated, parallel structure — motivation, the puzzle (we believe X; if true we\'d see Z; but we see R), your solution, the evidence, and the implications. This canvas reduces your paper to those five.',
  groupNotes: {
    "1 · Motivation": "Why the topic matters — the reason to read on.",
    "2 · The puzzle": "A violated expectation: we believe X, which predicts Z, but we see R.",
    "3 · The solution": "The insight people are missing that resolves the puzzle.",
    "4 · Evidence": "The data, and what it showed.",
    "5 · Implications": "Who cares, what changes, and how to see the world differently.",
  },
};

// (g) What makes a paper good — the null, the hidden factor, and four tests
const GOODNESS: CanvasDef = {
  slug: "good-research",
  exercise: "research-quality",
  name: "What Makes a Paper Good",
  subjectLabel: "idea",
  setupTitle: "The idea or paper you want to judge",
  setupHint:
    "A paper you're writing, or an idea you're weighing. Your AI partner will interview you, then judge it honestly against what makes research good.",
  setupPlaceholder: "e.g. Startups that adopt A/B testing grow faster, especially with experienced managers",
  interviewSystem: `You are a seasoned advisor judging whether a research idea or paper is GOOD, using Sharique Hasan's frame from "Research, Strategy". A good idea does three things:
- MAKES THE INVISIBLE VISIBLE against a clear NULL: there is a conventional wisdom, a way most people assume the world works, and the idea overturns or complicates it. If there is no clear null, the idea has nothing to push against.
- SEES WHAT OTHERS DON'T: a hidden factor that works in some cases and not others, i.e. IF X then Y, especially or except when Z, because a mechanism (an interaction, not just a main effect).
- Then the EXECUTION shows four qualities:
  1. IMPORTANT — do adults care? Does it matter to real people and the world, not just to a niche literature?
  2. INTERESTING — is it deep enough to sustain a long conversation or debate? Real nuance and contingency, not a one-line result.
  3. AMBITIOUS — could hardly anyone else do this? Does it require rare data, skill, access, or creativity?
  4. CRAFT — is every detail right? Pristine data, clean identification, elegant figures, every i dotted.
Interview to surface: the null (what's the conventional wisdom here?), the hidden factor, and honest evidence for each of the four qualities. Ask ONE short, open question at a time; go breadth-first across the four; pull concrete detail, not self-praise. Do not score or lecture yet.`,
  draftSystem: `You judge how good a research idea or paper is, using Hasan's frame (a clear null; a nonobvious hidden factor / interaction; and the four execution qualities Important, Interesting, Ambitious, Craft). Be honest and calibrated: most work is not a 90. Name the null and the hidden factor plainly. For each of the four qualities give a short, specific read (what's strong or weak) and the single highest-leverage move to raise it. Score each 0-100. The verdict names whether it's good and the ONE weakest link to fix first. No flattery.`,
  fields: [
    { key: "null_model", label: "The null (conventional wisdom)", hint: "What most people assume is true — the world-as-expected this pushes against", kind: "long", group: "The idea", accent: "sage" },
    { key: "hidden_factor", label: "What you see that others don't", hint: "The hidden factor: IF X then Y, especially or except when Z, because a mechanism", kind: "long", group: "The idea", accent: "gold" },
    { key: "important_read", label: "Important — do adults care?", hint: "Why it matters to real people and the world, or why it doesn't yet", kind: "long", group: "The four tests", accent: "sage" },
    { key: "interesting_read", label: "Interesting — depth and debate", hint: "The nuance and contingency that could sustain a long conversation", kind: "long", group: "The four tests", accent: "gold" },
    { key: "ambitious_read", label: "Ambitious — could anyone else do this?", hint: "The rare data, skill, access, or creativity it takes", kind: "long", group: "The four tests", accent: "plum" },
    { key: "craft_read", label: "Craft — is every detail right?", hint: "Data quality, identification, figures, the finish", kind: "long", group: "The four tests", accent: "clay" },
    { key: "fixes", label: "What to do first", hint: "The highest-leverage moves to raise the weakest tests", kind: "list", group: "The call", accent: "gold" },
  ],
  ratings: [
    { key: "important", label: "Important" },
    { key: "interesting", label: "Interesting" },
    { key: "ambitious", label: "Ambitious" },
    { key: "craft", label: "Craft" },
  ],
  hasVerdict: { label: "Is it good, honestly, and the weakest link" },
  about:
    'Hasan, "Research, Strategy": a good idea makes the invisible visible against a clear null, sees a hidden factor others miss (an interaction, not just a main effect), and is executed to be Important, Interesting, Ambitious, and full of Craft. This canvas judges yours against all of that, honestly.',
  groupNotes: {
    "The idea": "A clear null to push against, and the hidden factor you see that others don't.",
    "The four tests": "Important (do adults care), Interesting (deep enough to debate), Ambitious (few could do it), Craft (every detail right).",
    "The call": "The honest verdict and the one weakest link to fix first.",
  },
};

// (h) Clear regression tables
const REG_TABLES: CanvasDef = {
  slug: "regression-tables",
  exercise: "reg-tables",
  name: "Clear Regression Tables",
  subjectLabel: "table",
  setupTitle: "The regression table you want to make clear",
  setupHint: "Describe the finding your main table reports. Your AI partner will help you make it readable at a glance.",
  setupPlaceholder: "e.g. A/B testing raises product launches, and the effect is larger for experienced founders",
  interviewSystem: `You help a researcher make a regression table CLEAR, so a reader sees the finding in seconds. Principles: one idea per table; spotlight the key coefficient (usually the interaction), don't bury it in a wall of numbers; build the columns as a narrative (baseline → add controls → add the interaction) so the reader watches the result survive; use human variable names, not code; report only what matters (coefficient, standard error or stars, N, R², fixed effects) and cut the rest; put the sample, the standard-error type, and units in a clear note. Interview to learn: the outcome, the key coefficient to spotlight, the columns/specifications, the controls and fixed effects, the sample, and what a reader should take away in ten seconds. Ask ONE short question at a time; do not lecture.`,
  draftSystem: `You lay out a clear regression-table PLAN (not the numbers). Spotlight the key coefficient; design the columns as a narrative; name variables in plain language; specify exactly what to report and what to cut; write the table note (N, R², fixed effects, SE type, stars, units). Be specific to their finding, never generic.`,
  fields: [
    { key: "finding", label: "The finding the table must show", hint: "the one result a reader should leave with", kind: "long", group: "The point", accent: "sage" },
    { key: "key_coef", label: "The coefficient to spotlight", hint: "usually the interaction — the number that IS the idea", kind: "long", group: "The point", accent: "gold" },
    { key: "columns", label: "The columns, as a narrative", hint: "baseline → add controls → add the interaction, so the result survives each step", kind: "list", group: "The layout", accent: "plum" },
    { key: "report", label: "What to report", hint: "coefficient, SE or stars, N, R², fixed effects, and units", kind: "list", group: "The layout", accent: "sage" },
    { key: "cut", label: "What to cut", hint: "control coefficients and rows that only add noise", kind: "list", group: "The layout", accent: "clay" },
    { key: "note", label: "The table note", hint: "sample, SE type, stars, fixed effects, units — everything a reader needs", kind: "long", group: "The layout", accent: "gold" },
  ],
  hasVerdict: { label: "Can a reader see the finding in ten seconds?" },
  about:
    'A clear regression table shows the finding at a glance: one idea, the key coefficient spotlighted, columns that build a narrative, human variable names, and only what matters. Part of the craft that separates good papers from the rest (Hasan, "Research, Strategy").',
  groupNotes: {
    "The point": "One idea per table, with the key coefficient (usually the interaction) spotlighted.",
    "The layout": "Columns that build a narrative, plain variable names, and only the numbers that matter.",
  },
};

// (i) Elegant research graphs
const RESEARCH_GRAPHS: CanvasDef = {
  slug: "research-graphs",
  exercise: "research-graphs",
  name: "Elegant Research Graphs",
  subjectLabel: "graph",
  setupTitle: "The finding you want to show in a graph",
  setupHint: "Describe the one thing your graph must prove. Your AI partner will help you design it so the finding is obvious.",
  setupPlaceholder: "e.g. The effect of A/B testing on growth, and how it depends on managerial experience",
  interviewSystem: `You help a researcher design a research graph where the GRAPH IS THE ARGUMENT — a reader sees the finding directly. Principles (Tufte): maximize the data-ink ratio and cut chartjunk; one message per graph; choose the encoding that shows the claim (an interaction → two lines or a marginal-effects plot; a distribution → a histogram; a trend → a line); label axes and series clearly and directly; keep it honest (no truncated axes, show baselines and uncertainty); make it readable in grayscale. Interview to learn: the single message, the data behind it, and what shape would show it. Ask ONE short question at a time.`,
  draftSystem: `You recommend ONE graph that makes the finding obvious. Name the chart type and WHY it fits the claim; put the right thing on each axis; name the single message; say what to strip (chartjunk) and how to keep it honest (uncertainty, baselines, no truncated axes); write the caption. Prefer showing an interaction as slopes or marginal effects when relevant.`,
  fields: [
    { key: "message", label: "The one message", hint: "the single thing the graph must prove", kind: "long", group: "The point", accent: "sage" },
    { key: "chart", label: "The right chart, and why", hint: "e.g. an interaction → two lines or a marginal-effects plot", kind: "long", group: "The design", accent: "gold" },
    { key: "axes", label: "What goes on each axis", hint: "x, y, and how the groups are shown", kind: "long", group: "The design", accent: "plum" },
    { key: "strip", label: "What to strip", hint: "chartjunk: gridlines, 3D, boxes, legends you could label directly (Tufte)", kind: "list", group: "The design", accent: "clay" },
    { key: "honest", label: "Keep it honest", hint: "show uncertainty, don't truncate axes, mark the baseline", kind: "list", group: "The design", accent: "sage" },
    { key: "caption", label: "The caption", hint: "what the reader is looking at, in a sentence or two", kind: "long", group: "The design", accent: "gold" },
  ],
  hasVerdict: { label: "Does the graph make the finding obvious?" },
  about:
    'A good research graph is the argument: it shows the finding directly and elegantly, with nothing wasted (Tufte\'s data-ink ratio). Part of the craft of elegant figures (Hasan, "Research, Strategy").',
  groupNotes: {
    "The point": "One message per graph — the single thing it must prove.",
    "The design": "The encoding that shows the claim, stripped of chartjunk, and honest about uncertainty.",
  },
};

// (j) Position your literature review
const LIT_REVIEW: CanvasDef = {
  slug: "literature-reviews",
  exercise: "lit-review",
  name: "Position Your Literature Review",
  subjectLabel: "paper",
  setupTitle: "The paper whose literature you're reviewing",
  setupHint: "Your AI partner will help you turn the review from a summary into a setup for your contribution.",
  setupPlaceholder: "e.g. My paper on how experimentation changes which startups succeed",
  interviewSystem: `You help a researcher write a literature review that POSITIONS their contribution, not a summary dump, using Hasan's "Research, Strategy". A literature review does two jobs: (1) SUPPORT your claims with prior research — anchor your work in the ongoing conversation, and cite the foundational assumptions your argument rests on but doesn't itself test; (2) HIGHLIGHT THE GAP — where prior work falls short — which sets up your unique contribution. Organize by IDEAS AND TENSIONS, not paper-by-paper. Interview to learn: their contribution, the two or three literatures they sit in, what prior work established, the specific gap, and the foundational claims they need to cite. Ask ONE short question at a time.`,
  draftSystem: `You structure a literature review that sets up the contribution. Name the 2-3 literatures; summarize what each established (the support); pinpoint the gap that becomes their contribution; list the foundational assumptions to cite; and organize the review by ideas and tensions, not by paper. Be specific; never a generic "prior work has shown".`,
  fields: [
    { key: "contribution", label: "Your contribution", hint: "what your paper adds that the literature doesn't have", kind: "long", group: "The setup", accent: "sage" },
    { key: "literatures", label: "The literatures you sit in", hint: "the 2-3 conversations your paper joins", kind: "list", group: "The setup", accent: "gold" },
    { key: "established", label: "What prior work established", hint: "the support: what's already known that you build on", kind: "long", group: "The review", accent: "sage" },
    { key: "gap", label: "The gap", hint: "where prior work falls short — the opening for your contribution", kind: "long", group: "The review", accent: "clay" },
    { key: "foundational", label: "Foundational claims to cite", hint: "assumptions your argument rests on but doesn't test", kind: "list", group: "The review", accent: "plum" },
    { key: "organize", label: "Organize by ideas, not papers", hint: "the tensions and themes that structure the review", kind: "list", group: "The review", accent: "gold" },
  ],
  hasVerdict: { label: "Does it set up your contribution, or just summarize?" },
  about:
    'A literature review supports your claims with prior research and highlights the gap that becomes your contribution — organized by ideas and tensions, not paper by paper (Hasan, "Research, Strategy").',
  groupNotes: {
    "The setup": "Your contribution, and the two or three literatures your paper joins.",
    "The review": "What prior work established, the gap you fill, and the foundations you cite — organized by ideas.",
  },
};

// (k) Is your data a moat? — VRIN+O for data
const DATA_MOAT: CanvasDef = {
  slug: "data-moat",
  exercise: "vrino",
  name: "Is Your Data a Moat?",
  subjectLabel: "dataset",
  setupTitle: "The dataset behind your research",
  setupHint: "A dataset you have, or could build. Your AI partner will judge whether it's a real research advantage.",
  setupPlaceholder: "e.g. A panel of startups' A/B-testing adoption linked to growth and product launches",
  interviewSystem: `You judge whether a research dataset is a genuine advantage, using Hasan's VRIN+O framework from "Research, Strategy" — the resource-based view applied to data, with willingness-to-PUBLISH standing in for willingness-to-pay:
- VALUABLE: does it let you publish what others can't — better MEASUREMENT, credible CAUSALITY, GENERALIZABILITY to an important population, fine DETAIL (a step-by-step causal chain), or LONG-TERM coverage?
- RARE: do few others have it?
- INIMITABLE: is it hard or costly for others to reproduce (path-dependent access, relationships, a one-time event)?
- NON-SUBSTITUTABLE: could someone answer the same question with a different, easier dataset?
- ORGANIZED: are you positioned to capture the value — the skills, coauthors, and pipeline to actually publish from it?
Interview to surface honest evidence on each. Ask ONE short question at a time; pull specifics, not self-praise.`,
  draftSystem: `You assess a dataset as a research moat with VRIN+O (willingness-to-publish for value). Score each dimension 0-100 honestly. Name what the data lets them publish that others can't, and the weakest dimension to shore up. No inflation.`,
  fields: [
    { key: "what_it_is", label: "What the data is", hint: "the unit, the coverage, how you got it", kind: "long", group: "The asset", accent: "sage" },
    { key: "valuable_read", label: "Valuable — willingness to publish", hint: "measurement, causality, generalizability, detail, long-term", kind: "long", group: "The five tests", accent: "sage" },
    { key: "rare_read", label: "Rare", hint: "how few others have it", kind: "long", group: "The five tests", accent: "gold" },
    { key: "inimitable_read", label: "Inimitable", hint: "how hard it is to reproduce", kind: "long", group: "The five tests", accent: "plum" },
    { key: "nonsub_read", label: "Non-substitutable", hint: "whether an easier dataset answers the same question", kind: "long", group: "The five tests", accent: "clay" },
    { key: "organized_read", label: "Organized", hint: "are you positioned to publish from it (skills, coauthors, pipeline)", kind: "long", group: "The five tests", accent: "sage" },
    { key: "edge", label: "The edge", hint: "what this data lets you publish that others can't", kind: "long", group: "The moat", accent: "gold" },
    { key: "shore_up", label: "What to shore up", hint: "the weakest dimension, and how to strengthen it", kind: "list", group: "The moat", accent: "clay" },
  ],
  ratings: [
    { key: "valuable", label: "Valuable" },
    { key: "rare", label: "Rare" },
    { key: "inimitable", label: "Inimitable" },
    { key: "nonsub", label: "Non-substitutable" },
    { key: "organized", label: "Organized" },
  ],
  hasVerdict: { label: "Is your data a real advantage?" },
  about:
    'Hasan, "Research, Strategy": treat data as a strategic resource. Using VRIN+O (the resource-based view) with willingness-to-publish for value, a dataset is a moat when it is Valuable, Rare, Inimitable, Non-substitutable, and you are Organized to publish from it.',
  groupNotes: {
    "The asset": "What the data is and how you got it.",
    "The five tests": "VRIN+O: valuable to publish, rare, inimitable, non-substitutable, organized.",
    "The moat": "What it lets you publish that others can't, and the weakest link.",
  },
};

// (l) Choose your data strategy
const DATA_STRATEGY: CanvasDef = {
  slug: "data-strategy",
  exercise: "data-strategy",
  name: "Choose Your Data Strategy",
  subjectLabel: "question",
  setupTitle: "The question you need data for",
  setupHint: "Your research question. Your AI partner will help you pick the data that can actually answer it.",
  setupPlaceholder: "e.g. Does experimentation cause startups to grow, or do good startups just experiment?",
  interviewSystem: `You help a researcher choose the right DATA STRATEGY for a question, using Hasan's "Research, Strategy". The main sources each buy something different:
- PUBLIC datasets (cheap, generalizable, but crowded and coarse), ADMINISTRATIVE / TRACE data (real behavior at scale, but access and measurement are hard), SURVEY data (you design the measures, but self-report and effort), EXPERIMENTAL data (clean causality, but narrow and costly), QUALITATIVE data (rich mechanism, but not generalizable), SIMULATION (isolate a mechanism, but only as good as the model).
- The pick follows the CLAIM: causality needs an experiment or a design; generalizability needs a broad population; a step-by-step mechanism needs detail or qualitative depth.
Interview to learn the claim, what must be observed, and the constraints. Ask ONE short question at a time.`,
  draftSystem: `You recommend a data strategy: weigh the main sources against what the CLAIM needs (causality vs. generalizability vs. detail vs. cost), pick the best fit, and lay out a concrete collection plan. Be specific to their question; name the honest trade-off of the pick.`,
  fields: [
    { key: "claim", label: "The claim you need to support", hint: "what you're trying to show, and the toughest challenge to it", kind: "long", group: "The question", accent: "sage" },
    { key: "observe", label: "What must be observed", hint: "the outcome, the treatment, the population", kind: "long", group: "The question", accent: "gold" },
    { key: "options", label: "The options, and what each buys", hint: "public, trace, survey, experiment, qualitative, simulation", kind: "pairs", group: "The choice", accent: "plum", leftLabel: "Source", rightLabel: "What it buys / costs" },
    { key: "pick", label: "The pick, and why", hint: "the best fit for your claim, with its honest trade-off", kind: "long", group: "The choice", accent: "sage" },
    { key: "plan", label: "The collection plan", hint: "how to actually get it", kind: "list", group: "The choice", accent: "gold" },
  ],
  hasVerdict: { label: "Your data strategy, in one line" },
  about:
    'Hasan, "Research, Strategy": the data you choose is a strategic decision. Public, administrative, survey, experimental, qualitative, and simulated data each buy something different — causality, generalizability, detail, or cost — and the right choice follows the claim you need to support.',
  groupNotes: {
    "The question": "The claim and what has to be observed to support it.",
    "The choice": "Weigh the sources against the claim, pick one, and plan the collection.",
  },
};

// (m) Is your identification credible?
const IDENTIFICATION: CanvasDef = {
  slug: "identification",
  exercise: "identification",
  name: "Is Your Identification Credible?",
  subjectLabel: "claim",
  setupTitle: "The causal claim you want to make",
  setupHint: "The X causes Y at the heart of your paper. Your AI partner will stress-test whether you can actually claim it.",
  setupPlaceholder: "e.g. Adopting A/B testing causes startups to launch more products",
  interviewStyle: "grill",
  interviewSystem: `You are a demanding econometrician cross-examining the IDENTIFICATION behind a causal claim, in the spirit of Hasan's "Research, Strategy" and modern causal inference. Your job is to find out whether they can claim CAUSE or only correlation — by ATTACKING the claim, not by collecting their story.
A credible claim must survive: SELECTION (who takes the treatment isn't random — good firms adopt anyway), REVERSE CAUSALITY (Y could cause X), OMITTED VARIABLES (a third factor drives both), and MEASUREMENT error. The design must answer the threat — a randomized EXPERIMENT, DIFFERENCE-IN-DIFFERENCES, an INSTRUMENT, REGRESSION DISCONTINUITY, or MATCHING — resting on an identifying ASSUMPTION they must defend, ideally with a placebo or falsification test.
Do NOT ask how they adopted or used the treatment, how they got into the topic, or to narrate a specific episode — that is irrelevant to identification. First pin down the exact causal claim (X causes Y). Then go after its single biggest threat: state the confound or selection story yourself and make them rule it out. Then press the design and the identifying assumption, and ask what test would falsify it. One sharp question at a time.`,
  draftSystem: `You judge whether a causal claim is credibly identified. Name the biggest threat (selection, reverse causality, omitted variables, measurement), the design that addresses it, the identifying assumption and how to defend it, and a falsification/placebo test. Be honest: if it is really a correlation, say so and say what design would fix it.`,
  fields: [
    { key: "claim", label: "The causal claim", hint: "X causes Y — stated plainly", kind: "long", group: "The claim", accent: "sage" },
    { key: "threat", label: "The biggest threat to identification", hint: "selection, reverse causality, omitted variables, or measurement", kind: "long", group: "The threats", accent: "clay" },
    { key: "design", label: "The design that answers it", hint: "experiment, diff-in-diff, instrument, RD, matching — and why it fits", kind: "long", group: "The design", accent: "gold" },
    { key: "assumption", label: "The identifying assumption", hint: "what must be true for the design to work, and how you'd defend it", kind: "long", group: "The design", accent: "plum" },
    { key: "falsification", label: "The falsification test", hint: "a placebo or check that should fail if you're wrong", kind: "list", group: "The design", accent: "sage" },
  ],
  hasVerdict: { label: "Can you credibly claim cause, or only correlation?" },
  about:
    'A causal claim is only as good as its identification. Naming the biggest threat (selection, reverse causality, omitted variables, measurement) and the design that answers it (experiment, difference-in-differences, instrument, regression discontinuity, matching) separates a causal contribution from a correlation.',
  groupNotes: {
    "The claim": "The cause-and-effect statement, stated plainly.",
    "The threats": "The obvious reasons the claim might be spurious.",
    "The design": "The research design that answers the threat, its assumption, and a test that could falsify it.",
  },
};

// (n) Meet your reviewers — a referee pre-mortem
const REFEREE: CanvasDef = {
  slug: "the-referee",
  exercise: "referee",
  name: "Meet Your Reviewers",
  subjectLabel: "paper",
  setupTitle: "The paper you want reviewed",
  setupHint: "Paste your abstract (and intro, if you have it). Your AI partner will write the referee report you're likely to get.",
  setupPlaceholder: "Paste the title and abstract here…",
  interviewSystem: `You are a fair but demanding referee, in the spirit of the reviewing chapter of Hasan's "Research, Strategy". First impressions matter, and a good report separates the contribution from the execution. You judge: is the CONTRIBUTION real and clearly stated; is the identification / evidence CREDIBLE; is it well POSITIONED in the literature; and is the execution POLISHED (data, tables, figures, writing). Interview only to fill gaps the pasted text leaves; otherwise be ready to write the report. Ask ONE short question at a time.`,
  draftSystem: `You write the referee report the author is likely to receive. Name what a reviewer will genuinely like; then the objections, ranked hardest first (the real reasons for rejection); then the concrete fixes; and the one "reviewer 2" worry that could sink it. Score contribution, credibility, positioning, and polish 0-100. End with the likely decision (reject / revise & resubmit / accept) and why. Be tough and specific, not encouraging-for-its-own-sake.`,
  fields: [
    { key: "likes", label: "What a reviewer will like", hint: "the genuine strengths", kind: "list", group: "The report", accent: "sage" },
    { key: "objections", label: "The objections, ranked", hint: "hardest first — the real reasons for rejection", kind: "list", group: "The report", accent: "clay" },
    { key: "fixes", label: "The fixes", hint: "what to do about each before you submit", kind: "list", group: "The report", accent: "gold" },
    { key: "reviewer2", label: "The reviewer-2 worry", hint: "the one objection that could sink it", kind: "long", group: "The report", accent: "plum" },
  ],
  ratings: [
    { key: "contribution", label: "Contribution" },
    { key: "credibility", label: "Credibility" },
    { key: "positioning", label: "Positioning" },
    { key: "polish", label: "Polish" },
  ],
  hasVerdict: { label: "Likely decision, and why" },
  about:
    'The reviewing chapter of Hasan\'s "Research, Strategy": referees judge the contribution, the credibility of the evidence, the positioning, and the polish. Seeing the report you\'re likely to get lets you fix the paper before they do.',
  groupNotes: {
    "The report": "What reviewers will like, the objections ranked hardest-first, the fixes, and the worst worry.",
  },
};

// (o) The R&R war room
const RNR: CanvasDef = {
  slug: "revise-resubmit",
  exercise: "rnr",
  name: "The R&R War Room",
  subjectLabel: "R&R",
  setupTitle: "Your revise & resubmit",
  setupHint: "Paste the reviewer comments. Your AI partner will help you build a systematic response.",
  setupPlaceholder: "Paste the reviewers' and editor's comments here…",
  interviewSystem: `You help a researcher handle a Revise & Resubmit, using Hasan's "Research, Strategy": an R&R is an exam whose questions are the reviewers' comments. The winning approach is a REVISION DOCUMENT that lists every comment with your response, treats it as a DIALOGUE (engage even when you disagree, with clear reasoning), and stays organized and professional. Most accepted papers went through multiple rounds. Interview to understand the comments and where you agree or push back. Ask ONE short question at a time.`,
  draftSystem: `You build the revision plan for an R&R. Identify the make-or-break comment; pair each substantive comment with a concrete response (what you'll change); flag what you won't change and the respectful reasoning; and draft the opening of the response letter. Systematic, professional, and specific. Never dismiss a reviewer.`,
  fields: [
    { key: "make_break", label: "The make-or-break comment", hint: "the one that decides the paper", kind: "long", group: "The exam", accent: "clay" },
    { key: "responses", label: "Comment → response", hint: "every substantive comment paired with what you'll do", kind: "pairs", group: "The revision", accent: "sage", leftLabel: "Reviewer comment", rightLabel: "Your response / change" },
    { key: "wont_change", label: "What you won't change, and why", hint: "the respectful pushback, with reasoning", kind: "list", group: "The revision", accent: "gold" },
    { key: "letter", label: "The response-letter opener", hint: "the tone-setting first lines to the editor", kind: "long", group: "The revision", accent: "plum" },
  ],
  hasVerdict: { label: "Your revision, in one move" },
  about:
    'Hasan, "Research, Strategy": a Revise & Resubmit is an exam. You pass it with a revision document that answers every comment as a dialogue, engages even where you disagree, and stays organized. Most accepted papers survive several rounds.',
  groupNotes: {
    "The exam": "The comment that actually decides the paper.",
    "The revision": "Every comment answered, the respectful pushback, and the letter that frames it.",
  },
};

// (p) Journal fit & cover letter
const JOURNAL_FIT: CanvasDef = {
  slug: "journal-fit",
  exercise: "journal-fit",
  name: "Journal Fit & Cover Letter",
  subjectLabel: "paper",
  setupTitle: "The paper you're about to submit",
  setupHint: "Your AI partner will help you pick the right venue and pitch it — fit is half the battle.",
  setupPlaceholder: "e.g. My paper on how A/B testing changes which startups scale",
  interviewSystem: `You help a researcher choose a JOURNAL and write a COVER LETTER, using Hasan's "Research, Strategy". Fit is half the battle: the right journal matches the paper's audience, scope, method, and ambition, and the wrong one is a fast desk-reject. Acceptance is a pipeline, so aim high but have a plan B. The cover letter briefly makes the case: what the paper shows, why it fits THIS journal, and why it matters now. Interview to learn the contribution, the audience, and the candidate journals. Ask ONE short question at a time.`,
  draftSystem: `You recommend where to send the paper and draft the cover letter. Name the contribution and audience; list candidate journals with a one-line fit reason each; pick the best target and a plan B; then draft a tight cover letter (what it shows, why it fits this journal, why now). Be specific about fit, not generic praise.`,
  fields: [
    { key: "contribution", label: "The contribution and audience", hint: "what it shows, and who should read it", kind: "long", group: "The fit", accent: "sage" },
    { key: "candidates", label: "Candidate journals", hint: "each with a one-line fit reason", kind: "pairs", group: "The fit", accent: "gold", leftLabel: "Journal", rightLabel: "Why it fits (or doesn't)" },
    { key: "target", label: "Target, and plan B", hint: "aim high, with a fallback", kind: "long", group: "The fit", accent: "plum" },
    { key: "cover_letter", label: "The cover letter", hint: "what it shows, why this journal, why now", kind: "long", group: "The pitch", accent: "sage" },
  ],
  hasVerdict: { label: "Where to send it, and the pitch" },
  about:
    'Hasan, "Research, Strategy": choosing a journal is strategic — fit is half the battle, and the wrong venue is a fast rejection. A tight cover letter makes the case for why the paper belongs in this journal, now.',
  groupNotes: {
    "The fit": "The audience, the candidate venues, and the target with a fallback.",
    "The pitch": "A cover letter that argues the fit, not the paper's greatness.",
  },
};

// (q) Build your theory section
const THEORY: CanvasDef = {
  slug: "theory-section",
  exercise: "theory",
  name: "Build Your Theory Section",
  subjectLabel: "paper",
  setupTitle: "The paper whose theory you're building",
  setupHint: "Your AI partner will help you build the theory as a null model, then a non-obvious claim, then the reasons to believe it.",
  setupPlaceholder: "e.g. Why experienced managers get more out of experimentation",
  interviewSystem: `You help a researcher build a THEORY section, using Hasan's "Research, Strategy". A theory section starts with a NULL MODEL — the view of the world most people (or a skeptical economist) would hold. It then advances a NON-OBVIOUS CLAIM: not outlandish, but something a reasonable person might conclude the opposite of from first principles. Then it gives the REASONS TO BELIEVE — the logic and mechanism — leading to testable hypotheses. Interview to surface the null, the claim, and the mechanism. Ask ONE short question at a time.`,
  draftSystem: `You draft the spine of a theory section: state the null model most people hold; the non-obvious claim that departs from it; why it is non-obvious (what a skeptic would conclude instead); the reasons to believe (the mechanism and logic); and the resulting hypotheses. Specific and grounded, never a literature-summary.`,
  fields: [
    { key: "null_model", label: "The null model", hint: "the world-as-most-assume-it, the view you push against", kind: "long", group: "The setup", accent: "sage" },
    { key: "claim", label: "The non-obvious claim", hint: "what you argue instead — not outlandish, but not obvious", kind: "long", group: "The claim", accent: "gold" },
    { key: "why_nonobvious", label: "Why it's non-obvious", hint: "what a smart skeptic would conclude from first principles", kind: "long", group: "The claim", accent: "clay" },
    { key: "reasons", label: "Reasons to believe", hint: "the mechanism and logic that make the claim credible", kind: "long", group: "The argument", accent: "plum" },
    { key: "hypotheses", label: "The hypotheses", hint: "the testable predictions that follow", kind: "list", group: "The argument", accent: "sage" },
  ],
  hasVerdict: { label: "Your theory in one non-obvious claim" },
  about:
    'Hasan, "Research, Strategy": a theory section sets up a null model most people believe, advances a non-obvious claim that departs from it, and gives the reasons to believe — the mechanism — that lead to testable hypotheses.',
  groupNotes: {
    "The setup": "The null model, the conventional view your theory pushes against.",
    "The claim": "The non-obvious claim, and why a skeptic would expect otherwise.",
    "The argument": "The mechanism that makes it credible, and the hypotheses that follow.",
  },
};

// (r) The abstract & title
const ABSTRACT: CanvasDef = {
  slug: "abstract-title",
  exercise: "abstract",
  name: "The Abstract & Title",
  subjectLabel: "paper",
  setupTitle: "The paper you're titling",
  setupHint: "Your AI partner will help you write the abstract as a microcosm of the paper, then test titles.",
  setupPlaceholder: "e.g. Experimentation and startup performance",
  interviewSystem: `You help a researcher write the ABSTRACT and TITLE, using Hasan's "Research, Strategy". The abstract is a microcosm of the paper, an hourglass: MOTIVATION (the big question, why anyone cares), PROBLEM (the specific gap), APPROACH (what you do), FINDINGS (what you find), and CONTRIBUTION (what we learn, who should care). The title should communicate the big idea and be findable — most readers arrive by search, so clear keywords beat clever jargon. Interview to pull the five beats and the big idea. Ask ONE short question at a time.`,
  draftSystem: `You draft a tight abstract that moves motivation → problem → approach → findings → contribution, and propose three title options (one plain and descriptive, one that leads with the finding, one that names the mechanism), then recommend the best for clarity and searchability. Specific to their paper.`,
  fields: [
    { key: "beats", label: "The five beats", hint: "motivation, problem, approach, findings, contribution", kind: "list", group: "The abstract", accent: "gold" },
    { key: "abstract", label: "The abstract", hint: "the five beats, written as one tight paragraph", kind: "long", group: "The abstract", accent: "sage" },
    { key: "titles", label: "Three title options", hint: "plain, finding-first, and mechanism-named", kind: "list", group: "The title", accent: "plum" },
    { key: "best_title", label: "The best title, and why", hint: "clarity and searchability win", kind: "long", group: "The title", accent: "sage" },
  ],
  hasVerdict: { label: "Your abstract and title" },
  about:
    'Hasan, "Research, Strategy": the abstract is a microcosm of the paper — an hourglass from motivation to contribution — and the title should communicate the big idea and be findable, since most readers arrive by search.',
  groupNotes: {
    "The abstract": "The five beats, written as one tight paragraph.",
    "The title": "Options that communicate the idea and can be found.",
  },
};

// (s) Design your research system
const RESEARCH_SYSTEM: CanvasDef = {
  slug: "research-system",
  exercise: "research-system",
  name: "Design Your Research System",
  subjectLabel: "system",
  setupTitle: "Your research workflow, honestly",
  setupHint: "Your AI partner will help you redesign how you actually work, so you get to the creative part faster.",
  setupPlaceholder: "e.g. I lose days to reformatting tables, chasing files, and redoing analyses by hand",
  interviewSystem: `You help a researcher design their RESEARCH SYSTEM, using Hasan's "Research, Strategy". The goal is to spend less on drudgery and more on the creative work, by learning to AUTOMATE (scripts, linked tables and figures, a clean file structure and project directory) and DELEGATE (to RAs, coauthors, or AI), on a solid stack (analytics, writing, cloud, learning). Interview to find where their time actually goes and where the friction is. Ask ONE short question at a time.`,
  draftSystem: `You redesign a researcher's system. Name where time is lost now; what to AUTOMATE (with the specific tool or habit); what to DELEGATE (and to whom); the stack to standardize (analytics, writing, cloud); a clean project directory; and the single change with the biggest payoff. Concrete, not aspirational.`,
  fields: [
    { key: "time_sinks", label: "Where your time goes now", hint: "the drudgery eating your week", kind: "list", group: "The audit", accent: "clay" },
    { key: "automate", label: "What to automate", hint: "scripts, linked tables/figures, file structure — with the tool", kind: "list", group: "The redesign", accent: "sage" },
    { key: "delegate", label: "What to delegate", hint: "to an RA, a coauthor, or AI", kind: "list", group: "The redesign", accent: "gold" },
    { key: "stack", label: "Your stack", hint: "analytics, writing, cloud, and how they connect", kind: "long", group: "The redesign", accent: "plum" },
    { key: "biggest_win", label: "The biggest win", hint: "the one change with the largest payoff", kind: "long", group: "The redesign", accent: "sage" },
  ],
  hasVerdict: { label: "Your research system, redesigned" },
  about:
    'Hasan, "Research, Strategy": build a research system so you reach the fun, creative work faster. Learn to automate the drudgery (scripts, linked tables, a clean project directory) and to delegate, on a stack you standardize.',
  groupNotes: {
    "The audit": "Where your time actually goes.",
    "The redesign": "What to automate, what to delegate, the stack, and the biggest win.",
  },
};

// (t) Build your research team
const RESEARCH_TEAM: CanvasDef = {
  slug: "research-team",
  exercise: "research-team",
  name: "Build Your Research Team",
  subjectLabel: "project",
  setupTitle: "The project you need collaborators for",
  setupHint: "Your AI partner will help you find the complementary coauthors a strong paper needs.",
  setupPlaceholder: "e.g. A field experiment on manager training that needs a strong empiricist",
  interviewSystem: `You help a researcher build a TEAM, using the complementary-skills model from Hasan's strategy lecture. Most top-journal papers are coauthored, and the strongest teams combine three roles: the ARCHITECT (big-picture framing and positioning), the BUILDER (the writer who turns it into a paper), and the ELECTRICIAN (the data and analysis). You want competent, reliable, hungry collaborators whose strengths are DIFFERENT from yours. Interview to find which role the person plays best and which the project is missing. Ask ONE short question at a time.`,
  draftSystem: `You map a project's team needs: the roles it requires (architect, builder, electrician); which the person is strongest at; the gaps to fill; the kind of collaborator to look for; how to divide the work; and a concrete ask. Specific about complementarity, not just "find coauthors".`,
  fields: [
    { key: "roles_needed", label: "The roles the project needs", hint: "architect (framing), builder (writing), electrician (data)", kind: "list", group: "The team", accent: "sage" },
    { key: "you_are", label: "Which role you are", hint: "your strongest contribution", kind: "long", group: "The team", accent: "gold" },
    { key: "gap", label: "The gap to fill", hint: "the role you most need a complement for", kind: "long", group: "The gap", accent: "clay" },
    { key: "who", label: "Who to look for, and the ask", hint: "the kind of collaborator, and how to approach them", kind: "list", group: "The gap", accent: "plum" },
  ],
  hasVerdict: { label: "Your team, and the gap to fill" },
  about:
    'From Hasan\'s strategy lecture: top-journal papers are coauthored, and strong teams combine complementary roles — the architect (framing), the builder (writing), and the electrician (data and analysis). Find reliable, hungry collaborators whose strengths differ from yours.',
  groupNotes: {
    "The team": "The three roles a strong paper needs, and which you are.",
    "The gap": "The role you most need a complement for, and who to ask.",
  },
};

export const CANVASES: CanvasDef[] = [
  FOURA, SCORECARD, VENTURE, GAS, OCFIT, EXPERIMENT, DEEPTECH,
  PAPER_IDEA, PAPER_STRUCTURE, PAPER_POINTS, GOODNESS,
  REG_TABLES, RESEARCH_GRAPHS, LIT_REVIEW,
  DATA_MOAT, DATA_STRATEGY, IDENTIFICATION, REFEREE, RNR,
  JOURNAL_FIT, THEORY, ABSTRACT, RESEARCH_SYSTEM, RESEARCH_TEAM,
];

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
