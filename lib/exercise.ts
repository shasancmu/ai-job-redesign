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
  // "talk"  = one partner interviews, the other just shares (one direction)
  // "reveal"= the payoff: you see what your partner designed for you
  mode: "solo" | "talk" | "reveal";
  interviewer?: "A" | "B"; // for talk phases: which role is asking the questions
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
    key: "interview1",
    index: 1,
    title: "Interview · turn 1",
    subtitle:
      "One partner interviews; the other simply shares. Dig into the value they create — for the customer, the org, their manager. Not the tasks — the value.",
    minutes: 4,
    mode: "talk",
    interviewer: "A",
  },
  {
    key: "interview2",
    index: 2,
    title: "Interview · turn 2",
    subtitle: "Switch. Now the other partner interviews, and the first one shares.",
    minutes: 4,
    mode: "talk",
    interviewer: "B",
  },
  {
    key: "realjob",
    index: 3,
    title: "Their real value",
    subtitle:
      "Name the value your partner creates and where it really comes from — the part only they can do.",
    minutes: 4,
    mode: "solo",
  },
  {
    key: "redesign",
    index: 4,
    title: "Redesign with the 2×4 model",
    subtitle:
      "Design the role so they spend more time creating that value — and AI absorbs the rest. Sort the work: what should AI do, what must stay human?",
    minutes: 8,
    mode: "solo",
  },
  {
    key: "share",
    index: 5,
    title: "Share & get feedback",
    subtitle:
      "The reveal: read the redesign your partner made of YOUR job, and react. Your reactions become their feedback.",
    minutes: 6,
    mode: "reveal",
  },
  {
    key: "final",
    index: 6,
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
  example: string; // a spelled-out example of a contribution
  verbs: string[];
};

export const CELLS: Cell[] = [
  {
    key: "search",
    role: "ai",
    label: "Search",
    verb: "AI: Search",
    gloss: "Find and surface what's out there.",
    example: "e.g. Run a daily literature review on our topic area and summarize what's new",
    verbs: ["Find", "Retrieve", "Scan", "Discover", "Locate", "Surface", "Mine", "Aggregate", "Crawl", "Identify"],
  },
  {
    key: "structure",
    role: "ai",
    label: "Structure",
    verb: "AI: Structure",
    gloss: "Impose order on the mess.",
    example: "e.g. Organize incoming requests into themes and tag each by urgency",
    verbs: ["Organize", "Categorize", "Tag", "Format", "Cluster", "Sort", "Map", "Outline", "Index", "Standardize"],
  },
  {
    key: "think",
    role: "ai",
    label: "Think",
    verb: "AI: Think",
    gloss: "Reason across the material.",
    example: "e.g. Compare our options against the data and flag the trade-offs",
    verbs: ["Analyze", "Reason", "Calculate", "Compare", "Predict", "Synthesize", "Infer", "Model"],
  },
  {
    key: "translate",
    role: "ai",
    label: "Translate",
    verb: "AI: Translate",
    gloss: "Reshape it for the audience.",
    example: "e.g. Turn the analysis into a one-page brief for the exec team",
    verbs: ["Convert", "Summarize", "Rephrase", "Adapt", "Simplify", "Reformat", "Explain"],
  },
  {
    key: "lead",
    role: "human",
    label: "Lead",
    verb: "Human: Lead",
    gloss: "Set direction and bring people with you.",
    example: "e.g. Decide where the organization needs to go next, and rally people to it",
    verbs: ["Vision", "Inspire", "Direct", "Champion", "Mentor", "Set strategy", "Motivate", "Align", "Advocate"],
  },
  {
    key: "own",
    role: "human",
    label: "Own",
    verb: "Human: Own",
    gloss: "Put your name on it.",
    example: "e.g. Put my name on the recommendation and stand behind it with the board",
    verbs: ["Commit", "Be accountable", "Approve", "Follow through", "Stand behind", "Defend", "Bet"],
  },
  {
    key: "judge",
    role: "human",
    label: "Judge",
    verb: "Human: Judge",
    gloss: "Decide what's good and what isn't.",
    example: "e.g. Decide which of the AI's drafts is actually good enough to ship",
    verbs: ["Discern", "Weigh", "Evaluate quality", "Apply taste", "Sanity-check", "Veto", "Trust"],
  },
  {
    key: "integrate",
    role: "human",
    label: "Integrate",
    verb: "Human: Integrate",
    gloss: "Connect it to people and context.",
    example: "e.g. Build the client relationship that makes the deal real",
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
