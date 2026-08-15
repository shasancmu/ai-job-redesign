// ============================================================================
// The second exercise: "Reimagine Your Organization / Workflow."
// Condensed from Prof. Hasan's deck into a ~30-min shared-canvas exercise for a
// pair or small team. Both partners edit ONE shared doc together.
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
      "Pick one workflow worth redesigning. Name it in a line — and say what breaks if you don't.",
    minutes: 2,
  },
  {
    key: "map",
    index: 1,
    title: "Map it, step by step",
    subtitle:
      "From start to finish, how does it actually work today? One step per line. Mark where a human exercises judgment.",
    minutes: 6,
  },
  {
    key: "outcome",
    index: 2,
    title: "Success & failure",
    subtitle:
      "What does this produce when it goes right, and who benefits? Then: what failure would no one notice for six months?",
    minutes: 5,
  },
  {
    key: "tradeoffs",
    index: 3,
    title: "The three trade-offs",
    subtitle:
      "AI pulls toward more, toward generality, toward chaos. Decide where each one has to hold the line.",
    minutes: 7,
  },
  {
    key: "assign",
    index: 4,
    title: "Who does what?",
    subtitle:
      "Go back to your steps. Sort every one: AI, Human, or Both. Disagreements are the most interesting part.",
    minutes: 6,
  },
  {
    key: "redesign",
    index: 5,
    title: "Redesign it",
    subtitle:
      "Complete the sentence: if we actually redesigned this, we would stop ___ and start ___.",
    minutes: 4,
  },
];

export const WORKFLOW_TOTAL = WORKFLOW_STEPS.reduce((s, x) => s + x.minutes, 0);

export const STEP_ROLES = [
  { key: "", label: "—", color: "#94a3b8" },
  { key: "ai", label: "AI", color: "#2563eb" },
  { key: "human", label: "Human", color: "#ea580c" },
  { key: "both", label: "Both", color: "#7c3aed" },
] as const;

export function stepTitle(exercise: string, phase: number): string {
  if (exercise === "workflow") {
    return WORKFLOW_STEPS[phase]?.title ?? `Step ${phase + 1}`;
  }
  return `Step ${phase + 1}`;
}
