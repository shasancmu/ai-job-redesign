// Server-only statistics for a live experiment: join assignments/outcomes to the
// metric and, always, attach the conversation-dynamics signal per arm (depth,
// movement) read from the conversation spine. Kept out of lib/experiments.ts so
// that file stays client-safe (no admin client). Shared by the experiments
// control plane and the autopilot.

import { analyze, successForSession, scoreRows, completionRows, type Experiment } from "@/lib/experiments";

export type ArmDynamics = { variant_key: string; n: number; avgDepth: number | null; avgMovement: number | null; avgOutcome: number | null };

// Average the leading conversation signals per intervention (= variant_key) for
// this experiment's module. This is the "is the conversation moving forward?"
// read the outcome metric can't give until a run finishes.
export async function armDynamics(admin: any, flow: string): Promise<ArmDynamics[]> {
  try {
    const { data } = await admin.from("conversations").select("intervention, outcome, dynamics").eq("module", flow).limit(5000);
    const rows = (data || []) as any[];
    const groups = new Map<string, any[]>();
    for (const r of rows) {
      if (!r.intervention) continue;
      if (!groups.has(r.intervention)) groups.set(r.intervention, []);
      groups.get(r.intervention)!.push(r);
    }
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10);
    const r2 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);
    return [...groups.entries()].map(([variant_key, g]) => ({
      variant_key,
      n: g.length,
      avgDepth: r1(mean(g.map((x) => x.dynamics?.depth).filter((x: any) => typeof x === "number"))),
      avgMovement: r2(mean(g.map((x) => x.dynamics?.movement).filter((x: any) => typeof x === "number"))),
      avgOutcome: r1(mean(g.map((x) => x.outcome).filter((x: any) => typeof x === "number"))),
    }));
  } catch { return []; }
}

// Join assignments/outcomes to each session's current state, score the metric per
// arm, and attach the dynamics signal. This is the single source of truth for an
// experiment's analysis (the board and the autopilot both call it).
export async function computeAnalysis(admin: any, exp: Experiment): Promise<any> {
  const dynamics = await armDynamics(admin, exp.flow);

  // Scored engines record per-run outcomes in experiment_outcomes.
  if (exp.metric === "score") {
    const { data: outs } = await admin.from("experiment_outcomes").select("variant_key, score, completed").eq("experiment_id", exp.id);
    const rows = (outs || []) as { variant_key: string; score: number | null; completed: boolean }[];
    const primary = analyze(exp, exp.variants || [], scoreRows(rows));
    const completion = analyze({ ...exp, metric: "completion" } as any, exp.variants || [], completionRows(rows));
    return { ...primary, secondary: { metric: "completion", arms: completion.arms }, dynamics };
  }

  const { data: assigns } = await admin.from("experiment_assignments").select("session_id, variant_key").eq("experiment_id", exp.id);
  const rowsRaw = assigns || [];
  const sids = [...new Set(rowsRaw.map((a: any) => a.session_id))];
  if (sids.length === 0) return { ...analyze(exp, exp.variants || [], []), dynamics };

  const { data: sessions } = await admin.from("sessions").select("id, status, public_token, host_id").in("id", sids);
  const { data: wss } = await admin.from("workspaces").select("session_id, canvas, author_id").in("session_id", sids);
  const sById = new Map((sessions || []).map((s: any) => [s.id, s]));
  const canvasBySession = new Map<string, any>();
  for (const w of wss || []) {
    const s: any = sById.get(w.session_id);
    if (s && w.author_id === s.host_id) canvasBySession.set(w.session_id, w.canvas);
    else if (!canvasBySession.has(w.session_id)) canvasBySession.set(w.session_id, w.canvas);
  }
  const rows = rowsRaw
    .filter((a: any) => sById.has(a.session_id))
    .map((a: any) => ({
      variant_key: a.variant_key,
      success: successForSession(exp.metric, exp.depth_threshold, sById.get(a.session_id), canvasBySession.get(a.session_id) || {}),
    }));
  return { ...analyze(exp, exp.variants || [], rows), dynamics };
}
