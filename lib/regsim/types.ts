// Regression Detective — the data-generating process (DGP) spec.
//
// The AI invents a realistic scenario + this spec; CODE simulates the data from
// it and grades against it. The spec is the ANSWER KEY: it never leaves the
// server (stored in a client-unreadable table). Only the simulated data and the
// variable names/labels (never their roles) are sent to the student.

export type Dist =
  | { kind: "normal"; mean: number; sd: number }
  | { kind: "lognormal"; mean: number; sd: number } // mean/sd of the underlying normal
  | { kind: "uniform"; min: number; max: number }
  | { kind: "binary"; p: number };

export type Role = "driver" | "distractor";

// A base predictor variable. Drivers appear in the true model (possibly
// transformed); distractors are realistic red herrings, often correlated with a
// driver so a naive regression shows them as spuriously significant.
export type DgpVar = {
  name: string; // machine name, e.g. "minutes_played"
  label: string; // human meaning, e.g. "Minutes played per game"
  dist: Dist;
  role: Role;
};

export type Fn = "log" | "sqrt" | "square";

// A term in the TRUE structural equation. Only drivers appear here.
export type DgpTerm =
  | { kind: "linear"; var: string; beta: number }
  | { kind: "transform"; var: string; fn: Fn; beta: number }
  | { kind: "interaction"; vars: [string, string]; beta: number };

export type Dgp = {
  context: string; // "sports analytics", "people analytics", …
  scenario: string; // one-paragraph realistic setup shown to the student
  difficulty: "easy" | "hard";
  n: number;
  seed: number;
  outcome: { name: string; label: string };
  vars: DgpVar[];
  intercept: number;
  terms: DgpTerm[]; // the true model (over drivers)
  // Pairwise correlations to induce among the base predictors (the source of
  // multicollinearity + omitted-variable traps). |rho| < 1.
  correlations: { a: string; b: string; rho: number }[];
  noiseSd: number; // sd of the additive Gaussian error on the outcome
};

// What the CLIENT is allowed to see: the data + neutral variable meta. Crucially
// omits `role`, `terms`, `beta`, `correlations`, `noiseSd` — the answer.
export type Challenge = {
  context: string;
  scenario: string;
  difficulty: "easy" | "hard";
  n: number;
  outcome: { name: string; label: string };
  variables: { name: string; label: string }[]; // predictors only, roles hidden
  columns: Record<string, number[]>; // name -> values (includes the outcome)
};
