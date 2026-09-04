// Deterministically simulate a dataset from a DGP spec. Base predictors are
// drawn with the requested pairwise correlations (Cholesky on the correlation
// matrix), mapped to their marginals, then the outcome is built from the true
// structural terms plus Gaussian noise. Same seed => same data, so grading can
// trust the answer key without re-sending it.

import type { Dgp, Challenge, DgpVar } from "./types";
import { Rng } from "./rng";

function normalCdf(z: number): number {
  // Abramowitz & Stegun 7.1.26 for erf.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  p = z > 0 ? 1 - p : p;
  return p;
}

function qnorm(p: number): number {
  // Acklam's inverse normal CDF.
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  let r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

// Cholesky; nudges the matrix toward PD if the requested correlations aren't.
function cholesky(R: number[][]): number[][] {
  const n = R.length;
  for (let shrink = 0; shrink < 12; shrink++) {
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      for (let j = 0; j <= i; j++) {
        let s = R[i][j];
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        if (i === j) {
          if (s <= 1e-10) { ok = false; break; }
          L[i][j] = Math.sqrt(s);
        } else {
          L[i][j] = s / L[j][j];
        }
      }
    }
    if (ok) return L;
    // shrink off-diagonals toward 0 and retry
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) R[i][j] *= 0.85;
  }
  // fall back to identity (independent predictors)
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

function marginal(v: DgpVar, z: number): number {
  const d = v.dist;
  if (d.kind === "normal") return d.mean + d.sd * z;
  if (d.kind === "lognormal") return Math.exp(d.mean + d.sd * z);
  if (d.kind === "uniform") return d.min + (d.max - d.min) * normalCdf(z);
  return z > qnorm(1 - d.p) ? 1 : 0; // binary
}

export function simulate(dgp: Dgp): { columns: Record<string, number[]> } {
  const rng = new Rng(dgp.seed);
  const vars = dgp.vars;
  const k = vars.length;
  const idx = new Map(vars.map((v, i) => [v.name, i]));

  // correlation matrix
  const R: number[][] = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
  for (const c of dgp.correlations) {
    const i = idx.get(c.a);
    const j = idx.get(c.b);
    if (i == null || j == null || i === j) continue;
    const rho = Math.max(-0.95, Math.min(0.95, c.rho));
    R[i][j] = rho;
    R[j][i] = rho;
  }
  const L = cholesky(R.map((r) => [...r]));

  const columns: Record<string, number[]> = {};
  for (const v of vars) columns[v.name] = new Array(dgp.n);

  for (let obs = 0; obs < dgp.n; obs++) {
    const z = Array.from({ length: k }, () => rng.normal());
    // correlated standard normals c = L z
    for (let i = 0; i < k; i++) {
      let ci = 0;
      for (let j = 0; j <= i; j++) ci += L[i][j] * z[j];
      columns[vars[i].name][obs] = marginal(vars[i], ci);
    }
  }

  // Guarantee positivity for any variable used inside log()/sqrt() so both the
  // outcome and the student's own transforms are well-defined.
  const needPositive = new Set<string>();
  for (const t of dgp.terms) if (t.kind === "transform" && (t.fn === "log" || t.fn === "sqrt")) needPositive.add(t.var);
  for (const name of needPositive) {
    const col = columns[name];
    const min = Math.min(...col);
    if (min <= 0) {
      const shift = 1 - min;
      for (let i = 0; i < col.length; i++) col[i] += shift;
    }
  }

  // outcome
  const y = new Array(dgp.n);
  for (let i = 0; i < dgp.n; i++) {
    let val = dgp.intercept;
    for (const t of dgp.terms) {
      if (t.kind === "linear") val += t.beta * columns[t.var][i];
      else if (t.kind === "interaction") val += t.beta * columns[t.vars[0]][i] * columns[t.vars[1]][i];
      else if (t.fn === "log") val += t.beta * Math.log(columns[t.var][i]);
      else if (t.fn === "sqrt") val += t.beta * Math.sqrt(columns[t.var][i]);
      else val += t.beta * columns[t.var][i] * columns[t.var][i];
    }
    val += dgp.noiseSd * rng.normal();
    y[i] = val;
  }
  columns[dgp.outcome.name] = y;

  return { columns };
}

// Round for transport/display so the client sees tidy numbers (and can't recover
// the exact noise draws). 4 significant-ish digits.
function tidy(x: number): number {
  if (!isFinite(x)) return x;
  return Math.round(x * 1e4) / 1e4;
}

// Build the client-safe Challenge (data + neutral meta; roles/terms omitted).
export function toChallenge(dgp: Dgp, columns: Record<string, number[]>): Challenge {
  const rounded: Record<string, number[]> = {};
  for (const k of Object.keys(columns)) rounded[k] = columns[k].map(tidy);
  return {
    context: dgp.context,
    scenario: dgp.scenario,
    difficulty: dgp.difficulty,
    n: dgp.n,
    outcome: dgp.outcome,
    variables: dgp.vars.map((v) => ({ name: v.name, label: v.label })),
    columns: rounded,
  };
}
