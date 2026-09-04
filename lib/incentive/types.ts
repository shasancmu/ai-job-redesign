// The Incentive Lab — design a reward system, then watch AI worker-agents game
// it. House pattern: the AI invents the world (a firm's true objective, the
// measurable metrics, and a menu of worker actions, some productive, some pure
// metric-gaming, some that quietly harm unmeasured value); CODE owns the hidden
// truth (how each action really moves true value) and scores every strategy.
//
// The lesson (Goodhart / Holmstrom-Milgrom / Wells Fargo): when a measure
// becomes a target it stops being a good measure; rewarding what you can count
// pulls effort away from what actually matters.

export type Metric = { key: string; label: string; unit?: string }; // measurable, shown to the student
export type Dim = { key: string; label: string; weight: number }; // a dimension of TRUE value (weights ~sum 1) — HIDDEN

export type ActionKind = "productive" | "gaming" | "harmful" | "unmeasured_good";

// One thing a worker can spend effort on. metricEffect is what workers can SEE
// (they live the dashboard); valueEffect is the hidden truth.
export type Action = {
  key: string;
  label: string;
  description: string;
  effort: number; // effort cost of one full unit (0.2..1)
  metricEffect: Record<string, number>; // per full unit, on each metric (0..100). VISIBLE to worker-agents.
  valueEffect: Record<string, number>; // per full unit, on each true dimension (-100..100). HIDDEN.
  kind: ActionKind;
};

export type HiddenScenario = {
  context: string;
  difficulty: "easy" | "hard";
  firm: { name: string; oneLiner: string };
  role: { title: string; brief: string }; // the honest purpose of the job
  metrics: Metric[];
  trueDims: Dim[];
  actions: Action[];
  leisure: number; // value to the worker of effort NOT spent (the shirking outside option), 0..40
  principle: string;
};

// What the student sees to design the incentive: the firm's true goal in prose,
// the metrics they can reward, and the action space (labels only, NOT the effect
// matrix, that is the thing gaming reveals).
export type ObservableScenario = {
  context: string;
  difficulty: "easy" | "hard";
  firm: { name: string; oneLiner: string };
  role: { title: string; brief: string };
  trueObjective: string; // prose: what the firm actually wants
  metrics: Metric[];
  actions: { key: string; label: string; description: string }[];
};

// The student's incentive design: how the reward pool is split across metrics,
// with optional floors (must clear to earn) and caps (no reward beyond).
export type IncentiveDesign = {
  weights: Record<string, number>; // metricKey -> reward points (normalized internally)
  floors?: Record<string, number>; // metricKey -> minimum outcome to earn that metric's reward
  caps?: Record<string, number>; // metricKey -> outcome beyond which no extra reward
  note?: string;
};

// A worker strategy: how they split effort across actions (alloc 0..1 each).
export type Strategy = Record<string, number>;

export type Evaluation = {
  reward: number; // what the worker earns under the design (0..100)
  utility: number; // reward + leisure value of unspent effort
  trueValue: number; // true value delivered to the firm (0..100)
  totalEffort: number;
  metricOutcome: Record<string, number>; // the dashboard the boss sees
  valueOutcome: Record<string, number>; // the true per-dimension result
};
