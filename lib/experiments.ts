// ============================================================================
// Continuous experimentation engine. The rule that keeps this honest: ALL
// statistics live here, in deterministic code. The LLM proposes subtle variants
// and narrates results in English, but it NEVER decides significance, and a
// result is only "conclusive" once each arm has reached the pre-registered
// sample size (this is the guardrail against calling fake early winners).
// ============================================================================

import { moduleByExercise } from "@/lib/modules";

export type Variant = { key: string; label: string; nudge: string };
export type Experiment = {
  id: string;
  flow: string;
  name: string;
  hypothesis: string;
  metric: "completion" | "depth" | "shared" | "score";
  depth_threshold: number;
  variants: Variant[];
  min_per_arm: number;
  status: "proposed" | "running" | "concluded" | "adopted" | "rejected";
  target: "interview" | "report"; // does the nudge change the interview or the final report?
  mode: "human" | "synthetic"; // real subjects, or AI-persona simulated subjects
  created_by: string;
  result: any;
  created_at: string;
  launched_at: string | null;
  concluded_at: string | null;
};

export const TARGETS: { key: "interview" | "report"; label: string; help: string }[] = [
  { key: "interview", label: "The interview", help: "how the AI asks questions" },
  { key: "report", label: "The report", help: "how the final write-up is worded" },
];

// A small, diverse library of simulated subjects for synthetic experiments.
// Deliberately varied in temperament and verbosity so a nudge's effect shows up.
export const PERSONAS: { key: string; persona: string }[] = [
  { key: "terse-skeptic", persona: "A busy, skeptical small-business owner in their 50s. Terse, a little guarded, answers in short sentences, needs to feel it's worth their time or they disengage." },
  { key: "eager-novice", persona: "An eager first-time founder in their 20s. Enthusiastic, verbose, over-shares, easily excited but also easily overwhelmed." },
  { key: "guarded-pro", persona: "A guarded mid-career professional. Polished, careful with what they reveal, warms up only when they feel genuinely understood." },
  { key: "pragmatic-operator", persona: "A no-nonsense operations manager. Wants specifics and numbers, impatient with fluff, values being taken seriously." },
  { key: "anxious-switcher", persona: "Someone anxious about a career or business change. Uncertain, seeks reassurance, prone to second-guessing, responds well to warmth." },
  { key: "confident-veteran", persona: "A confident industry veteran. Opinionated, has seen it all, tests whether the AI actually adds value before engaging fully." },
];

// Exercise keys that can be experimented on today: their live route threads the
// treatment "nudge" into the AI prompt (see experimentNudge callers) AND their
// outcomes are measurable by the stats core (sessions + workspaces, via
// successForSession). To add a module, wire BOTH for its engine, then add its
// exercise key here — the dropdown label is pulled live from the module registry
// so it never goes stale as modules are renamed or added.
export const EXPERIMENT_CAPABLE_EXERCISES: string[] = [
  // Interview / canvas engines (treatment via /api/interview + the specific routes).
  "consult", "resume", "empathy", "superpower", "board", "solo", "workflow-solo",
  "myopia-business", "myopia-career", "personal-network", "domain-brief", "collaborators", "licensing-brief",
  // Built-in negotiation scenarios (treatment on the counterpart; score = value claimed).
  "negotiation", "haggle", "raise", "vendor-deal", "lease",
  // Built-in hidden-truth sims (treatment on the character; score = decision quality).
  "earnings-call", "hot-seat", "star-hire",
];

export const EXPERIMENT_FLOWS: { key: string; label: string }[] = EXPERIMENT_CAPABLE_EXERCISES
  .map((ex) => ({ key: ex, label: moduleByExercise(ex)?.name || ex }))
  .sort((a, b) => a.label.localeCompare(b.label));

// Threshold (0-100) a scored run must reach to count as a "good decision" for the
// score metric. Fixed for now; a continuous mean-comparison is a future refinement.
export const SCORE_WIN = 70;

export const METRICS: { key: "completion" | "depth" | "shared" | "score"; label: string; help: string }[] = [
  { key: "score", label: "Decision quality", help: `scored ${SCORE_WIN}+ (for scored modules)` },
  { key: "completion", label: "Completion rate", help: "reached a finished report" },
  { key: "depth", label: "Interview depth", help: "answered at least the threshold number of questions" },
  { key: "shared", label: "Share rate", help: "created a public share link for the result" },
];

export function flowLabel(flow: string): string {
  return EXPERIMENT_FLOWS.find((f) => f.key === flow)?.label || flow;
}

// --- Deterministic bucketing -------------------------------------------------
// FNV-1a over (sessionId + experimentId) → stable variant, so a session always
// sees the same arm and the split is even across sessions.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
export function pickVariant(variants: Variant[], sessionId: string, experimentId: string): Variant | null {
  if (!variants.length) return null;
  const idx = hash(`${sessionId}:${experimentId}`) % variants.length;
  return variants[idx];
}

// --- Statistics (all deterministic) -----------------------------------------
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// Wilson score interval for a binomial rate (better than normal at small n).
export function wilson(x: number, n: number): { lo: number; hi: number } {
  if (n === 0) return { lo: 0, hi: 0 };
  const z = 1.96;
  const p = x / n;
  const d = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

// Two-proportion z-test (two-sided).
export function twoProportionP(xc: number, nc: number, xt: number, nt: number): number | null {
  if (nc === 0 || nt === 0) return null;
  const pc = xc / nc;
  const pt = xt / nt;
  const pool = (xc + xt) / (nc + nt);
  const se = Math.sqrt(pool * (1 - pool) * (1 / nc + 1 / nt));
  if (se === 0) return 1;
  const z = (pt - pc) / se;
  return 2 * (1 - normCdf(Math.abs(z)));
}

export type ArmStat = { key: string; label: string; n: number; successes: number; rate: number; ci: { lo: number; hi: number } };
export type Analysis = {
  metric: string;
  arms: ArmStat[];
  control?: ArmStat;
  best?: ArmStat;
  liftAbs: number | null;   // best.rate - control.rate
  liftRel: number | null;   // relative %
  pValue: number | null;
  minPerArm: number;
  reachedSample: boolean;
  significant: boolean;
  conclusive: boolean;      // reachedSample AND significant (the only time we call a winner)
};

// Given the assignments (each with a derived success 0/1), compute the stats.
export function analyze(
  exp: Pick<Experiment, "metric" | "min_per_arm">,
  variants: Variant[],
  rows: { variant_key: string; success: boolean }[]
): Analysis {
  const arms: ArmStat[] = variants.map((v) => {
    const mine = rows.filter((r) => r.variant_key === v.key);
    const n = mine.length;
    const successes = mine.filter((r) => r.success).length;
    return { key: v.key, label: v.label, n, successes, rate: n ? successes / n : 0, ci: wilson(successes, n) };
  });
  const control = arms.find((a) => a.key === "control") || arms[0];
  const challengers = arms.filter((a) => a !== control);
  const best = challengers.slice().sort((a, b) => b.rate - a.rate)[0];

  const reachedSample = arms.length > 0 && arms.every((a) => a.n >= exp.min_per_arm);
  let pValue: number | null = null;
  let liftAbs: number | null = null;
  let liftRel: number | null = null;
  if (control && best) {
    pValue = twoProportionP(control.successes, control.n, best.successes, best.n);
    liftAbs = best.rate - control.rate;
    liftRel = control.rate > 0 ? (best.rate - control.rate) / control.rate : null;
  }
  const significant = pValue != null && pValue < 0.05;
  return {
    metric: exp.metric,
    arms,
    control,
    best,
    liftAbs,
    liftRel,
    pValue,
    minPerArm: exp.min_per_arm,
    reachedSample,
    significant,
    conclusive: reachedSample && significant,
  };
}

// Turn a session's own state into the binary success for a given metric.
export function successForSession(metric: string, depthThreshold: number, session: any, canvas: any): boolean {
  if (metric === "shared") return !!session?.public_token || !!canvas?.reportToken;
  if (metric === "depth") {
    const chat = canvas?.interview_chat || canvas?.transcript || [];
    const answers = Array.isArray(chat) ? chat.filter((m: any) => m?.role === "user").length : 0;
    return answers >= (depthThreshold || 4);
  }
  // completion: the session finished (a report was produced)
  return session?.status === "done" || !!canvas?.report || !!canvas?.verdict || !!canvas?.aggregate;
}

// --- The ratchet: the flow's adopted baseline nudge --------------------------
// The autopilot writes a winning treatment here so it becomes the permanent floor
// for a flow, applied through experimentNudge to EVERY run — whether or not an
// experiment is live. Fail-safe: "" if the table isn't migrated yet.
export async function getBaseline(admin: any, flow: string, target: "interview" | "report" = "interview"): Promise<string> {
  if (!flow || !admin) return "";
  try {
    const { data } = await admin.from("experiment_baselines").select("nudge").eq("flow", flow).eq("target", target).maybeSingle();
    return (data?.nudge || "").slice(0, 800);
  } catch { return ""; }
}
export async function setBaseline(admin: any, flow: string, target: "interview" | "report", nudge: string, increment?: string): Promise<void> {
  if (!flow || !admin) return;
  try {
    const { data: cur } = await admin.from("experiment_baselines").select("history").eq("flow", flow).eq("target", target).maybeSingle();
    const history = Array.isArray(cur?.history) ? cur!.history : [];
    if (increment) history.push({ increment, at: new Date().toISOString() });
    await admin.from("experiment_baselines").upsert(
      { flow, target, nudge: (nudge || "").slice(0, 800), history, updated_at: new Date().toISOString() },
      { onConflict: "flow,target" },
    );
  } catch { /* table not migrated — the ratchet is simply not persisted yet */ }
}

// --- Runtime: assign a session to a variant and return the prompt nudge ------
// Uses whatever supabase client is passed (the admin client at call sites).
// Lazily records the assignment the first time a session hits the flow. Always
// applies the flow's adopted baseline (the ratchet) so proven wins stay live
// even between experiments.
export async function experimentNudge(admin: any, sessionId: string, flow: string, target: "interview" | "report" = "interview"): Promise<string> {
  if (!sessionId || !admin) return "";
  const baseline = await getBaseline(admin, flow, target);
  try {
    const { data: exps } = await admin
      .from("experiments")
      .select("id, variants")
      .in("flow", [flow, "all"])
      .eq("status", "running")
      .eq("mode", "human")
      .eq("target", target)
      .order("launched_at", { ascending: true })
      .limit(1);
    const exp = exps?.[0];
    if (!exp) return baseline; // no live test — the adopted baseline still applies

    // Sticky: reuse an existing assignment if present.
    const { data: existing } = await admin
      .from("experiment_assignments")
      .select("variant_key")
      .eq("experiment_id", exp.id)
      .eq("session_id", sessionId)
      .maybeSingle();
    let key = existing?.variant_key as string | undefined;
    if (!key) {
      const v = pickVariant(exp.variants || [], sessionId, exp.id);
      if (!v) return baseline;
      key = v.key;
      await admin.from("experiment_assignments").upsert(
        { experiment_id: exp.id, session_id: sessionId, variant_key: key },
        { onConflict: "experiment_id,session_id" }
      );
    }
    const v = (exp.variants || []).find((x: Variant) => x.key === key);
    // Baseline (adopted floor) + this arm's own nudge (the increment being tested).
    return [baseline, (v?.nudge || "")].filter(Boolean).join(" ").slice(0, 900);
  } catch {
    return baseline;
  }
}

// Resolve a session's own exercise key — the canonical flow key for routes that
// serve many exercises (e.g. /api/interview). Used both to match experiments and
// to label the conversation spine so its module == its A/B flow key.
export async function resolveExercise(admin: any, sessionId: string): Promise<string> {
  if (!sessionId || !admin) return "";
  try {
    const { data } = await admin.from("sessions").select("exercise").eq("id", sessionId).maybeSingle();
    return (data?.exercise as string) || "";
  } catch { return ""; }
}

// For routes shared across exercises (e.g. /api/interview serves both the solo
// and paired flows): resolve the session's own exercise and match on that.
export async function experimentNudgeAuto(admin: any, sessionId: string): Promise<string> {
  if (!sessionId || !admin) return "";
  const exercise = await resolveExercise(admin, sessionId);
  if (!exercise) return "";
  return experimentNudge(admin, sessionId, exercise);
}

// When an assigned run finishes in a SCORED engine (roleplay, negotiation, …),
// record its outcome once per experiment it was assigned to, keyed by the run's
// stable identity (its code). The stats core reads experiment_outcomes for the
// score + completion metrics — no dependence on the sessions/workspaces schema.
export async function recordExperimentOutcome(admin: any, runKey: string, outcome: { score?: number | null; completed?: boolean }): Promise<void> {
  if (!runKey || !admin) return;
  try {
    const { data: assigns } = await admin.from("experiment_assignments").select("experiment_id, variant_key").eq("session_id", runKey);
    if (!assigns?.length) return;
    const score = typeof outcome.score === "number" && Number.isFinite(outcome.score) ? Math.round(outcome.score) : null;
    const completed = outcome.completed !== false;
    await admin.from("experiment_outcomes").upsert(
      (assigns as any[]).map((a) => ({ experiment_id: a.experiment_id, run_key: runKey, variant_key: a.variant_key, score, completed })),
      { onConflict: "experiment_id,run_key" },
    );
  } catch { /* table missing / transient — never block the learner */ }
}

// Rows for `analyze` from per-run outcomes: the score metric wins at SCORE_WIN+,
// with completion available as a secondary read. Keeps the binomial machinery.
export function scoreRows(outcomes: { variant_key: string; score: number | null }[]): { variant_key: string; success: boolean }[] {
  return outcomes.map((o) => ({ variant_key: o.variant_key, success: o.score != null && o.score >= SCORE_WIN }));
}
export function completionRows(outcomes: { variant_key: string; completed: boolean }[]): { variant_key: string; success: boolean }[] {
  return outcomes.map((o) => ({ variant_key: o.variant_key, success: !!o.completed }));
}
