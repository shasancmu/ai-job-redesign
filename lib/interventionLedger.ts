// The intervention ledger — "which interventions actually worked", de-biased.
// Reads the experiments table (each carries its treatment nudge + the code-computed
// analysis: lift, per-arm n, p-value) and applies the two corrections a family of
// adaptively-selected experiments needs:
//   - Benjamini-Hochberg FDR q-values across the whole family (many tests were run).
//   - Empirical-Bayes shrinkage of the effect sizes toward the family mean (adopted
//     winners are selected on significance, so their raw lifts are upward-biased).
// Server-only.

import { createAdminClient } from "@/lib/supabase/admin";
import { flowLabel } from "@/lib/experiments";

export type LedgerRow = {
  id: string; flow: string; flowLabel: string; name: string; nudge: string;
  metric: string; target: string; status: string; date: string | null;
  lift: number | null; se: number | null; pValue: number | null; q: number | null;
  shrunk: number | null; nMin: number;
};

function armSE(arms: any[]): { lift: number | null; se: number | null; nMin: number } {
  if (!Array.isArray(arms) || arms.length < 2) return { lift: null, se: null, nMin: 0 };
  const control = arms.find((a) => a.key === "control") || arms[0];
  const treat = arms.find((a) => a !== control) || arms[1];
  const nc = control.n || 0, nt = treat.n || 0;
  const pc = control.rate || 0, pt = treat.rate || 0;
  const nMin = Math.min(nc, nt);
  if (nc === 0 || nt === 0) return { lift: pt - pc, se: null, nMin };
  const se = Math.sqrt((pc * (1 - pc)) / nc + (pt * (1 - pt)) / nt);
  return { lift: pt - pc, se, nMin };
}

// Benjamini-Hochberg: map raw p-values to monotone FDR q-values.
function bhQ(rows: { pValue: number | null }[]): (number | null)[] {
  const idx = rows.map((r, i) => ({ i, p: r.pValue })).filter((x) => x.p != null) as { i: number; p: number }[];
  const m = idx.length;
  const out: (number | null)[] = rows.map(() => null);
  if (!m) return out;
  idx.sort((a, b) => a.p - b.p);
  let prev = 1;
  for (let k = m - 1; k >= 0; k--) {
    const q = Math.min(prev, (idx[k].p * m) / (k + 1));
    prev = q;
    out[idx[k].i] = Math.round(q * 1000) / 1000;
  }
  return out;
}

// Empirical-Bayes (method-of-moments): shrink each lift toward the family mean by
// its reliability tau^2/(tau^2 + se^2). tau^2 is the between-experiment variance.
function ebShrink(rows: { lift: number | null; se: number | null }[]): (number | null)[] {
  const est = rows.filter((r) => r.lift != null && r.se != null) as { lift: number; se: number }[];
  if (est.length < 2) return rows.map((r) => (r.lift != null ? Math.round(r.lift * 1000) / 1000 : null));
  const grand = est.reduce((a, r) => a + r.lift, 0) / est.length;
  const varLift = est.reduce((a, r) => a + (r.lift - grand) ** 2, 0) / (est.length - 1);
  const meanSe2 = est.reduce((a, r) => a + r.se ** 2, 0) / est.length;
  const tau2 = Math.max(0, varLift - meanSe2);
  return rows.map((r) => {
    if (r.lift == null || r.se == null) return r.lift != null ? Math.round(r.lift * 1000) / 1000 : null;
    const shrink = tau2 / (tau2 + r.se ** 2);
    return Math.round((grand + shrink * (r.lift - grand)) * 1000) / 1000;
  });
}

export async function listLedger(flow?: string): Promise<{ rows: LedgerRow[]; family: number }> {
  try {
    const admin = createAdminClient();
    let q = admin.from("experiments").select("id, flow, name, metric, target, status, variants, result, concluded_at, launched_at, created_at").eq("mode", "human");
    if (flow) q = q.eq("flow", flow);
    const { data } = await q;
    const exps = (data || []) as any[];

    const base = exps.map((e) => {
      const a = e.result?.analysis;
      const { lift, se, nMin } = armSE(a?.arms || []);
      const treat = (e.variants || []).find((v: any) => v.key === "treatment");
      return {
        id: e.id, flow: e.flow, flowLabel: flowLabel(e.flow), name: e.name || "(untitled)",
        nudge: treat?.nudge || "", metric: e.metric, target: e.target, status: e.status,
        date: e.concluded_at || e.launched_at || e.created_at || null,
        lift, se, pValue: a?.pValue ?? null, nMin,
      };
    }).filter((r) => r.lift != null); // only experiments that collected data

    const qs = bhQ(base);
    const shrunk = ebShrink(base);
    const rows: LedgerRow[] = base.map((r, i) => ({
      ...r,
      lift: r.lift != null ? Math.round(r.lift * 1000) / 1000 : null,
      se: r.se != null ? Math.round(r.se * 1000) / 1000 : null,
      q: qs[i],
      shrunk: shrunk[i],
    }));
    // Winners first (adopted), then by shrunk effect.
    rows.sort((x, y) => {
      const rank = (s: string) => (s === "adopted" ? 0 : s === "running" ? 1 : 2);
      if (rank(x.status) !== rank(y.status)) return rank(x.status) - rank(y.status);
      return (y.shrunk ?? -1) - (x.shrunk ?? -1);
    });
    return { rows, family: base.filter((r) => r.pValue != null).length };
  } catch { return { rows: [], family: 0 }; }
}
