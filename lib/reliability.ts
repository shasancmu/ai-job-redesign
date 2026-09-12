// Inter-rater reliability statistics — pure, deterministic, no I/O. The same
// discipline as lib/experiments: all the math lives here so it can be read and
// trusted, and nothing else invents a number.
//
// Primary statistic is ICC(2,1) (Shrout & Fleiss): two-way random effects, single
// rating, absolute agreement — the right choice when raters (the AI grader and the
// human experts) are a sample and we care that they agree in level, not just rank.

export type Reliability = {
  n: number;                 // number of targets (runs) with a complete pair/row
  icc: number | null;        // ICC(2,1)
  iccLo: number | null;      // 95% bootstrap CI
  iccHi: number | null;
  pearson: number | null;    // linear correlation (rank-agnostic sanity check)
  bias: number | null;       // mean(a − b): does the AI run high or low vs humans?
  loaLo: number | null;      // Bland–Altman 95% limits of agreement
  loaHi: number | null;
  verdict: string;           // Koo & Li (2016) band
};

function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

// ICC(2,1) from a targets×raters matrix (every row fully rated by k raters).
export function icc21(rows: number[][]): number | null {
  const n = rows.length;
  const k = n ? rows[0].length : 0;
  if (n < 2 || k < 2 || rows.some((r) => r.length !== k)) return null;
  const all = rows.flat();
  const gm = mean(all);
  const rowMeans = rows.map(mean);
  const colMeans = Array.from({ length: k }, (_, j) => mean(rows.map((r) => r[j])));

  let sst = 0; for (const v of all) sst += (v - gm) ** 2;
  const ssr = k * rowMeans.reduce((a, m) => a + (m - gm) ** 2, 0);   // between targets
  const ssc = n * colMeans.reduce((a, m) => a + (m - gm) ** 2, 0);   // between raters
  const sse = sst - ssr - ssc;

  const msr = ssr / (n - 1);
  const msc = ssc / (k - 1);
  const mse = sse / ((n - 1) * (k - 1));
  const denom = msr + (k - 1) * mse + (k / n) * (msc - mse);
  if (denom === 0) return null;
  return (msr - mse) / denom;
}

export function pearson(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 2 || b.length !== n) return null;
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

function verdictFor(icc: number | null): string {
  if (icc == null) return "not enough data";
  if (icc < 0.5) return "poor";
  if (icc < 0.75) return "moderate";
  if (icc < 0.9) return "good";
  return "excellent";
}

const round = (x: number | null, d = 3): number | null => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

// A deterministic-ish bootstrap CI for ICC(2,1): resample targets with replacement.
// Seeded (mulberry32) so a report doesn't jitter between reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrapIccCI(rows: number[][], iters = 1000): { lo: number | null; hi: number | null } {
  const n = rows.length;
  if (n < 4) return { lo: null, hi: null };
  const rnd = mulberry32(0x5eed ^ n);
  const est: number[] = [];
  for (let b = 0; b < iters; b++) {
    const sample: number[][] = [];
    for (let i = 0; i < n; i++) sample.push(rows[Math.floor(rnd() * n)]);
    const v = icc21(sample);
    if (v != null && Number.isFinite(v)) est.push(v);
  }
  if (est.length < 20) return { lo: null, hi: null };
  est.sort((a, b) => a - b);
  const at = (p: number) => est[Math.min(est.length - 1, Math.max(0, Math.floor(p * est.length)))];
  return { lo: round(at(0.025)), hi: round(at(0.975)) };
}

// AI-vs-human agreement from paired scores (mean human per run vs the AI score).
export function agreement(ai: number[], human: number[]): Reliability {
  const n = Math.min(ai.length, human.length);
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) rows.push([ai[i], human[i]]);
  const icc = icc21(rows);
  const { lo, hi } = bootstrapIccCI(rows);
  const diffs = rows.map((r) => r[0] - r[1]);
  const bias = mean(diffs);
  const sd = n > 1 ? Math.sqrt(diffs.reduce((a, d) => a + (d - bias) ** 2, 0) / (n - 1)) : 0;
  return {
    n,
    icc: round(icc), iccLo: lo, iccHi: hi,
    pearson: round(pearson(ai.slice(0, n), human.slice(0, n))),
    bias: round(bias, 2),
    loaLo: round(bias - 1.96 * sd, 2), loaHi: round(bias + 1.96 * sd, 2),
    verdict: verdictFor(icc),
  };
}

// Human-among-human reliability (the ceiling): ICC(2,1) over runs rated by ≥2
// humans, using the first two ratings per run for a balanced matrix.
export function humanCeiling(pairs: number[][]): { n: number; icc: number | null; verdict: string } {
  const rows = pairs.filter((p) => p.length >= 2).map((p) => [p[0], p[1]]);
  const icc = icc21(rows);
  return { n: rows.length, icc: round(icc), verdict: verdictFor(icc) };
}
