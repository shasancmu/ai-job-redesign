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
//   slope   two-point before/after per series
//   bars    grouped vertical bars over categories
//   stacked stacked vertical bars (composition)
//   hbars   horizontal bars (rankings, long labels)
//   line    a trend over ordered categories
//   area    a trend with a filled area
//   scatter numeric x vs y points (relationships); optional fitted trend line
//   coef    coefficient / forest plot: an estimate with a lo–hi interval per row
export type PxChartKind = "slope" | "bars" | "stacked" | "hbars" | "line" | "area" | "scatter" | "coef";
export type PxTone = "up" | "down" | "neutral";
// x is a label for categorical charts, or a numeric-as-string value for scatter.
// lo/hi carry a confidence interval for `coef`.
export type PxPoint = { x: string; y: number; lo?: number; hi?: number };
export type PxSeries = { label: string; tone?: PxTone; points: PxPoint[]; trend?: boolean };
export type PxChart = {
  kind: PxChartKind;
  title: string;
  caption?: string;
  xLabel?: string;
  yLabel?: string;
  series: PxSeries[]; // 1–3 series
  annotation?: string; // a single callout, e.g. "+42%" or "-1.28 SD"
};

// A predict-then-reveal checkpoint (multiple choice). The gap between the guess
// and the truth is the teaching moment.
export type PxPredict = { prompt: string; choices: string[]; answer: number; reveal: string };

// An infographic of the paper's key result — designed, not a data chart. A few
// big-number callouts (with a direction), and optionally one pictograph that
// makes a proportion tangible (e.g. 7 of 10 icons filled).
export type PxStat = { value: string; label: string; tone?: PxTone; icon?: string };
export type PxPictograph = { total: number; filled: number; label: string; icon?: string; tone?: PxTone };
export type PxInfographic = { stats: PxStat[]; pictograph?: PxPictograph; caption?: string };

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
  ideaStatement: string; // the core insight in plain prose (what the reader sees)
  idea: { if_: string; then_: string; whenZ: string; because: string }; // structured form, used for teach-back grading (not shown)
  evidence: { headline: string; infographic?: PxInfographic; chart?: PxChart; takeaway: string }; // prefer the infographic; chart is an optional fallback
  mechanism: { headline: string; body: string }; // the twist / why it happens
  soWhat: { headline: string; body: string }; // implications
  teachBack: { prompt: string; audience: string; rubric: string[] }; // the Feynman payoff
  glossary?: { term: string; def: string }[];
  sourceText?: string; // the paper's extracted text, stored to ground the "Ask the paper" chat (never displayed)
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
