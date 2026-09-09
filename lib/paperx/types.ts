// The "Explainer Genome" — the typed spec every Paper Explainer is generated
// into and that PaperxReader renders. Plain data (no JSX), so it can be produced
// by the AI generator, sanitized, stored as JSON in custom_modules.spec, and
// rendered by the interactive reader.
//
// The teaching arc is built from Hasan's "Research, Strategy" frameworks: the
// null model (what everyone believes), the violated-expectation puzzle, the idea
// as an interaction (IF X THEN Y ESPECIALLY/EXCEPT WHEN Z BECAUSE), the evidence,
// the mechanism, and the implications — then a teach-back (the Feynman test).

// A tiny chart the reader draws inline as SVG. Kept deliberately small and robust
// so an AI-extracted result renders cleanly in both light and dark themes.
export type PxChartKind = "slope" | "bars" | "line";
export type PxTone = "up" | "down" | "neutral";
export type PxPoint = { x: string; y: number };
export type PxSeries = { label: string; tone?: PxTone; points: PxPoint[] };
export type PxChart = {
  kind: PxChartKind;
  title: string;
  caption?: string;
  yLabel?: string;
  series: PxSeries[]; // 1–3 series
  annotation?: string; // a single callout, e.g. "+42%" or "-1.28 SD"
};

// A predict-then-reveal checkpoint (multiple choice). The gap between the guess
// and the truth is the teaching moment.
export type PxPredict = { prompt: string; choices: string[]; answer: number; reveal: string };

export type PxGenome = {
  slug: string;
  // Provenance — the actual paper.
  paperTitle: string;
  authors: string; // "Gartenberg, Hasan, Murray & Pierce (2026)"
  venue?: string; // "Organization Science"
  // The explainer itself.
  title: string; // the punchy learner-facing title
  eyebrow: string; // "AI · peer review · incentives"
  emoji: string;
  dek: string; // one-paragraph hook (light markdown)
  bigQuestion: string; // the motivating question, one line
  hook: { headline: string; body: string }; // why anyone should care
  nullBelief: { headline: string; body: string }; // the conventional wisdom / null
  puzzle: { believe: string; expect: string; observe: string }; // violated expectation
  predicts: PxPredict[]; // 1–2 predict-then-reveal checkpoints
  idea: { if_: string; then_: string; whenZ: string; because: string }; // the interaction
  evidence: { headline: string; chart?: PxChart; takeaway: string };
  mechanism: { headline: string; body: string }; // the twist / why it happens
  soWhat: { headline: string; body: string }; // implications
  teachBack: { prompt: string; audience: string; rubric: string[] }; // the Feynman payoff
  glossary?: { term: string; def: string }[];
  generated?: boolean; // AI-drafted (shows the verify-before-publish banner)
  access?: "public" | "enrolled";
  cohorts?: string[]; // class codes for enrolled access
};

// What a teach-back evaluation returns (from the AI grader).
export type PxTeachback = {
  score: number; // 0–100, how clearly the learner explained the idea
  verdict: string; // one-line honest read
  strengths: string[];
  gaps: string[]; // what a listener would still be confused about
  model: string; // a model 3-sentence explanation to compare against
};
