// Design-based impact of the adaptive learning loop, measured against the frozen
// holdout. Because the holdout is randomized at the run level (independent of the
// adaptive policy), the per-period difference in means is an UNBIASED estimate of
// the current policy's effect on conversation quality — no functional form, and
// robust to the adaptivity that would bias a naive time-trend regression.
//
//   delta_t = mean_policy(t) - mean_holdout(t)
//   se_t    = sqrt( var_policy/n_policy + var_holdout/n_holdout )   [Welch]
//
// delta_t over t is the graph: quality improvement vs the counterfactual, over time.
// Server-only (reads the spine via the admin client).

import { createAdminClient } from "@/lib/supabase/admin";

export type Point = { period: string; nPolicy: number; nHoldout: number; delta: number | null; se: number | null; lo: number | null; hi: number | null };
export type Series = { metric: "depth" | "real"; label: string; points: Point[]; pooled: { delta: number | null; se: number | null; lo: number | null; hi: number | null; n: number } };
export type Impact = { total: number; withHoldout: number; holdoutRuns: number; policyRuns: number; series: Series[] };

function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
}

// Monday-anchored week label (YYYY-MM-DD of the week start) for the x-axis.
function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function contrast(policy: number[], holdout: number[]): Pick<Point, "delta" | "se" | "lo" | "hi"> {
  if (!policy.length || !holdout.length) return { delta: null, se: null, lo: null, hi: null };
  const delta = mean(policy) - mean(holdout);
  const se = Math.sqrt(variance(policy) / policy.length + variance(holdout) / holdout.length);
  return { delta: round(delta), se: round(se), lo: round(delta - 1.96 * se), hi: round(delta + 1.96 * se) };
}
function round(x: number): number { return Math.round(x * 100) / 100; }

function buildSeries(metric: "depth" | "real", label: string, rows: any[], valueOf: (r: any) => number | null): Series {
  const byWeek = new Map<string, { p: number[]; h: number[] }>();
  const allP: number[] = [], allH: number[] = [];
  for (const r of rows) {
    const v = valueOf(r);
    if (v == null || !Number.isFinite(v)) continue;
    if (r.holdout !== true && r.holdout !== false) continue; // needs a known arm
    const wk = weekStart(r.ended_at || r.updated_at);
    if (!byWeek.has(wk)) byWeek.set(wk, { p: [], h: [] });
    const b = byWeek.get(wk)!;
    (r.holdout ? b.h : b.p).push(v);
    (r.holdout ? allH : allP).push(v);
  }
  const points: Point[] = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([period, b]) => ({
    period, nPolicy: b.p.length, nHoldout: b.h.length, ...contrast(b.p, b.h),
  }));
  const pooled = { ...contrast(allP, allH), n: allP.length + allH.length };
  return { metric, label, points, pooled };
}

export async function computeImpact(module?: string): Promise<Impact> {
  const empty: Impact = { total: 0, withHoldout: 0, holdoutRuns: 0, policyRuns: 0, series: [] };
  try {
    const admin = createAdminClient();
    let q = admin.from("conversations")
      .select("module, holdout, dynamics, outcome, real_outcome, ended_at, updated_at")
      .not("ended_at", "is", null)
      .limit(20000);
    if (module) q = q.eq("module", module);
    const { data } = await q;
    const rows = (data || []) as any[];
    const withHoldout = rows.filter((r) => r.holdout === true || r.holdout === false);
    return {
      total: rows.length,
      withHoldout: withHoldout.length,
      holdoutRuns: rows.filter((r) => r.holdout === true).length,
      policyRuns: rows.filter((r) => r.holdout === false).length,
      series: [
        buildSeries("depth", "Conversation depth (leading proxy)", rows, (r) => (typeof r.dynamics?.depth === "number" ? r.dynamics.depth : null)),
        buildSeries("real", "Real outcome (objective, where available)", rows, (r) => (typeof r.real_outcome === "number" ? r.real_outcome : null)),
      ],
    };
  } catch { return empty; }
}
