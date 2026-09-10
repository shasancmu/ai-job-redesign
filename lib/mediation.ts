// Mechanism = mediation. Does the policy lift value BECAUSE it changes the
// conversation (more depth), or directly? For a flow, decompose the effect of the
// treatment T (policy vs frozen holdout) on outcome Y through the mediator M
// (conversation depth):
//   total   c  = effect of T on Y            (Y ~ T)
//   a          = effect of T on M            (M ~ T)
//   b, c'      = effect of M and direct T on Y (Y ~ T + M)   [b = mediator, c' = direct]
//   indirect (ACME) = a*b  (= c - c' in the linear model)
//   % mediated = a*b / c
// Percentile bootstrap CI on the indirect effect. Server-only.
//
// CAVEAT surfaced in the UI: T is randomized (holdout), but M is NOT — so the
// mediator paths rest on sequential ignorability (no unmeasured M->Y confounder).
// The clean confirmation is a separate experiment that manipulates depth directly.

import { createAdminClient } from "@/lib/supabase/admin";

export type MediationResult = {
  n: number;
  outcomeLabel: string;
  total: number | null;
  aPath: number | null;      // T -> M
  bPath: number | null;      // M -> Y | T
  direct: number | null;     // c'
  indirect: number | null;   // a*b
  propMediated: number | null;
  indirectLo: number | null;
  indirectHi: number | null;
};

type Row = { t: number; m: number; y: number };

function meanDiff(rows: Row[], key: "m" | "y"): number | null {
  const a = rows.filter((r) => r.t === 1).map((r) => r[key]);
  const b = rows.filter((r) => r.t === 0).map((r) => r[key]);
  if (!a.length || !b.length) return null;
  return a.reduce((x, y) => x + y, 0) / a.length - b.reduce((x, y) => x + y, 0) / b.length;
}

// OLS Y ~ 1 + T + M via the 3x3 normal equations. Returns [b0, bT (direct), bM].
function ols2(rows: Row[]): [number, number, number] | null {
  const n = rows.length;
  let ST = 0, SM = 0, STT = 0, SMM = 0, STM = 0, SY = 0, STY = 0, SMY = 0;
  for (const r of rows) {
    ST += r.t; SM += r.m; STT += r.t * r.t; SMM += r.m * r.m; STM += r.t * r.m;
    SY += r.y; STY += r.t * r.y; SMY += r.m * r.y;
  }
  const A = [[n, ST, SM], [ST, STT, STM], [SM, STM, SMM]];
  const B = [SY, STY, SMY];
  const det =
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  if (!isFinite(det) || Math.abs(det) < 1e-9) return null;
  const inv = (r: number, c: number) => {
    const m3 = A.filter((_, i) => i !== r).map((row) => row.filter((_, j) => j !== c));
    const minor = m3[0][0] * m3[1][1] - m3[0][1] * m3[1][0];
    return ((r + c) % 2 ? -minor : minor) / det; // cofactor^T / det (adjugate)
  };
  // beta = A^{-1} B, with A^{-1}[i][j] = cofactor(j,i)/det
  const beta = [0, 1, 2].map((i) => inv(0, i) * B[0] + inv(1, i) * B[1] + inv(2, i) * B[2]);
  return [beta[0], beta[1], beta[2]];
}

function decompose(rows: Row[]): { total: number | null; a: number | null; b: number | null; direct: number | null; indirect: number | null } {
  const total = meanDiff(rows, "y");
  const a = meanDiff(rows, "m");
  const fit = ols2(rows);
  if (!fit || a == null) return { total, a, b: null, direct: null, indirect: null };
  const direct = fit[1], b = fit[2];
  return { total, a, b, direct, indirect: a * b };
}

function bootstrapIndirect(rows: Row[], reps = 400): { lo: number | null; hi: number | null } {
  if (rows.length < 20) return { lo: null, hi: null };
  const vals: number[] = [];
  for (let r = 0; r < reps; r++) {
    const sample: Row[] = [];
    for (let i = 0; i < rows.length; i++) sample.push(rows[Math.floor(Math.random() * rows.length)]);
    const d = decompose(sample);
    if (d.indirect != null && isFinite(d.indirect)) vals.push(d.indirect);
  }
  if (vals.length < 20) return { lo: null, hi: null };
  vals.sort((x, y) => x - y);
  const at = (p: number) => vals[Math.min(vals.length - 1, Math.max(0, Math.floor(p * vals.length)))];
  return { lo: round(at(0.025)), hi: round(at(0.975)) };
}

function round(x: number | null): number | null { return x == null || !isFinite(x) ? null : Math.round(x * 1000) / 1000; }

export async function mediationFor(flow: string, outcome: "outcome" | "real_outcome" = "outcome"): Promise<MediationResult> {
  const empty: MediationResult = { n: 0, outcomeLabel: outcome === "real_outcome" ? "real outcome" : "outcome", total: null, aPath: null, bPath: null, direct: null, indirect: null, propMediated: null, indirectLo: null, indirectHi: null };
  if (!flow) return empty;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("conversations")
      .select("holdout, dynamics, outcome, real_outcome")
      .eq("module", flow).not("ended_at", "is", null).limit(20000);
    const rows: Row[] = [];
    for (const r of (data || []) as any[]) {
      if (r.holdout !== true && r.holdout !== false) continue;
      const m = r.dynamics?.depth;
      const y = outcome === "real_outcome" ? r.real_outcome : r.outcome;
      if (typeof m !== "number" || typeof y !== "number") continue;
      rows.push({ t: r.holdout ? 0 : 1, m, y });
    }
    if (rows.length < 10) return { ...empty, n: rows.length };
    const d = decompose(rows);
    const boot = bootstrapIndirect(rows);
    return {
      n: rows.length,
      outcomeLabel: empty.outcomeLabel,
      total: round(d.total), aPath: round(d.a), bPath: round(d.b), direct: round(d.direct),
      indirect: round(d.indirect),
      propMediated: d.indirect != null && d.total ? round(d.indirect / d.total) : null,
      indirectLo: boot.lo, indirectHi: boot.hi,
    };
  } catch { return empty; }
}
