// ============================================================================
// The "Reimagine Your Job" exercise — content & timing.
// Condensed from Prof. Sharique Hasan's deck into a ~30-minute paired version.
// ============================================================================

export type Phase = {
  key: string;
  index: number;
  title: string;
  subtitle: string;
  minutes: number;
  // "solo"  = both partners work independently at the same time
  // "talk"  = partners talk on Zoom; A interviews B, then B interviews A
  // "reveal"= the payoff: you see what your partner designed for you
  mode: "solo" | "talk" | "reveal";
};

export const PHASES: Phase[] = [
  {
    key: "setup",
    index: 0,
    title: "Your job today",
    subtitle:
      "Name your job and describe it in one line. Your partner will redesign THIS.",
    minutes: 2,
    mode: "solo",
  },
  {
    key: "interview",
    index: 1,
    title: "Interview your partner",
    subtitle:
      "Take turns on Zoom (4 min each). Understand your partner's job: what bogs them down? What do they wish they spent more time on?",
    minutes: 8,
    mode: "talk",
  },
  {
    key: "realjob",
    index: 2,
    title: "Their real job",
    subtitle:
      "Capture what your partner is really trying to achieve — and one thing you see that maybe they don't.",
    minutes: 4,
    mode: "solo",
  },
  {
    key: "redesign",
    index: 3,
    title: "Redesign with the 2×4 model",
    subtitle:
      "Sort your partner's work. What should AI do? What must stay human? Then write their new job description.",
    minutes: 8,
    mode: "solo",
  },
  {
    key: "share",
    index: 4,
    title: "Share & get feedback",
    subtitle:
      "The reveal: read the redesign your partner made of YOUR job, and react. Your reactions become their feedback.",
    minutes: 6,
    mode: "reveal",
  },
  {
    key: "final",
    index: 5,
    title: "The reimagined job",
    subtitle:
      "Read your partner's feedback on your design, then write the final reimagined job in one paragraph.",
    minutes: 2,
    mode: "solo",
  },
];

export const TOTAL_MINUTES = PHASES.reduce((s, p) => s + p.minutes, 0);

// --- The 2 × 4 AI × Human model --------------------------------------------
export type Cell = {
  key: string;
  role: "ai" | "human";
  label: string; // Search / Structure / Lead ...
  verb: string; // AI: Search
  gloss: string;
  verbs: string[];
};

export const CELLS: Cell[] = [
  {
    key: "search",
    role: "ai",
    label: "Search",
    verb: "AI: Search",
    gloss: "Find and surface what's out there.",
    verbs: ["Find", "Retrieve", "Scan", "Discover", "Locate", "Surface", "Mine", "Aggregate", "Crawl", "Identify"],
  },
  {
    key: "structure",
    role: "ai",
    label: "Structure",
    verb: "AI: Structure",
    gloss: "Impose order on the mess.",
    verbs: ["Organize", "Categorize", "Tag", "Format", "Cluster", "Sort", "Map", "Outline", "Index", "Standardize"],
  },
  {
    key: "think",
    role: "ai",
    label: "Think",
    verb: "AI: Think",
    gloss: "Reason across the material.",
    verbs: ["Analyze", "Reason", "Calculate", "Compare", "Predict", "Synthesize", "Infer", "Model"],
  },
  {
    key: "translate",
    role: "ai",
    label: "Translate",
    verb: "AI: Translate",
    gloss: "Reshape it for the audience.",
    verbs: ["Convert", "Summarize", "Rephrase", "Adapt", "Simplify", "Reformat", "Explain"],
  },
  {
    key: "lead",
    role: "human",
    label: "Lead",
    verb: "Human: Lead",
    gloss: "Set direction and bring people with you.",
    verbs: ["Vision", "Inspire", "Direct", "Champion", "Mentor", "Set strategy", "Motivate", "Align", "Advocate"],
  },
  {
    key: "own",
    role: "human",
    label: "Own",
    verb: "Human: Own",
    gloss: "Put your name on it.",
    verbs: ["Commit", "Be accountable", "Approve", "Follow through", "Stand behind", "Defend", "Bet"],
  },
  {
    key: "judge",
    role: "human",
    label: "Judge",
    verb: "Human: Judge",
    gloss: "Decide what's good and what isn't.",
    verbs: ["Discern", "Weigh", "Evaluate quality", "Apply taste", "Sanity-check", "Veto", "Trust"],
  },
  {
    key: "integrate",
    role: "human",
    label: "Integrate",
    verb: "Human: Integrate",
    gloss: "Connect it to people and context.",
    verbs: ["Contextualize", "Connect", "Build relationships", "Negotiate", "Convince", "Empathize"],
  },
];

export const AI_CELLS = CELLS.filter((c) => c.role === "ai");
export const HUMAN_CELLS = CELLS.filter((c) => c.role === "human");

export function emptyGrid(): Record<string, string[]> {
  const g: Record<string, string[]> = {};
  for (const c of CELLS) g[c.key] = [];
  return g;
}

// Feedback buckets for the Share phase (+ / − / ? / !)
export const FEEDBACK_FIELDS = [
  { key: "plus", symbol: "+", label: "What worked", color: "#16a34a" },
  { key: "minus", symbol: "−", label: "What could be improved", color: "#dc2626" },
  { key: "question", symbol: "?", label: "Questions", color: "#7c3aed" },
  { key: "idea", symbol: "!", label: "Ideas", color: "#d97706" },
] as const;
