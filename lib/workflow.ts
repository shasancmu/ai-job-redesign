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
    title: "Draw it out",
    subtitle:
      "Let AI sketch the workflow from your description — then make it right. Add, remove, or split steps until it matches reality.",
    minutes: 8,
  },
  {
    key: "tradeoffs",
    index: 2,
    title: "The three trade-offs",
    subtitle:
      "AI pulls toward more, toward generality, toward chaos. Decide where each one has to hold the line.",
    minutes: 7,
  },
  {
    key: "assign",
    index: 3,
    title: "Who does what?",
    subtitle:
      "Colour every step — green for humans, gold for AI, purple for both. Disagreements are the most interesting part.",
    minutes: 6,
  },
  {
    key: "redesign",
    index: 4,
    title: "Your AI + Human workflow",
    subtitle:
      "Here's the redesigned workflow. Finish the thought: we'd stop ___ and start ___.",
    minutes: 5,
  },
];

export const WORKFLOW_TOTAL = WORKFLOW_STEPS.reduce((s, x) => s + x.minutes, 0);

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
