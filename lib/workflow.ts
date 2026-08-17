// ============================================================================
// "Reimagine a Workflow" — a visual AI+Human workflow redesign.
// Name it → AI drafts the flow → edit/split/recolor the nodes → weigh the three
// OCC trade-offs → end with a redesigned AI+Human workflow.
// ============================================================================

export type WFStep = {
  key: string;
  index: number;
  title: string;
  subtitle: string;
  minutes: number;
};

export const WORKFLOW_STEPS: WFStep[] = [
  {
    key: "name",
    index: 0,
    title: "Name the workflow",
    subtitle:
      "Pick one workflow worth redesigning. In a line, what is it — and what breaks if you don't fix it?",
    minutes: 4,
  },
  {
    key: "map",
    index: 1,
    title: "Draw it as it is today",
    subtitle:
      "The honest current state — every step a human does now. AI sketches it from your description; make it match reality.",
    minutes: 6,
  },
  {
    key: "analyze",
    index: 2,
    title: "How AI makes it better",
    subtitle:
      "AI finds where it genuinely helps — the outcome, how, and how to prep fast — then proposes the split. Recolor together; disagreements are the most interesting part.",
    minutes: 8,
  },
  {
    key: "tradeoffs",
    index: 3,
    title: "The three trade-offs",
    subtitle:
      "AI pulls toward more, toward generality, toward chaos. Decide where each holds the line — then AI builds your plan for getting to better outcomes, accuracy where it counts, and structure that makes autonomy safe.",
    minutes: 6,
  },
  {
    key: "redesign",
    index: 4,
    title: "Your AI + Human workflow",
    subtitle:
      "Here's the redesigned workflow. Finish the thought: we'd stop ___ and start ___.",
    minutes: 6,
  },
];

export const WORKFLOW_TOTAL = WORKFLOW_STEPS.reduce((s, x) => s + x.minutes, 0);

// Solo, AI-assisted version — you + AI, no partner.
export const SOLO_WORKFLOW_STEPS: WFStep[] = [
  {
    key: "name",
    index: 0,
    title: "Name the workflow",
    subtitle: "Pick one worth redesigning. In a line, what is it — and what breaks if you don't fix it?",
    minutes: 3,
  },
  {
    key: "interview",
    index: 1,
    title: "Tell the AI about it",
    subtitle: "Answer a few questions so the AI understands how the workflow actually runs today.",
    minutes: 6,
  },
  {
    key: "map",
    index: 2,
    title: "Draw it as it is today",
    subtitle: "The honest current state — every step a human does now. AI sketches it; you make it match reality.",
    minutes: 6,
  },
  {
    key: "analyze",
    index: 3,
    title: "How AI makes it better",
    subtitle: "AI studies your real workflow and finds where it genuinely helps — the outcome, how, and how to prep fast.",
    minutes: 8,
  },
  {
    key: "tradeoffs",
    index: 4,
    title: "The three trade-offs",
    subtitle: "AI pulls toward more, toward generality, toward chaos. Decide where each holds the line — then AI builds your plan for getting to better outcomes, accuracy where it counts, and structure that makes autonomy safe.",
    minutes: 6,
  },
  {
    key: "redesign",
    index: 5,
    title: "Your AI + Human workflow",
    subtitle: "The redesigned workflow. Finish the thought: we'd stop ___ and start ___.",
    minutes: 5,
  },
];

// Node roles — green human, gold AI (the logo), purple for both.
export const STEP_ROLES = [
  { key: "human", label: "Human", color: "#3F7A52" },
  { key: "ai", label: "AI", color: "#CE8F2C" },
  { key: "both", label: "Both", color: "#7C5CBF" },
] as const;

export const ROLE_META: Record<string, { label: string; color: string }> = {
  "": { label: "Unassigned", color: "#94a3b8" },
  human: { label: "Human", color: "#3F7A52" },
  ai: { label: "AI", color: "#CE8F2C" },
  both: { label: "Both", color: "#7C5CBF" },
};

export function stepTitle(exercise: string, phase: number): string {
  if (exercise === "workflow") {
    return WORKFLOW_STEPS[phase]?.title ?? `Step ${phase + 1}`;
  }
  return `Step ${phase + 1}`;
}
