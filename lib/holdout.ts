// The frozen holdout — the counterfactual arm. A fixed fraction of runs are
// permanently assigned to the ORIGINAL prompt: no adopted baseline, no experiment
// nudge, ever. They are the "what if we never ran the learning loop" line the
// impact analysis measures against. Assignment is a pure, sticky hash of the run
// key (the same key the A/B engine uses), with its own salt so it's independent
// of every experiment's bucketing. Run-level, not person-level: "this run of this
// module got the frozen original."

export const HOLDOUT_FRAC = 0.1; // 10% of runs are the frozen counterfactual

// FNV-1a, matched to lib/experiments' hash but salted so the holdout split is
// statistically independent of any experiment's variant assignment.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function isHoldout(runKey: string): boolean {
  if (!runKey) return false;
  return (hash(runKey + ":holdout:v1") % 1000) < Math.round(HOLDOUT_FRAC * 1000);
}

// The KNOWN assignment propensity for the holdout/policy split this run received —
// what design-based and adaptively-weighted (AIPW) estimators need. P(holdout)=FRAC,
// P(policy)=1-FRAC.
export function propensityFor(runKey: string): number {
  return isHoldout(runKey) ? HOLDOUT_FRAC : 1 - HOLDOUT_FRAC;
}
