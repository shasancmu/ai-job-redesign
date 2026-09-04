// Star Hire — a hiring puzzle grounded in human capital theory. The AI invents a
// firm, a role, and a slate of candidates whose OBSERVABLE records look strong;
// CODE holds the hidden truth — how much of each candidate's success is PORTABLE
// (general / strategic / industry / relationship human capital) versus stuck to
// their old context (company-specific HC + firm effect + luck) — and grades the
// student's hire against the true value to THIS role.
//
// The lesson: the flashiest record is often the least portable (Groysberg). The
// right hire is the best FIT for the role's specific human-capital needs.

// The four TRANSFERABLE human-capital types (a role weights how much it needs
// each). Company-specific HC and firm effects are handled separately because
// they do NOT travel with the person.
export type HcType = "general" | "strategic" | "industry" | "relationship";

export type HcWeights = Record<HcType, number>; // importance to the role, ~sums to 1
export type HcLevels = Record<HcType, number>; // a candidate's true portable levels, 0-100

// What the STUDENT sees: an impressive but ambiguous profile that does not reveal
// portability. Roles and résumés only.
export type ObservableCandidate = {
  id: string;
  name: string;
  headline: string; // one line, e.g. "Top-ranked analyst, 8 years at a bulge-bracket firm"
  resume: string[]; // 3-5 track-record bullets (rankings, wins, tenure, current employer)
  ask: string; // compensation expectation, phrased naturally
};

export type ObservableScenario = {
  context: string;
  difficulty: "easy" | "hard";
  firm: { name: string; sector: string; oneLiner: string };
  role: { title: string; brief: string }; // the strategic objective + what success looks like
  candidates: ObservableCandidate[];
};

// The HIDDEN truth for one candidate (sealed; never sent readable to the client).
export type HiddenCandidate = {
  id: string;
  name: string;
  archetype: "star_trap" | "best_fit" | "solid" | "specialist" | "internal" | "journeyman";
  hc: HcLevels; // TRUE portable human capital, 0-100
  companyPrior: number; // prior company-specific HC (non-transferable), 0-100
  firmEffect: number; // platform boost from the old firm (non-transferable), 0-100
  portableFraction: number; // share of observed success that is actually portable, 0-1
  matchEffect: number; // fit with THIS firm's culture/strategy, -30..30
  wage: number; // compensation expectation (cost)
  tailRisk: number; // probability of being a bad hire (left-tail), 0-1
  observedRating: number; // how impressive the résumé LOOKS, 0-100 (the star trap scores high here)
  tell: string; // the single diagnostic fact a sharp question would surface
  probes: { q: string; value: "high" | "med" | "low" }[]; // ranked diagnostic questions for this candidate
};

export type HiddenScenario = {
  context: string;
  difficulty: "easy" | "hard";
  firm: { name: string; sector: string; oneLiner: string };
  role: { title: string; brief: string };
  roleWeights: HcWeights;
  candidates: HiddenCandidate[];
  principle: string; // the core human-capital lesson for this scenario
};

// A candidate scored by the true-value model (computed by code from the hidden
// truth); used to grade the decision and to feed the AI reveal.
export type ScoredCandidate = {
  id: string;
  name: string;
  value: number; // true expected value to THIS role
  rank: number; // 1 = best hire
  portableHc: number; // weighted true portable HC (0-100)
};
