// The true-value model. A candidate's value to THIS role is their weighted
// PORTABLE human capital (company-specific HC and firm effects are excluded —
// they don't travel), plus fit with this firm, minus wage and the expected cost
// of a bad hire. This is what the student is graded against; the flashy
// "observedRating" deliberately does NOT enter it.

import type { HiddenScenario, HiddenCandidate, ScoredCandidate, HcType } from "./types";

const HC_TYPES: HcType[] = ["general", "strategic", "industry", "relationship"];
const RISK_PENALTY = 45; // a coin-flip tail risk costs ~22 points of value
const WAGE_PENALTY = 25; // the priciest vs. cheapest candidate differ by ~this much

export function portableHc(c: HiddenCandidate, w: HiddenScenario["roleWeights"]): number {
  let s = 0;
  for (const t of HC_TYPES) s += (w[t] || 0) * (c.hc[t] || 0);
  return s; // 0-100
}

export function scoreCandidates(scn: HiddenScenario): ScoredCandidate[] {
  const wages = scn.candidates.map((c) => c.wage);
  const wMin = Math.min(...wages);
  const wMax = Math.max(...wages);
  const wSpread = wMax - wMin || 1;

  const scored = scn.candidates.map((c) => {
    const phc = portableHc(c, scn.roleWeights);
    const wagePen = ((c.wage - wMin) / wSpread) * WAGE_PENALTY;
    const value = phc + c.matchEffect - wagePen - c.tailRisk * RISK_PENALTY;
    return { id: c.id, name: c.name, value, rank: 0, portableHc: phc };
  });

  [...scored].sort((a, b) => b.value - a.value).forEach((s, i) => {
    const ref = scored.find((x) => x.id === s.id)!;
    ref.rank = i + 1;
  });
  return scored;
}

// Objective decision score (0-100) for the picked candidate. Picking the true
// best is 100; picking a near-tie is barely penalized; picking the worst is low.
// Values are spread onto a 0-100 band so "how much worse" matters, not just rank.
export function decisionScore(scored: ScoredCandidate[], pickedId: string): number {
  const picked = scored.find((s) => s.id === pickedId);
  if (!picked) return 0;
  const vals = scored.map((s) => s.value);
  const best = Math.max(...vals);
  const worst = Math.min(...vals);
  const span = best - worst || 1;
  return Math.round(100 * ((picked.value - worst) / span) ** 0.85);
}
