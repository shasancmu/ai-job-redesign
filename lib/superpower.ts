// ============================================================================
// Find Your Superpower — surface a person's rare, hard-to-copy capability
// (their VRIN-O asset) from stories, not self-assessment.
//
// Method: Reflected Best Self (Roberts, Dutton, Spreitzer, Quinn) + Behavioral
// Event Interviewing (McClelland). A superpower is a CROSS-DOMAIN INVARIANT — a
// lens or mode of processing that recurs across unrelated wins — and it's
// usually invisible to its owner because it feels effortless (tacit knowledge,
// Polanyi). We elicit specific best-self stories, extract the invariant, rank a
// stack of 2-3, and pressure-test the moat with VRIN-O (Barney).
// ============================================================================

export type SuperpowerStep = { key: string; title: string; minutes: number };

export const SUPERPOWER_STEPS: SuperpowerStep[] = [
  { key: "prime", title: "When you were at your best", minutes: 4 },
  { key: "interview", title: "The interview", minutes: 12 },
  { key: "report", title: "Your superpower stack", minutes: 4 },
];

export type Superpower = {
  rank: number;
  name: string; // crisp and vivid, e.g. "thinking in data"
  whatItIs: string;
  evidence: string[]; // grounded in their stories
  whyRare: string; // why it resists imitation (tacit / path-dependent / socially complex)
};

export type SuperpowerReport = {
  headline: string;
  stack: Superpower[]; // 2-3, ranked
  combination: string; // how the stack combines into something rarer than any one alone
  vrino: {
    valuable: string;
    rare: string;
    inimitable: string;
    nonSubstitutable: string;
    organized: string; // are they positioned to capture its value?
  };
  moatStrength: "narrow" | "solid" | "formidable";
  organize: string[]; // how to build a career/role/moat around it (the "O")
  watchout: string; // the shadow side / where the superpower misfires
};
