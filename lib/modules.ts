// ============================================================================
// Module registry — the heart of the platform. Add a module over time by
// adding an entry here (+ its render engine + an optional Stripe price env).
// `exercise` maps a module to its runtime engine (Room / WorkflowRoom / SoloRoom).
// ============================================================================

// Who you do the exercise WITH. This is the one signal we standardize across
// every surface so a learner can tell at a glance what a module needs:
//   human → two real people, live (breakout rooms)
//   ai    → solo, an AI plays your partner
//   group → a live whole-room activity an instructor runs
export type Partner = "human" | "ai" | "group";

export const PARTNER_META: Record<
  Partner,
  { label: string; short: string; chip: string; dot: string }
> = {
  human: { label: "With a partner", short: "Partner", chip: "bg-sage-soft text-sage", dot: "#3F7A52" },
  ai: { label: "With AI", short: "AI", chip: "bg-amber-soft text-amber", dot: "#CE8F2C" },
  group: { label: "With the room", short: "Room", chip: "bg-sky-soft text-sky", dot: "#3B7FB5" },
};

export type ModuleDef = {
  slug: string; // stable id used in entitlements + URLs, e.g. "reimagine-job"
  exercise:
    | "job"
    | "workflow"
    | "solo"
    | "benchmark"
    | "network"
    | "workflow-solo"
    | "gas"
    | "ocfit"
    | "experiment"
    | "four-a"
    | "scorecard"
    | "venture"
    | "negotiation"
    | "haggle"
    | "career-xray"; // which room engine renders it
  name: string;
  tagline: string;
  description: string;
  partner: Partner; // who you do it with — drives the standardized chip everywhere
  mode: string; // legacy human-readable label; kept in sync with the partner chip
  minutes: number;
  ai: boolean;
  emoji: string;
  priceCents: number; // display price (Stripe is source of truth for charging)
  priceEnv: string; // env var holding this module's Stripe price id
  forSale?: boolean; // false = free, instructor-run, hidden from the sales page
  instructorTool?: boolean; // shown with an "instructor tool" tag
};

export const MODULES: ModuleDef[] = [
  {
    slug: "reimagine-job",
    exercise: "job",
    name: "Reimagine Your Job",
    tagline: "Redesign a partner's job around what only a human can do.",
    description:
      "You and a partner interview each other, then redesign each other's jobs with the 2×4 model — what AI can Search, Structure, Think, and Translate, and what only you can Lead, Own, Judge, and Integrate.",
    partner: "human",
    mode: "With a partner",
    minutes: 30,
    ai: false,
    emoji: "🧭",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_JOB",
  },
  {
    slug: "reimagine-workflow",
    exercise: "workflow",
    name: "Reimagine a Workflow",
    tagline: "Rethink a workflow with a partner — don't patch it.",
    description:
      "On a shared canvas, you and a partner pick a workflow worth redesigning and weigh AI's three pulls — more vs. better, accuracy vs. generality, chaos vs. architect — then redraw it with AI and humans in the right seats.",
    partner: "human",
    mode: "With a partner",
    minutes: 30,
    ai: false,
    emoji: "🔧",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_WORKFLOW",
  },
  {
    slug: "benchmark",
    exercise: "benchmark",
    name: "The Benchmark",
    tagline: "Test yourself against the machine — then see the room.",
    description:
      "A timed set of reasoning questions. Take it, get your score, and watch a live histogram of how the whole room did — next to how AI does the same test.",
    partner: "group",
    mode: "With the room",
    minutes: 10,
    ai: false,
    emoji: "⏱️",
    priceCents: 0,
    priceEnv: "STRIPE_PRICE_BENCHMARK",
    forSale: false,
    instructorTool: true,
  },
  {
    slug: "workflow-solo",
    exercise: "workflow-solo",
    name: "Reimagine a Workflow with AI",
    tagline: "AI interviews you, then redraws your workflow with AI + humans in the right seats.",
    description:
      "No partner needed — an AI plays your partner. Describe a workflow, let AI interview you to understand it, then watch it draw the flow — recolor and refine who does what, and end with a redesigned AI+Human workflow.",
    partner: "ai",
    mode: "With AI",
    minutes: 30,
    ai: true,
    emoji: "🔧",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_WORKFLOW_SOLO",
  },
  {
    slug: "network",
    exercise: "network",
    name: "The Network",
    tagline: "Map the room's real network — live, and anonymous.",
    description:
      "Everyone names who they go to for advice and who they call a friend. Watch the advice and friendship networks draw themselves live — then reveal who's most central.",
    partner: "group",
    mode: "With the room",
    minutes: 8,
    ai: false,
    emoji: "🕸️",
    priceCents: 0,
    priceEnv: "STRIPE_PRICE_NETWORK",
    forSale: false,
    instructorTool: true,
  },
  {
    slug: "career-x-ray",
    exercise: "career-xray",
    name: "Career X-ray",
    tagline: "Paste your resume — see what AI can do, and what to lean into.",
    description:
      "A research-grounded exposure analysis: AI decomposes your role into tasks (Autor), scores each for AI exposure (Eloundou et al.), benchmarks you bottom-up vs. your occupation top-down (Brynjolfsson–Rock), then names the new higher-value work to own (Acemoglu–Restrepo) and where your career can go — with a job-search plan.",
    partner: "ai",
    mode: "With AI",
    minutes: 14,
    ai: true,
    emoji: "🩻",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_CAREER",
  },
  {
    slug: "solo-ai",
    exercise: "solo",
    name: "Reimagine Your Job with AI",
    tagline: "Lean into the human part of your job.",
    description:
      "No partner needed — an AI plays your partner. It interviews you to find your real job, then drafts a redesign that hands AI the busywork and keeps the judgment with you.",
    partner: "ai",
    mode: "With AI",
    minutes: 18,
    ai: true,
    emoji: "✨",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_SOLO",
  },
  {
    slug: "execution-4a",
    exercise: "four-a",
    name: "4A Execution Diagnostic",
    tagline: "Is this initiative actually set up to execute?",
    description:
      "An AI partner interviews you about a real initiative, then scores it across the 4 A's — Alignment, Ability, Architecture, Agility — with a diagnosis and the single highest-leverage fix for each. In a cohort, the room's scores roll up into a live heatmap.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "🧭",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_FOURA",
  },
  {
    slug: "close-the-offer",
    exercise: "negotiation",
    name: "Close the Offer",
    tagline: "Negotiate a job offer against an AI counterpart — then get scored.",
    description:
      "A live, multi-issue negotiation: you're the candidate, AI plays the hiring manager. Six issues, hidden priorities on both sides. Haggle across salary, equity, remote, and more — then see your score, the joint value you created, and a coach's debrief on what you claimed and what you left on the table.",
    partner: "ai",
    mode: "With AI",
    minutes: 30,
    ai: true,
    emoji: "🤝",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_NEGOTIATION",
  },
  {
    slug: "name-your-price",
    exercise: "haggle",
    name: "Name Your Price",
    tagline: "A pure price haggle — anchor, find the ZOPA, and claim the gap.",
    description:
      "A single-issue distributive negotiation: you're buying a used van from an AI seller with a hidden floor. No trades to find — just anchoring, patience, and your walk-away. Then see how much of the bargaining zone you claimed, on a ZOPA bar, with a coach's debrief.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "💵",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_HAGGLE",
  },
  {
    slug: "good-business",
    exercise: "venture",
    name: "Is This a Good Business?",
    tagline: "Pressure-test a business idea with real strategy and real numbers.",
    description:
      "An AI partner interviews you about a business you're considering — naturally, but guided by Five Forces, VRIN, activity systems, and profit pools — then delivers a rigorous analysis: industry attractiveness, your durable edge, the unit economics (CAC, LTV, payback, break-even), and the few things that would need to be true for it to work.",
    partner: "ai",
    mode: "With AI",
    minutes: 22,
    ai: true,
    emoji: "🚀",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_VENTURE",
  },
  {
    slug: "balanced-scorecard",
    exercise: "scorecard",
    name: "Balanced Scorecard",
    tagline: "Turn a strategy into OKRs + initiatives across four linked perspectives.",
    description:
      "An AI partner interviews you about a strategy, then builds the Balanced Scorecard (Kaplan & Norton): an Objective, measurable Key Results, and Initiatives for each of Financial, Customer, Internal Process, and Learning & Growth — linked as a cause-and-effect chain.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "📊",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_SCORECARD",
  },
  {
    slug: "ai-canvas",
    exercise: "gas",
    name: "AI Opportunity Canvas",
    tagline: "Where should AI actually go — and how do you deploy it well?",
    description:
      "An AI partner interviews you about one workflow, then drafts the GAS canvas: the outcome, the accuracy and generality it needs, the human/AI split, where complexity lives, the risks, and how to deploy. You leave with an implementation-grade plan.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "🧠",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_GAS",
  },
  {
    slug: "opportunity-capability",
    exercise: "ocfit",
    name: "Opportunity–Capability Fit",
    tagline: "Should you make this bet? Test it against what you can actually do.",
    description:
      "Name an opportunity; an AI partner interviews you, then scores how well it fits your Tasks, People, Systems, and Culture — and names the one capability gap most likely to break the bet, plus what to build first.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "🎯",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_OCFIT",
  },
  {
    slug: "test-the-bet",
    exercise: "experiment",
    name: "Test-the-Bet",
    tagline: "Before you commit, design a clean experiment to test it.",
    description:
      "Turn a strategic belief into a runnable business experiment. An AI partner helps you sharpen the hypothesis, the control vs. change, the one metric that matters, and the decision rule — a test you could start this week.",
    partner: "ai",
    mode: "With AI",
    minutes: 18,
    ai: true,
    emoji: "🧪",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_EXPERIMENT",
  },
];

// The all-access bundle uses the existing single price env for backward compat.
export const ALL_ACCESS = {
  slug: "all",
  name: "All modules",
  priceCents: 2900,
  priceEnv: "STRIPE_PRICE_ID",
};

// Modules sold on the public marketing page (excludes free instructor tools).
export const SALEABLE_MODULES = MODULES.filter((m) => m.forSale !== false);

// Thematic categories — how the exercises are grouped on the marketing page
// (the dashboard groups by partner instead: how you run each one).
export type CategoryKey = "redesign" | "strategy" | "negotiate" | "live";
export const CATEGORIES: { key: CategoryKey; title: string; blurb: string }[] = [
  { key: "redesign", title: "Redesign the work", blurb: "Put people and AI where each does its best — your job or a workflow, with a partner or with AI." },
  { key: "strategy", title: "Sharpen a decision", blurb: "Pressure-test a strategy, a bet, or a whole business with a real framework and real numbers. AI interviews you, then builds the analysis." },
  { key: "negotiate", title: "Negotiate", blurb: "Bargain live against an AI counterpart, then get scored on the value you claimed — and the value you created." },
  { key: "live", title: "Run it live in class", blurb: "Whole-room diagnostics that draw themselves as your cohort responds — instructor-led." },
];
const CATEGORY_OF: Record<string, CategoryKey> = {
  "reimagine-job": "redesign",
  "reimagine-workflow": "redesign",
  "solo-ai": "redesign",
  "workflow-solo": "redesign",
  "career-x-ray": "redesign",
  "execution-4a": "strategy",
  "balanced-scorecard": "strategy",
  "ai-canvas": "strategy",
  "opportunity-capability": "strategy",
  "test-the-bet": "strategy",
  "good-business": "strategy",
  "close-the-offer": "negotiate",
  "name-your-price": "negotiate",
  benchmark: "live",
  network: "live",
};
export function moduleCategory(slug: string): CategoryKey {
  return CATEGORY_OF[slug] || "strategy";
}

export function moduleBySlug(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}
export function moduleByExercise(exercise: string): ModuleDef | undefined {
  return MODULES.find((m) => m.exercise === exercise);
}

export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// Stripe price id for a target: a module slug, or "all" for the bundle.
// Per-module prices are optional; if unset, that module is only sold via the
// all-access bundle.
export function priceIdFor(target: string): string | undefined {
  if (target === "all") return process.env.STRIPE_PRICE_ID || undefined;
  const m = moduleBySlug(target);
  if (!m) return undefined;
  return process.env[m.priceEnv] || undefined;
}
