// ============================================================================
// Continuous experimentation engine. The rule that keeps this honest: ALL
// statistics live here, in deterministic code. The LLM proposes subtle variants
// and narrates results in English, but it NEVER decides significance, and a
// result is only "conclusive" once each arm has reached the pre-registered
// sample size (this is the guardrail against calling fake early winners).
// ============================================================================

export type Variant = { key: string; label: string; nudge: string };
export type Experiment = {
  id: string;
  flow: string;
  name: string;
  hypothesis: string;
  metric: "completion" | "depth" | "shared";
  depth_threshold: number;
  variants: Variant[];
  min_per_arm: number;
  status: "proposed" | "running" | "concluded" | "adopted" | "rejected";
  created_by: string;
  result: any;
  created_at: string;
  launched_at: string | null;
  concluded_at: string | null;
};

// Flows that can be experimented on (the AI conversation surfaces). A subtle
// "nudge" is appended to that flow's interview system prompt.
export const EXPERIMENT_FLOWS: { key: string; label: string }[] = [
  { key: "consult", label: "Diagnose Your Business" },
  { key: "resume", label: "Refresh Your Résumé" },
  { key: "empathy", label: "Understand Your Customer" },
  { key: "superpower", label: "Find Your Superpower" },
  { key: "board", label: "AI Board" },
];

export const METRICS: { key: "completion" | "depth" | "shared"; label: string; help: string }[] = [
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

// --- Runtime: assign a session to a variant and return the prompt nudge ------
// Uses whatever supabase client is passed (the admin client at call sites).
// Lazily records the assignment the first time a session hits the flow.
export async function experimentNudge(admin: any, sessionId: string, flow: string): Promise<string> {
  if (!sessionId || !admin) return "";
  try {
    const { data: exps } = await admin
      .from("experiments")
      .select("id, variants")
      .in("flow", [flow, "all"])
      .eq("status", "running")
      .order("launched_at", { ascending: true })
      .limit(1);
    const exp = exps?.[0];
    if (!exp) return "";

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
      if (!v) return "";
      key = v.key;
      await admin.from("experiment_assignments").upsert(
        { experiment_id: exp.id, session_id: sessionId, variant_key: key },
        { onConflict: "experiment_id,session_id" }
      );
    }
    const v = (exp.variants || []).find((x: Variant) => x.key === key);
    return (v?.nudge || "").slice(0, 600);
  } catch {
    return "";
  }
}
