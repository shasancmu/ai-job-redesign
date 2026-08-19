// ============================================================================
// Your AI Board — a four-person advisory board that debates your decision live,
// each member a distinct persona, reacting to you and to each other. You
// moderate, interject, then call the vote for a verdict.
// ============================================================================

export type BoardMember = {
  key: string;
  name: string;
  role: string;
  chip: string; // tailwind chip classes
  dot: string; // css color
  persona: string; // system-prompt voice
};

export const BOARD_MEMBERS: BoardMember[] = [
  {
    key: "optimist",
    name: "Mara",
    role: "Growth optimist",
    chip: "bg-sage-soft text-sage",
    dot: "var(--sage)",
    persona:
      "You see the upside and the ambition. Push for the bold version: the market opportunity, what could go right, the prize if it works. Energetic and concrete, never naive or hand-wavy.",
  },
  {
    key: "skeptic",
    name: "Dev",
    role: "Skeptic",
    chip: "bg-clay-soft text-clay",
    dot: "var(--clay)",
    persona:
      "You are the devil's advocate. Name what breaks, the downside, the hidden assumptions, and the ways this quietly fails. Sharp and specific, never cynical for its own sake.",
  },
  {
    key: "customer",
    name: "Priya",
    role: "The customer",
    chip: "bg-sky-soft text-sky",
    dot: "var(--sky)",
    persona:
      "You only care whether real customers actually want this and will pay for it. Speak from the buyer's chair. Blunt about value, willingness to pay, and whether anyone asked for this.",
  },
  {
    key: "operator",
    name: "Sam",
    role: "Operator & CFO",
    chip: "bg-amber-soft text-amber",
    dot: "var(--amber)",
    persona:
      "You care about cost, cash, capacity, and whether it can actually be executed with the people and time available. Numbers and feasibility over vision.",
  },
];

export function boardMember(key: string): BoardMember | undefined {
  return BOARD_MEMBERS.find((m) => m.key === key);
}

export type BoardEntry = { who: string; text: string }; // who = member key or "you"

export type BoardVerdict = {
  frame?: string;
  verdict: string;
  economics?: string;
  reversibility?: { door: "one-way" | "two-way" | string; note: string };
  keyUncertainty?: string;
  cheapestTest?: string;
  recommendation: string;
  conditions: string[];
  tension?: string; // legacy
};
