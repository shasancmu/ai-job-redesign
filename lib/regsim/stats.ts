// A small, dependency-free stats engine: descriptive stats, correlation, OLS
// with standard errors / t / p, and the pieces needed for binscatter. Accuracy
// is aimed at teaching, not publication, but the OLS + p-values match R closely.

export function mean(x: number[]): number {
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN;
}

export function variance(x: number[]): number {
  const n = x.length;
  if (n < 2) return NaN;
  const m = mean(x);
  return x.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1);
}

export function sd(x: number[]): number {
  return Math.sqrt(variance(x));
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function describe(x: number[]) {
  const s = [...x].sort((a, b) => a - b);
  return {
    n: x.length,
    mean: mean(x),
    sd: sd(x),
    min: s[0],
    q25: quantile(s, 0.25),
    median: quantile(s, 0.5),
    q75: quantile(s, 0.75),
    max: s[s.length - 1],
  };
}

export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return NaN;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const d = Math.sqrt(sxx * syy);
  return d === 0 ? NaN : sxy / d;
}

// --- linear algebra (small matrices) ---

// Invert a square matrix via Gauss–Jordan with partial pivoting. Returns null if
// singular (e.g. perfect multicollinearity).
export function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-12) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row.slice(n));
}

export type OlsResult = {
  names: string[]; // term names incl. "(Intercept)"
  coef: number[];
  se: number[];
  t: number[];
  p: number[];
  n: number;
  k: number; // number of coefficients incl. intercept
  df: number; // residual degrees of freedom
  r2: number;
  adjR2: number;
  sigma: number; // residual standard error
  fstat: number;
  fp: number;
  singular?: boolean;
};

// OLS of y on the design matrix X (each row an observation; first column should
// be the intercept of 1s). `names` labels the columns.
export function ols(X: number[][], y: number[], names: string[]): OlsResult {
  const n = X.length;
  const k = X[0]?.length || 0;
  const df = n - k;
  // X'X and X'y
  const xtx: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    for (let a = 0; a < k; a++) {
      xty[a] += xi[a] * y[i];
      for (let b = a; b < k; b++) xtx[a][b] += xi[a] * xi[b];
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) xtx[a][b] = xtx[b][a];

  const inv = invert(xtx);
  const my = mean(y);
  if (!inv || df <= 0) {
    return { names, coef: new Array(k).fill(NaN), se: new Array(k).fill(NaN), t: new Array(k).fill(NaN), p: new Array(k).fill(NaN), n, k, df, r2: NaN, adjR2: NaN, sigma: NaN, fstat: NaN, fp: NaN, singular: true };
  }
  const coef = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));
  // residuals + RSS/TSS
  let rss = 0;
  let tss = 0;
  for (let i = 0; i < n; i++) {
    let yhat = 0;
    for (let a = 0; a < k; a++) yhat += X[i][a] * coef[a];
    const e = y[i] - yhat;
    rss += e * e;
    tss += (y[i] - my) * (y[i] - my);
  }
  const sigma2 = rss / df;
  const sigma = Math.sqrt(sigma2);
  const se = inv.map((row, a) => Math.sqrt(sigma2 * row[a]));
  const t = coef.map((c, a) => c / se[a]);
  const p = t.map((tv) => tTwoSided(tv, df));
  const r2 = tss === 0 ? NaN : 1 - rss / tss;
  const adjR2 = 1 - (1 - r2) * (n - 1) / df;
  const modelDf = k - 1;
  const fstat = modelDf > 0 ? (tss - rss) / modelDf / sigma2 : NaN;
  const fp = modelDf > 0 ? fPValue(fstat, modelDf, df) : NaN;
  return { names, coef, se, t, p, n, k, df, r2, adjR2, sigma, fstat, fp };
}

// --- distributions (for p-values) ---

// Regularized incomplete beta via Lentz's continued fraction (Numerical Recipes).
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function gammaln(x: number): number {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// I_x(a,b)
function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Two-sided p-value for a t statistic with df degrees of freedom.
export function tTwoSided(t: number, df: number): number {
  if (!isFinite(t) || df <= 0) return NaN;
  const x = df / (df + t * t);
  return ibeta(x, df / 2, 0.5);
}

// Upper-tail p-value for an F statistic.
export function fPValue(f: number, d1: number, d2: number): number {
  if (!isFinite(f) || f <= 0) return NaN;
  const x = d2 / (d2 + d1 * f);
  return ibeta(x, d2 / 2, d1 / 2);
}
