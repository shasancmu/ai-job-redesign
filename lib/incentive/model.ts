// The scoring model + the deterministic best-response solver. Given a worker's
// effort allocation across actions, compute the metrics the boss sees, the true
// value delivered, and the worker's reward/utility under the student's design.
// The best-response solver (coordinate ascent) finds the utility-maximizing
// worker strategy, i.e. the optimal way to play the incentive, so grading always
// reflects the true best exploit regardless of how well the AI agents play.

import type { HiddenScenario, IncentiveDesign, Strategy, Evaluation } from "./types";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// Normalize the student's reward weights to fractions summing to 1.
function normWeights(scn: HiddenScenario, design: IncentiveDesign): Record<string, number> {
  const w: Record<string, number> = {};
  let sum = 0;
  for (const m of scn.metrics) {
    const v = Math.max(0, Number(design.weights?.[m.key]) || 0);
    w[m.key] = v;
    sum += v;
  }
  if (sum <= 0) return w; // all-zero: no incentive at all
  for (const k of Object.keys(w)) w[k] /= sum;
  return w;
}

// Reward earned for a metric outcome, applying the floor gate and cap.
function metricReward(outcome: number, floor?: number, cap?: number): number {
  if (floor != null && outcome < floor) return 0;
  const capped = cap != null ? Math.min(outcome, cap) : outcome;
  return clamp(capped, 0, 100) / 100; // 0..1
}

export function evaluate(scn: HiddenScenario, design: IncentiveDesign, strategy: Strategy): Evaluation {
  const w = normWeights(scn, design);
  const metricOutcome: Record<string, number> = {};
  const valueOutcome: Record<string, number> = {};
  for (const m of scn.metrics) metricOutcome[m.key] = 0;
  for (const d of scn.trueDims) valueOutcome[d.key] = 0;

  let totalEffort = 0;
  for (const a of scn.actions) {
    const alloc = clamp(Number(strategy[a.key]) || 0, 0, 1);
    if (alloc <= 0) continue;
    totalEffort += alloc * a.effort;
    for (const m of scn.metrics) metricOutcome[m.key] += alloc * (a.metricEffect[m.key] || 0);
    for (const d of scn.trueDims) valueOutcome[d.key] += alloc * (a.valueEffect[d.key] || 0);
  }
  for (const m of scn.metrics) metricOutcome[m.key] = clamp(metricOutcome[m.key], 0, 100);

  let reward = 0;
  for (const m of scn.metrics) reward += w[m.key] * metricReward(metricOutcome[m.key], design.floors?.[m.key], design.caps?.[m.key]);
  reward *= 100; // 0..100

  let trueValue = 0;
  for (const d of scn.trueDims) trueValue += d.weight * clamp(valueOutcome[d.key], 0, 100);

  const leisure = scn.leisure * Math.max(0, 1 - totalEffort);
  return { reward, utility: reward + leisure, trueValue, totalEffort, metricOutcome, valueOutcome };
}

// Coordinate-ascent best response: repeatedly add a small slice of effort to the
// action that most improves the worker's utility, until the effort budget is
// spent or no action helps (the worker would rather keep the leisure). Robust
// and cheap; finds the reward-maximizing (i.e. optimally-gamed) strategy.
export function bestResponse(scn: HiddenScenario, design: IncentiveDesign, opts?: { restrictKinds?: Set<string> }): { strategy: Strategy; eval: Evaluation } {
  const actions = scn.actions.filter((a) => !opts?.restrictKinds || opts.restrictKinds.has(a.kind));
  const step = 0.1;
  const strat: Strategy = {};
  for (const a of actions) strat[a.key] = 0;

  for (let iter = 0; iter < 60; iter++) {
    const cur = evaluate(scn, design, strat);
    if (cur.totalEffort >= 0.999) break;
    let bestKey: string | null = null;
    let bestGain = 1e-6; // must strictly help
    for (const a of actions) {
      if (strat[a.key] >= 1) continue;
      const inc = Math.min(step, 1 - strat[a.key]);
      // don't overspend the effort budget
      if (cur.totalEffort + inc * a.effort > 1.0001) continue;
      const trial = { ...strat, [a.key]: strat[a.key] + inc };
      const gain = evaluate(scn, design, trial).utility - cur.utility;
      if (gain > bestGain) { bestGain = gain; bestKey = a.key; }
    }
    if (!bestKey) break; // leisure beats every remaining move
    strat[bestKey] += Math.min(step, 1 - strat[bestKey]);
  }
  return { strategy: strat, eval: evaluate(scn, design, strat) };
}

// A tidy, validated strategy from an agent's raw allocation (clamps, drops
// unknown keys, scales down if the effort budget is exceeded).
export function cleanStrategy(scn: HiddenScenario, raw: any): Strategy {
  const keys = new Set(scn.actions.map((a) => a.key));
  const s: Strategy = {};
  let effort = 0;
  for (const a of scn.actions) {
    const v = clamp(Number(raw?.[a.key]) || 0, 0, 1);
    s[a.key] = v;
    effort += v * a.effort;
  }
  // ignore any stray keys the agent invented
  for (const k of Object.keys(raw || {})) if (!keys.has(k)) delete (s as any)[k];
  if (effort > 1) {
    const scale = 1 / effort;
    for (const a of scn.actions) s[a.key] *= scale;
  }
  return s;
}

// Search a small space of candidate incentive designs and return the one whose
// optimally-gamed outcome yields the highest TRUE value. This is "par": the best
// a smart designer could do, used to (a) reject un-designable scenarios at
// generation and (b) show the student a target to beat.
export function bestAchievableDesign(scn: HiddenScenario): { design: IncentiveDesign; trueValue: number } {
  const metrics = scn.metrics.map((m) => m.key);
  const weightVectors: Record<string, number>[] = [];
  // each metric solo
  for (const m of metrics) weightVectors.push({ [m]: 100 });
  // uniform
  weightVectors.push(Object.fromEntries(metrics.map((m) => [m, 1])));
  // each pair
  for (let i = 0; i < metrics.length; i++) for (let j = i + 1; j < metrics.length; j++) weightVectors.push({ [metrics[i]]: 1, [metrics[j]]: 1 });
  // each metric weighted heavy + rest light
  for (const m of metrics) weightVectors.push(Object.fromEntries(metrics.map((k) => [k, k === m ? 3 : 1])));

  const floorSets: (Record<string, number> | undefined)[] = [undefined, Object.fromEntries(metrics.map((m) => [m, 45]))];

  let best: { design: IncentiveDesign; trueValue: number } = { design: { weights: {} }, trueValue: -1 };
  for (const weights of weightVectors) {
    for (const floors of floorSets) {
      const design: IncentiveDesign = { weights, floors };
      const tv = bestResponse(scn, design).eval.trueValue;
      if (tv > best.trueValue) best = { design, trueValue: tv };
    }
  }
  return best;
}

// The firm's ideal: the highest TRUE value achievable if the worker simply did
// the right thing (used as the reference point for "how much value was left on
// the table"). Maximize trueValue directly under the effort budget.
export function firmOptimum(scn: HiddenScenario): { strategy: Strategy; eval: Evaluation } {
  const step = 0.1;
  const strat: Strategy = {};
  for (const a of scn.actions) strat[a.key] = 0;
  const trueVal = (s: Strategy) => evaluate(scn, { weights: {} }, s).trueValue;
  for (let iter = 0; iter < 60; iter++) {
    let effort = 0;
    for (const a of scn.actions) effort += strat[a.key] * a.effort;
    if (effort >= 0.999) break;
    let bestKey: string | null = null;
    let bestGain = 1e-6;
    const base = trueVal(strat);
    for (const a of scn.actions) {
      if (strat[a.key] >= 1) continue;
      const inc = Math.min(step, 1 - strat[a.key]);
      if (effort + inc * a.effort > 1.0001) continue;
      const gain = trueVal({ ...strat, [a.key]: strat[a.key] + inc }) - base;
      if (gain > bestGain) { bestGain = gain; bestKey = a.key; }
    }
    if (!bestKey) break;
    strat[bestKey] += Math.min(step, 1 - strat[bestKey]);
  }
  return { strategy: strat, eval: evaluate(scn, { weights: {} }, strat) };
}
