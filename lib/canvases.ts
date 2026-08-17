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
  accent?: "human" | "ai" | "both" | "sage" | "gold" | "plum";
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
  draftSystem: string;
  fields: CanvasField[];
  ratings?: { key: string; label: string }[]; // 0–100 scorecard dimensions (e.g. the 4 A's) → also the cohort heatmap
  hasScore?: { label: string }; // show a single 0–100 meter (e.g. capability fit)
  hasVerdict?: { label: string }; // show a headline verdict
  frontier?: { xLabel: string; yLabel: string }; // plot the subject on the automate/copilot/adjunct map
  about?: string; // shown during the exercise — what the framework is
  groupNotes?: Record<string, string>; // one-line explainer under each section heading
  canvasTip?: { title: string; items: string[] }; // a teaching callout on the canvas step
  calculator?: {
    kind: "unit-economics";
    inputs: { key: string; label: string; prefix?: string; suffix?: string }[];
  }; // a live calculator; AI seeds the numbers, the user tweaks them
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
  interviewSystem: `You are a sharp AI-strategy advisor interviewing someone about ONE workflow they want to augment with AI, to fill the AI Opportunity Canvas. Ground every question in the GAS framework (Hasan, Oettl & Samila, "From Model Design to Organizational Design"):
- GENERALITY (breadth of situations handled), ACCURACY (how well outputs match reality), and SIMPLICITY (ease of use AND where the underlying complexity resides) trade off — you cannot maximize all three. The strategic question is WHERE on the Generality–Accuracy frontier this workflow must sit.
- Position the workflow on Dhar's map — PREDICTABILITY of the task vs. COST PER MISTAKE. Low error-cost / predictable work (drafting copy, code scaffolds, brainstorming) can be automated; MID-risk work (support replies, compliance emails, enterprise search) creates an "overproduction" problem where the human becomes a CURATOR of machine output; HIGH error-cost work (legal, medical, safety-critical) keeps AI as an ADJUNCT only — retrieval and ideation, never the core decision.
- SIMPLICITY is not the absence of complexity — it is RELOCATED. A simple interface pushes complexity into infrastructure, data pipelines, model-risk/compliance, and specialist roles (prompt engineering, data governance, oversight). Ask where the hidden complexity will land and who owns it.
- LLMs have an ACCURACY CEILING (they pattern-match); in high-stakes use the ceiling becomes the binding constraint. Complements RISE in value: judgment, relationships, data quality, and the oversight capacity to catch errors.
Interview craft: ask exactly ONE short, open question at a time; follow their lead. Pull the concrete detail the canvas needs — the outcome they want; how costly a mistake is and how failure shows up; how varied the situations are; which steps stay human vs. copilot vs. automated; who the users are and where complexity should live; what could go wrong. Do not lecture or fill the canvas yet.
After about 6 exchanges, reflect the shape back, ask what you missed, then close.`,
  draftSystem: `You fill the AI Opportunity Canvas using the GAS framework (Hasan, Oettl & Samila). Apply its logic rigorously:
- Set required ACCURACY from the COST PER MISTAKE; set required GENERALITY from how VARIED the situations are; treat them as a frontier — a workflow demanding BOTH high accuracy and high generality is a warning sign (narrow the domain, or keep a human in the loop).
- Place the workflow on the frontier and pick the pattern: AUTOMATE (predictable, low error-cost), COPILOT / human-curates (mid-risk, overproduction), or ADJUNCT only (high error-cost). Let that drive the human / human+AI / AI task split.
- SIMPLICITY: name where the relocated complexity lands (infrastructure, data, compliance/model-risk, specialist roles) — don't pretend it disappears.
- Name the human COMPLEMENTS that rise in value here. Be specific to THIS workflow — no generic "leverage AI".`,
  fields: [
    { key: "strategic_outcome", label: "Strategic outcome", hint: "The value/impact you expect — speed, volume, cost, accuracy, quality", kind: "long", group: "The bet", accent: "sage" },
    { key: "required_accuracy", label: "Required accuracy", hint: "How costly is a mistake? High error-cost demands more accuracy + oversight. How would you measure it?", kind: "long", group: "The frontier", accent: "gold" },
    { key: "required_generality", label: "Required generality", hint: "How varied are the situations? Narrow → automatable; broad → trades accuracy", kind: "long", group: "The frontier", accent: "gold" },
    { key: "frontier_position", label: "Where it sits on the frontier", hint: "Automate (predictable, low error-cost) · Copilot/human-curates (mid-risk) · Adjunct only (high error-cost)", kind: "long", group: "The frontier", accent: "gold" },
    { key: "human_tasks", label: "Human tasks", hint: "Stay human-led — and why humans are essential there", kind: "list", group: "The split", accent: "human" },
    { key: "humanai_tasks", label: "Human + AI tasks", hint: "AI drafts / suggests / flags; the human curates and does the accuracy check", kind: "list", group: "The split", accent: "both" },
    { key: "ai_tasks", label: "AI tasks", hint: "AI handles independently — only where errors are cheap and tolerable", kind: "list", group: "The split", accent: "gold" },
    { key: "user_simplicity", label: "User-facing simplicity", hint: "Who are the users, and how much complexity can they carry?", kind: "long", group: "Where complexity lands", accent: "plum" },
    { key: "distributed_complexity", label: "Where the complexity relocates", hint: "It doesn't vanish: infrastructure, data pipelines, compliance/model-risk, and specialist roles — who owns it?", kind: "long", group: "Where complexity lands", accent: "plum" },
    { key: "risks", label: "Risks", hint: "The accuracy ceiling: missed nuance, overtrust, misuse, blind spots", kind: "list", group: "Where complexity lands", accent: "plum" },
    { key: "complements", label: "Complements that rise in value", hint: "Judgment, relationships, data quality, oversight capacity", kind: "list", group: "Make it real", accent: "sage" },
    { key: "deployment", label: "Deployment strategy", hint: "Autonomous vs. human-in-the-loop (end-user check or provider review); off-the-shelf / RAG / fine-tuned", kind: "long", group: "Make it real", accent: "sage" },
  ],
  hasVerdict: { label: "Where it sits on the G–A frontier, and the play" },
  frontier: { xLabel: "Generality (G) →", yLabel: "Accuracy (A) →" },
  about:
    "The GAS framework (Hasan, Oettl & Samila): AI trades off Generality, Accuracy, and Simplicity — you can't max all three. A simple experience for users doesn't remove complexity; it relocates it to data, infrastructure, compliance, and new expertise. Advantage comes from choosing where to sit on the Generality–Accuracy frontier and mastering the complexity that moves. This canvas walks one workflow through that choice.",
  groupNotes: {
    "The bet": "The value you're actually chasing — speed, volume, cost, or quality.",
    "The frontier":
      "Each curve is a fixed level of complexity behind the interface. Reaching both high Generality and high Accuracy means mastering an outer, higher-complexity curve — or keeping a human in the loop.",
    "The split": "Give AI the predictable, low-stakes work; keep judgment, relationships, and the final accuracy check with people.",
    "Where complexity lands":
      "A simple experience for users doesn't remove complexity — it moves it to data, infrastructure, compliance, and specialist roles. Decide who owns it.",
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
  interviewSystem: `You are a strategy advisor helping translate ONE strategy or goal into a Balanced Scorecard (Kaplan & Norton) — essentially OKRs plus the initiatives to hit them, across four linked perspectives: Financial, Customer, Internal Process, and Learning & Growth. These form a cause-and-effect chain: investing in LEARNING & GROWTH improves internal PROCESSES, which improves the CUSTOMER experience, which drives FINANCIAL results.
Your job in this interview is to understand the strategy well enough to build that scorecard. Across the four perspectives, draw out: the Objective (what success looks like there), how they would MEASURE progress, and the Initiatives (what they'd actually do). Each key result is a MEASURE paired with a TARGET — help them separate the two: first "how would you know you're making progress?" (the measure), then "what counts as enough?" (the target, a number and timeframe).
Actively help them think through the measures. A good measure is relevant, accurate, reliable, clear, timely, and cost-effective. Watch for the Wells Fargo trap: a single high-stakes measure tied to narrow incentives (like "sell eight accounts per customer") gets gamed; short-term-only or purely quantitative measures miss what matters. So probe: "Could this measure be gamed, and how?", "What would it miss?", and nudge toward a balanced set (leading and lagging, quantitative and qualitative). Also probe how the perspectives connect — which internal capability actually drives the customer and financial outcomes. Do not fill the scorecard yet — just understand the strategy, the metrics that matter, and the levers they have.`,
  draftSystem: `You translate a strategy into a Balanced Scorecard (Kaplan & Norton) = OKRs + initiatives across four LINKED perspectives (Financial, Customer, Internal Process, Learning & Growth) that form a cause-and-effect chain (Learning → Process → Customer → Financial). For EACH perspective write: one clear Objective; 2–3 Key Results, EACH split into a MEASURE (what you track) and a TARGET (a concrete number + timeframe); and 1–2 Initiatives (the work that moves them). Choose measures that are relevant, accurate, reliable, clear, timely, and cost-effective. Avoid a single gameable metric tied to narrow incentives (the Wells Fargo "Eight is Great" trap); balance leading and lagging, quantitative and qualitative. Make the perspectives LINK — the learning and process initiatives should plausibly drive the customer and financial results. Be specific to THIS strategy — no generic "increase revenue".`,
  fields: [
    { key: "fin_obj", label: "Objective", hint: "The financial result — revenue, margin, cost", kind: "long", group: "Financial", accent: "sage" },
    { key: "fin_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Financial", accent: "gold" },
    { key: "fin_init", label: "Initiatives", kind: "list", group: "Financial", accent: "plum" },
    { key: "cust_obj", label: "Objective", hint: "The value customers feel — why they choose and stay", kind: "long", group: "Customer", accent: "sage" },
    { key: "cust_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Customer", accent: "gold" },
    { key: "cust_init", label: "Initiatives", kind: "list", group: "Customer", accent: "plum" },
    { key: "proc_obj", label: "Objective", hint: "The few processes you must excel at", kind: "long", group: "Internal process", accent: "sage" },
    { key: "proc_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Internal process", accent: "gold" },
    { key: "proc_init", label: "Initiatives", kind: "list", group: "Internal process", accent: "plum" },
    { key: "learn_obj", label: "Objective", hint: "The people, skills, and tools that power it", kind: "long", group: "Learning & growth", accent: "sage" },
    { key: "learn_kr", label: "Key results", kind: "pairs", leftLabel: "Measure", rightLabel: "Target", group: "Learning & growth", accent: "gold" },
    { key: "learn_init", label: "Initiatives", kind: "list", group: "Learning & growth", accent: "plum" },
  ],
  hasVerdict: { label: "The through-line — from learning to financial results" },
  about:
    "The Balanced Scorecard (Kaplan & Norton) turns a strategy into measurable objectives across four linked perspectives — Financial, Customer, Internal Process, and Learning & Growth. It's OKRs plus the initiatives to hit them: each perspective gets an Objective, Key Results (a Measure + a Target), and Initiatives. The four form a cause-and-effect chain — investing in learning improves process, which improves the customer experience, which drives financial results.",
  groupNotes: {
    Financial: "The results owners and investors see — revenue, margin, cost. The end of the chain.",
    Customer: "The value customers feel — what makes them choose and stay. This drives the financials.",
    "Internal process": "The few processes you must excel at to deliver that customer value.",
    "Learning & growth": "The people, skills, and tools that power the processes. The start of the chain.",
  },
  canvasTip: {
    title: "What makes a good measure?",
    items: [
      "Relevant, accurate, reliable, clear, timely, cost-effective.",
      "Balanced — pair leading with lagging, quantitative with qualitative.",
      "Could it be gamed? A single high-stakes metric tied to narrow incentives gets gamed — Wells Fargo's “Eight is Great” drove millions of fake accounts.",
      "The target is what counts as “enough progress” — a number and a timeframe.",
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
  interviewSystem: `You are a sharp venture strategist and investor interviewing a founder about a business they're considering starting, to judge whether it's a GOOD business. Keep every question natural and concrete — NEVER name a framework or use jargon — but over the conversation make sure you understand each of these (the underlying lenses in brackets are for you only):
- The idea and the customer: who exactly it's for, what job it does for them, and what they do today instead. [buyer power, substitutes]
- Competition and entry: who else solves this, how crowded it is, and how easily a copycat or a big incumbent could move in. [rivalry, barriers to entry — Five Forces]
- The unfair advantage: what they'd have that's genuinely hard for others to get or copy — and whether it would last. [VRIN]
- How the pieces fit: the few things they'd do differently that reinforce each other and would be hard to imitate as a whole. [activity systems]
- Where the money is: in this kind of business, who actually keeps the profit along the chain — them, suppliers, platforms, landlords, distributors? [profit pools]
- The numbers: what they'd charge, what each sale costs them, how they'd get customers and what that might cost, how often customers buy or how long they stay, and how big and fast-growing the market is. [unit economics, TAM, growth]
Draw out real numbers wherever you can — press gently for actual figures, not ranges. Do not analyze or give a verdict yet — just understand the idea, the market, and the economics.`,
  draftSystem: `You are a rigorous venture strategist producing an honest analysis of whether a business is a GOOD business, using core strategy frameworks (Porter's Five Forces, VRIN resources, activity-system fit, profit pools) and unit economics. Be QUANTITATIVE: use the numbers the founder gave; where a number is missing, make a clearly reasonable estimate and label it as an assumption. In the unit economics, compute and state: price, variable cost per unit, contribution margin (price − variable cost, and %), CAC, LTV, the LTV:CAC ratio, CAC payback period, and a rough break-even (customers or units/month). In the market, state TAM/SAM, the growth rate, and a realistic share. Score each lens 0–100 (be discerning — spread them). Name the 3–5 things that WOULD NEED TO BE TRUE for this to work (the make-or-break assumptions, stated so they could be tested), and the biggest risks. End with an honest verdict — is this a good business, and under what conditions. Be specific to THIS venture; no generic startup advice.`,
  ratings: [
    { key: "industry", label: "Industry attractiveness" },
    { key: "advantage", label: "Durable advantage" },
    { key: "coherence", label: "Strategic fit" },
    { key: "profit_pool", label: "Profit-pool position" },
  ],
  fields: [
    { key: "idea", label: "The idea & the customer", hint: "What it is, who it's for, and what they do today instead", kind: "long", group: "The idea", accent: "sage" },
    { key: "five_forces", label: "Industry — how attractive?", hint: "Rivalry, ease of entry, buyer & supplier power, substitutes — brutal or benign?", kind: "long", group: "Industry & advantage", accent: "gold" },
    { key: "advantage", label: "Your edge — and does it last?", hint: "Something valuable, rare, hard to copy, with no easy substitute", kind: "long", group: "Industry & advantage", accent: "sage" },
    { key: "activity_system", label: "How the pieces reinforce", hint: "The few choices that fit together and are hard to imitate as a system", kind: "long", group: "How you'd win", accent: "sage" },
    { key: "profit_pool", label: "Where the money actually sits", hint: "Who captures profit along the chain — and can you?", kind: "long", group: "How you'd win", accent: "gold" },
    { key: "market", label: "Market & growth", hint: "TAM / SAM, growth rate, realistic share", kind: "pairs", leftLabel: "Metric", rightLabel: "Value", group: "The numbers", accent: "plum" },
    { key: "would_need_true", label: "What would need to be true", hint: "The make-or-break assumptions — stated so they can be tested", kind: "list", group: "The verdict", accent: "sage" },
    { key: "risks", label: "Biggest risks", kind: "list", group: "The verdict", accent: "plum" },
  ],
  hasVerdict: { label: "Is this a good business?" },
  about:
    "A rigorous read on whether this is a good business, using core strategy frameworks — is the industry attractive (Five Forces), do you have a durable advantage (VRIN), do your choices reinforce each other (activity systems), and where does the money actually sit (profit pools) — plus the unit economics. The output names the key numbers and the few things that would need to be true for it to work.",
  groupNotes: {
    "The idea": "What you'd sell, to whom, and what they do today instead.",
    "Industry & advantage": "Is the game worth playing (Five Forces), and do you have an edge that lasts (VRIN)?",
    "How you'd win": "Do your choices reinforce each other (activity system), and can you capture the profit (profit pools)?",
    "The numbers": "The economics that decide it — and the market that has to be there.",
    "The verdict": "The make-or-break assumptions to test, and what could sink it.",
  },
  canvasTip: {
    title: "What makes a business “good”?",
    items: [
      "Attractive industry — not brutally competitive, and hard for others to enter.",
      "A durable edge — valuable, rare, and hard to copy — that lasts, not just a head start.",
      "Coherent activities that reinforce each other and are hard to imitate as a whole.",
      "You keep the profit — it doesn't all leak to suppliers, platforms, landlords, or a price war.",
      "Economics that work — LTV well above CAC (aim ≥ 3×), payback in months, a real path to break-even.",
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

export const CANVASES: CanvasDef[] = [FOURA, SCORECARD, VENTURE, GAS, OCFIT, EXPERIMENT];

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
