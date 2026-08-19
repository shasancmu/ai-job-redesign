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
    | "deeptech"
    | "negotiation"
    | "haggle"
    | "career-xray"
    | "jd-xray"
    | "career-roadmap"
    | "disclosure"
    | "disclosure-haip"
    | "consult"
    | "superpower"
    | "board"
    | "empathy"
    | "voice-consult"; // which room engine renders it
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
  hidden?: boolean; // keep it functional, but omit from the catalog + landing
};

export const MODULES: ModuleDef[] = [
  {
    slug: "reimagine-job",
    exercise: "job",
    name: "Redesign Your Job with a Partner",
    tagline: "Interview a partner, then redesign each other's jobs with the 2×4 model. You'll learn what only a human can lead, own, and judge, and what AI can take off your plate.",
    description:
      "You and a partner interview each other, then redesign each other's jobs with the 2×4 model: what AI can Search, Structure, Think, and Translate, and what only you can Lead, Own, Judge, and Integrate.",
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
    name: "Redesign a Workflow with a Partner",
    tagline: "Pick a real workflow and redraw it with a partner. Learn to weigh AI's tradeoffs and put people and AI in the right seats, instead of just patching what you have.",
    description:
      "On a shared canvas, you and a partner pick a workflow worth redesigning and weigh AI's three pulls (more vs. better, accuracy vs. generality, chaos vs. architect), then redraw it with AI and humans in the right seats.",
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
    name: "You vs. AI: A Reasoning Test",
    tagline: "Take a timed reasoning test, then see your score against the whole room, and against AI on the same questions. An honest read on where humans still have the edge.",
    description:
      "A timed set of reasoning questions. Take it, get your score, and watch a live histogram of how the whole room did, next to how AI does the same test.",
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
    name: "Redesign a Workflow with AI",
    tagline: "Describe a workflow and let AI interview you, then watch it redraw the flow. Learn who should do what once AI and humans share the work, and leave with a redesign.",
    description:
      "No partner needed. An AI plays your partner. Describe a workflow, let AI interview you to understand it, then watch it draw the flow: recolor and refine who does what, and end with a redesigned AI+Human workflow.",
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
    name: "Map the Room's Network (Live)",
    tagline: "Map the room's real advice and friendship networks, live and anonymous, then see who's actually most central. A vivid lesson in how influence really flows.",
    description:
      "Everyone names who they go to for advice and who they call a friend. Watch the advice and friendship networks draw themselves live. Then reveal who's most central.",
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
    slug: "jd-x-ray",
    exercise: "jd-xray",
    name: "Analyze a Role's AI Exposure",
    tagline: "Paste a job description and see which tasks AI can do. Then learn to rewrite the role as a human+AI job, and exactly who to hire for it.",
    description:
      "The recruiter's cut: AI decomposes a job description into tasks, scores each for AI exposure (Eloundou et al.), benchmarks the role against its occupation, rewrites it as a superadditive human+AI role, and tells you how to find the person, from the sourcing keywords to where they are and what to screen for.",
    partner: "ai",
    mode: "With AI",
    minutes: 14,
    ai: true,
    emoji: "📄",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_JDXRAY",
  },
  {
    slug: "career-x-ray",
    exercise: "career-xray",
    name: "Analyze Your Career's AI Exposure",
    tagline: "Paste your résumé and see which parts of your work AI can do. Then learn the higher-value work to lean into, and where your career can go next.",
    description:
      "A research-grounded exposure analysis: AI decomposes your role into tasks (Autor), scores each for AI exposure (Eloundou et al.), benchmarks you bottom-up vs. your occupation top-down (Brynjolfsson–Rock), then names the new higher-value work to own (Acemoglu–Restrepo) and where your career can go, with a job-search plan.",
    partner: "ai",
    mode: "With AI",
    minutes: 14,
    ai: true,
    emoji: "🩻",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_CAREER",
  },
  {
    slug: "vendor-disclosure",
    exercise: "disclosure",
    name: "Vet a Vendor's Disclosure",
    tagline: "Send a vendor one open link and get a structured disclosure back. AI then scores it against a proven framework and flags the gaps and red flags before you buy.",
    description:
      "A procurement tool. Name a vendor/product, get a shareable link, and send it to the vendor. No account needed on their side. They complete a structured disclosure adapted from the Health AI Partnership (HAIP) framework across five domains: capabilities & intended use, performance & compliance, data stewardship, integration & cost, and lifecycle & support. Mark the vendor as AI/ML to add the model-performance, subgroup-bias, and drift questions. When it comes back, AI reviews it against the framework, scoring completeness per domain and flagging gaps and red flags.",
    partner: "ai",
    mode: "With AI",
    minutes: 10,
    ai: true,
    emoji: "📋",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_DISCLOSURE",
  },
  {
    slug: "haip-disclosure",
    exercise: "disclosure-haip",
    name: "Vet a Healthcare AI Vendor",
    tagline: "Send a healthcare AI vendor one open link and get a full Health AI Partnership disclosure back, covering model performance, bias, and HIPAA, with AI flagging what needs local validation.",
    description:
      "The Health AI Partnership (HAIP) AI Vendor Disclosure Framework in its native healthcare context, delivered as a shareable link for a healthcare delivery organization (HDO). Send it to an AI vendor and they complete the full disclosure across the five domains: system capabilities & intended use (care setting, essential-intervention alignment, maturity), performance & compliance (model metrics + external validation, subgroup bias per Section 1557, known risks, FDA/regulatory status), data stewardship (HIPAA, secondary-use/IP, exit and business-discontinuation), integration (EHR interoperability, total cost of ownership), and lifecycle management (drift monitoring, adverse-event reporting, HEDIS/QI value, SLAs). AI then reviews it against the framework's minimum-transparency bar and flags gaps for local validation.",
    partner: "ai",
    mode: "With AI",
    minutes: 12,
    ai: true,
    emoji: "🩺",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_DISCLOSURE_HAIP",
    hidden: true,
  },
  {
    slug: "career-roadmap",
    exercise: "career-roadmap",
    name: "Map Your Next Career Moves",
    tagline: "See your skill-adjacent next career moves (lateral, step-up, and stretch), and learn exactly which skills to build to get there, sequenced into a roadmap for the next 24 months.",
    description:
      "Reuses your résumé (or paste one), matches you to your O*NET occupation, and uses real O*NET skill data to map your skill-adjacent next steps: lateral pivots, step-ups, and stretch moves. For any target it shows a skills radar (you vs. the role), the specific gaps to close, and a sequenced 0–24 month roadmap. AI fills what the résumé can't show via a short interview.",
    partner: "ai",
    mode: "With AI",
    minutes: 16,
    ai: true,
    emoji: "🗺️",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_ROADMAP",
  },
  {
    slug: "solo-ai",
    exercise: "solo",
    name: "Redesign Your Job with AI",
    tagline: "Let AI interview you to find your real job, then get a redesign that hands AI the busywork and keeps the judgment with you. You'll learn where you're most valuable.",
    description:
      "No partner needed. An AI plays your partner. It interviews you to find your real job, then drafts a redesign that hands AI the busywork and keeps the judgment with you.",
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
    name: "Score Your Execution Plan",
    tagline: "Pressure-test a real initiative against the 4 A's (Alignment, Ability, Architecture, Agility), and learn the single highest-leverage fix keeping it from executing.",
    description:
      "An AI partner interviews you about a real initiative, then scores it across the 4 A's (Alignment, Ability, Architecture, Agility) with a diagnosis and the single highest-leverage fix for each. In a cohort, the room's scores roll up into a live heatmap.",
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
    name: "Negotiate a Job Offer",
    tagline: "Negotiate a multi-issue job offer live against an AI hiring manager, then get scored on the value you claimed and created. Learn where you left money on the table.",
    description:
      "A live, multi-issue negotiation: you're the candidate, AI plays the hiring manager. Six issues, hidden priorities on both sides. Haggle across salary, equity, remote, and more. Then see your score, the joint value you created, and a coach's debrief on what you claimed and what you left on the table.",
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
    name: "Practice a Price Negotiation",
    tagline: "Haggle over a single price against an AI seller with a hidden floor. Learn to anchor, hold your walk-away, and claim your share of the bargaining zone.",
    description:
      "A single-issue distributive negotiation: you're buying a used van from an AI seller with a hidden floor. No trades to find: just anchoring, patience, and your walk-away. Then see how much of the bargaining zone you claimed, on a ZOPA bar, with a coach's debrief.",
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
    name: "Pressure-Test a Business Idea",
    tagline: "Pressure-test a business idea against real frameworks and real unit economics. Learn whether the market is attractive, where your edge is durable, and what would have to be true to win.",
    description:
      "An AI partner interviews you about a business you're considering (naturally, but guided by Five Forces, VRIN, activity systems, and profit pools), then delivers a rigorous analysis: industry attractiveness, your durable edge, the unit economics (CAC, LTV, payback, break-even), and the few things that would need to be true for it to work.",
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
    name: "Build a Balanced Scorecard",
    tagline: "Turn a strategy into objectives, measurable results, and initiatives across the four Balanced Scorecard perspectives, and learn how they link as one cause-and-effect chain.",
    description:
      "An AI partner interviews you about a strategy, then builds the Balanced Scorecard (Kaplan & Norton): an Objective, measurable Key Results, and Initiatives for each of Financial, Customer, Internal Process, and Learning & Growth, linked as a cause-and-effect chain.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "📊",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_SCORECARD",
  },
  {
    slug: "deeptech-canvas",
    exercise: "deeptech",
    name: "Plan a Deep-Tech Venture",
    tagline: "Separate a deep-tech venture's technical and market uncertainty, then design the one experiment that resolves the biggest. Learn the path from lab capability to real strategy.",
    description:
      "For deep-tech ventures (novel physical, material, chemical, or biological capabilities). An AI partner interviews you, then fills Duke's Dual Uncertainty Canvas: it separates technical uncertainty (can we make it work?) from market uncertainty (will anyone buy it?), picks a priority application, designs the minimum viable experiment to resolve the dominant uncertainty, makes the path dependencies explicit, and matches you to realistic funders, ending in a one-sentence strategy.",
    partner: "ai",
    mode: "With AI",
    minutes: 22,
    ai: true,
    emoji: "🔬",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_DEEPTECH",
  },
  {
    slug: "ai-canvas",
    exercise: "gas",
    name: "Find Where AI Fits a Workflow",
    tagline: "Map one workflow to find where AI actually belongs: the human/AI split, the risks, and how to deploy it. You leave with an implementation-grade plan.",
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
    name: "Should You Make This Bet?",
    tagline: "Test an opportunity against what you can actually do across your Tasks, People, Systems, and Culture, and learn the one capability gap most likely to break the bet.",
    description:
      "Name an opportunity; an AI partner interviews you, then scores how well it fits your Tasks, People, Systems, and Culture, and names the one capability gap most likely to break the bet, plus what to build first.",
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
    name: "Design a Test for Your Strategy",
    tagline: "Turn a strategic belief into a clean, runnable experiment: the hypothesis, the one metric that matters, and the decision rule. Learn to test a bet before you commit.",
    description:
      "Turn a strategic belief into a runnable business experiment. An AI partner helps you sharpen the hypothesis, the control vs. change, the one metric that matters, and the decision rule, a test you could start this week.",
    partner: "ai",
    mode: "With AI",
    minutes: 18,
    ai: true,
    emoji: "🧪",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_EXPERIMENT",
  },
  {
    slug: "business-consult",
    exercise: "consult",
    name: "Diagnose Your Business in 30 Minutes",
    tagline: "Free AI consulting for your business. A guided interview, a management-practices check, a photo read of the operation, and an 80/20 look add up to one clear picture: what kind of business you are, where your margin really lives, and what to fix first.",
    description:
      "A 30-minute guided diagnostic for a business owner. An AI advisor interviews you, you rate your management practices (Bloom, Van Reenen & Sadun), photograph the operation, and answer a quick 80/20. It returns a real consult: whether you win on cost or value, where the margin actually sits (the 'popcorn'), which lever (sell more, price higher, cut cost) has the most room, your management gaps, and a prioritized execution plan.",
    partner: "ai",
    mode: "With AI",
    minutes: 30,
    ai: true,
    emoji: "📈",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_CONSULT",
  },
  {
    slug: "find-superpower",
    exercise: "superpower",
    name: "Find Your Superpower",
    tagline: "Your rarest strength is usually invisible to you, because it feels effortless. An AI interview pulls the stories, finds the thread across them, and names the 2 to 3 abilities that make you hard to replace, with the VRIN-O moat and how to build a career around it.",
    description:
      "Grounded in the Reflected Best Self method and the resource-based view (VRIN-O). Instead of asking what you're good at, an AI interviewer draws out specific stories of you at your best, then extracts the cross-domain thread. It returns a ranked stack of your 2 to 3 superpowers, how they combine into something rarer than any one alone, why each is hard to copy, and how to organize your work to capture that value.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "⚡",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_SUPERPOWER",
  },
  {
    slug: "ai-board",
    exercise: "board",
    name: "Convene Your AI Board",
    tagline: "Bring a decision. Four AI advisors debate it live, a growth optimist, a skeptic, your customer, and your operator, reacting to each other and to you. You moderate, then call the vote for a verdict.",
    description:
      "A live advisory board on demand. Describe a decision you're weighing and four distinct AI personas debate it in front of you, each holding a real stance and pushing back on each other. Interject anytime, steer the argument, then call the vote for the board's verdict: the core tension, a recommended move, and what would have to be true.",
    partner: "ai",
    mode: "With AI",
    minutes: 15,
    ai: true,
    emoji: "⚖️",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_BOARD",
  },
  {
    slug: "voice-consult",
    exercise: "voice-consult",
    name: "Talk Through Your Business",
    tagline: "A spoken interview about your business. An AI advisor asks you questions out loud, you just talk back, and it turns the conversation into a real consult: what kind of business you are, where your margin lives, and what to fix first.",
    description:
      "The 30-Minute Consult as a hands-free voice conversation. An AI advisor interviews you out loud about how your business really works, you answer by speaking, and at the end it produces the full consult: cost-led vs value-led, where the margin sits (the 'popcorn'), which lever has the most room, and a prioritized plan. Uses your browser's built-in speech (Chrome or Safari); nothing is recorded, only the transcript is kept.",
    partner: "ai",
    mode: "With AI",
    minutes: 20,
    ai: true,
    emoji: "🎙️",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_CONSULT",
  },
  {
    slug: "customer-empathy",
    exercise: "empathy",
    name: "Understand Your Customer",
    tagline: "Send a potential customer one link. An AI runs a warm, design-thinking empathy interview for you, then hands back who they are, the job they're hiring you to do, their real pains and gains, and an empathy map you can act on. Do it with many customers and it finds the pattern.",
    description:
      "A customer-research tool. Name your business, what you offer, and who you want to understand, and get one shareable link. Send it to any potential customer: they open it with no account and have a natural chat with an AI interviewer trained in the design-thinking empathy method and Jobs-to-be-Done. It draws out their stories, workarounds, frustrations, and what they truly value, never pitching. Each conversation comes back to you as an empathy profile (an empathy map of what they say, think, do, and feel, their core job to be done, pains, gains, and verbatim quotes). Collect several and one click synthesizes the patterns across them: the themes, the distinct customer types, the biggest unmet needs, and where the opportunities are.",
    partner: "ai",
    mode: "With AI",
    minutes: 15,
    ai: true,
    emoji: "💬",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_EMPATHY",
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
export const CATEGORIES: { key: CategoryKey; title: string; blurb: string; chip: string; dot: string }[] = [
  { key: "redesign", title: "Work & AI", blurb: "Redesign your job or a workflow, and X-ray a résumé or role to see what AI can do, and what only a human can.", chip: "bg-sage-soft text-sage", dot: "#3F7A52" },
  { key: "strategy", title: "Sharpen a decision", blurb: "Pressure-test a strategy, a bet, or a whole business with a real framework and real numbers. AI interviews you, then builds the analysis.", chip: "bg-amber-soft text-amber", dot: "#C98A2B" },
  { key: "negotiate", title: "Negotiate", blurb: "Bargain live against an AI counterpart, then get scored on the value you claimed, and the value you created.", chip: "bg-sky-soft text-sky", dot: "#4E79C9" },
  { key: "live", title: "Run it live in class", blurb: "Whole-room diagnostics that draw themselves as your cohort responds.", chip: "bg-clay-soft text-clay", dot: "#C06A47" },
];
const CATEGORY_OF: Record<string, CategoryKey> = {
  "reimagine-job": "redesign",
  "reimagine-workflow": "redesign",
  "solo-ai": "redesign",
  "workflow-solo": "redesign",
  "career-x-ray": "redesign",
  "career-roadmap": "redesign",
  "find-superpower": "redesign",
  "jd-x-ray": "redesign",
  "execution-4a": "strategy",
  "balanced-scorecard": "strategy",
  "ai-canvas": "strategy",
  "deeptech-canvas": "strategy",
  "vendor-disclosure": "strategy",
  "haip-disclosure": "strategy",
  "opportunity-capability": "strategy",
  "test-the-bet": "strategy",
  "good-business": "strategy",
  "business-consult": "strategy",
  "voice-consult": "strategy",
  "ai-board": "strategy",
  "customer-empathy": "strategy",
  "close-the-offer": "negotiate",
  "name-your-price": "negotiate",
  benchmark: "live",
  network: "live",
};
export function moduleCategory(slug: string): CategoryKey {
  return CATEGORY_OF[slug] || "strategy";
}

// ---------------------------------------------------------------------------
// Pills — a finite set of cross-cutting themes. A module can carry several; the
// catalog shows them on each card and lets people filter by them.
// ---------------------------------------------------------------------------
export type PillKey =
  | "ai"
  | "career"
  | "strategy"
  | "leadership"
  | "implementation"
  | "entrepreneurship"
  | "innovation"
  | "negotiation"
  | "live";

export const PILLS: { key: PillKey; label: string }[] = [
  { key: "ai", label: "AI" },
  { key: "career", label: "Career" },
  { key: "strategy", label: "Strategy" },
  { key: "leadership", label: "Leadership" },
  { key: "implementation", label: "Implementation" },
  { key: "entrepreneurship", label: "Entrepreneurship" },
  { key: "innovation", label: "Innovation" },
  { key: "negotiation", label: "Negotiation" },
  { key: "live", label: "Live in class" },
];

const PILLS_OF: Record<string, PillKey[]> = {
  // Work & AI
  "reimagine-job": ["ai", "career"],
  "solo-ai": ["ai", "career"],
  "reimagine-workflow": ["ai", "implementation"],
  "workflow-solo": ["ai", "implementation"],
  "ai-canvas": ["ai", "strategy", "implementation"],
  // Careers
  "career-x-ray": ["career", "ai"],
  "jd-x-ray": ["career", "leadership"],
  "career-roadmap": ["career"],
  "find-superpower": ["career", "leadership"],
  // Negotiation
  "close-the-offer": ["negotiation", "career"],
  "name-your-price": ["negotiation"],
  // Strategy & management
  "execution-4a": ["strategy", "leadership", "implementation"],
  "balanced-scorecard": ["strategy", "leadership"],
  "opportunity-capability": ["strategy", "leadership"],
  "vendor-disclosure": ["strategy", "implementation"],
  "haip-disclosure": ["strategy", "implementation", "ai"],
  "business-consult": ["strategy", "leadership", "implementation"],
  "voice-consult": ["strategy", "leadership"],
  "ai-board": ["strategy", "leadership"],
  "customer-empathy": ["innovation", "entrepreneurship", "strategy"],
  // Entrepreneurship / innovation
  "good-business": ["entrepreneurship", "strategy"],
  "test-the-bet": ["innovation", "entrepreneurship"],
  "deeptech-canvas": ["innovation", "entrepreneurship"],
  // Live
  benchmark: ["live", "ai"],
  network: ["live", "leadership"],
};

export function modulePills(slug: string): PillKey[] {
  return PILLS_OF[slug] || [];
}
export function pillLabel(key: string): string {
  return PILLS.find((p) => p.key === key)?.label || key;
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
