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
  // "break" = an instructor-led pause (not timer-gated)
  mode: "solo" | "talk" | "reveal" | "break";
  interviewer?: "A" | "B"; // for talk phases: which role is asking the questions
  focus?: "job" | "value"; // for talk phases: understand the job, or dig into value
};

export const PHASES: Phase[] = [
  {
    key: "setup",
    index: 0,
    title: "Your job today",
    subtitle:
      "Write your own job in a line or two. This is what your partner will redesign — so make it real.",
    minutes: 3,
    mode: "solo",
  },
  {
    key: "interview1",
    index: 1,
    title: "Interview · turn 1",
    subtitle:
      "One partner interviews about their job; the other just shares. Take notes — what do they do, and what actually matters in it?",
    minutes: 4,
    mode: "talk",
    interviewer: "A",
    focus: "job",
  },
  {
    key: "interview2",
    index: 2,
    title: "Interview · turn 2",
    subtitle: "Switch. Now the other partner interviews about their job.",
    minutes: 4,
    mode: "talk",
    interviewer: "B",
    focus: "job",
  },
  {
    key: "deeper1",
    index: 3,
    title: "Dig deeper · turn 1",
    subtitle:
      "Same pairs, go deeper. What value do they create, and for whom — the customer, the org, their manager? How would you know it's working?",
    minutes: 3,
    mode: "talk",
    interviewer: "A",
    focus: "value",
  },
  {
    key: "deeper2",
    index: 4,
    title: "Dig deeper · turn 2",
    subtitle: "Switch. Dig into the value your other partner creates.",
    minutes: 3,
    mode: "talk",
    interviewer: "B",
    focus: "value",
  },
  {
    key: "summary",
    index: 5,
    title: "What you learned",
    subtitle:
      "Distill it. From your notes, capture the value your partner creates, their real job, and one thing they might not see.",
    minutes: 4,
    mode: "solo",
  },
  {
    key: "break",
    index: 6,
    title: "The 2×4 model",
    subtitle: "Pause here — your instructor will teach the AI × Human model before you redesign.",
    minutes: 0,
    mode: "break",
  },
  {
    key: "redesign",
    index: 7,
    title: "Redesign with the 2×4 model",
    subtitle:
      "Using your notes, design your partner's role: what should they delegate to AI, and what should they lean into?",
    minutes: 8,
    mode: "solo",
  },
  {
    key: "share",
    index: 8,
    title: "Share & get feedback",
    subtitle:
      "Show your partner the redesign you made for them, and capture their feedback. Then react to the one they made for you.",
    minutes: 6,
    mode: "reveal",
  },
  {
    key: "final",
    index: 9,
    title: "Their reimagined job",
    subtitle:
      "Redo it with the feedback. This is the artifact your partner keeps — the reimagined version of their job.",
    minutes: 4,
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
