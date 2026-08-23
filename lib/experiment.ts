// ============================================================================
// The Strategy Experiment — from the Strategy Experiment Canvas
// (Sharique Hasan, Hyunjin Kim & Rembrand Koning).
//
// Two halves:
//  1) The 8-part canvas: setup, setting & subjects, friction, insight, solution,
//     mechanism (why/when), the null, and impact on the business.
//  2) The model + an in-silico run. A strategy experiment is the regression
//        Y = b0 + b1·T + b2·X + b3·(T·X) + e
//     T = treatment, X = a pre-treatment moderator, b1 = the average treatment
//     effect, b3 = the heterogeneous effect (works more/less for whom). We take
//     a data-generating process (the AI proposes it from the canvas), actually
//     simulate the RCT, fit OLS, and read off coefficients, standard errors,
//     p-values and power. Nothing here is invented prose — the numbers come from
//     a real random process, so power and significance are honest.
// ============================================================================

export type ExpStep = { key: string; title: string; minutes: number };
export const EXPERIMENT_STEPS: ExpStep[] = [
  { key: "canvas", title: "Design the experiment", minutes: 12 },
  { key: "simulate", title: "Run it in silico", minutes: 8 },
];

// The eight canvas parts, in order, with the prompt from the slides.
export type CanvasPart = { key: keyof ExperimentCanvas; label: string; prompt: string; placeholder: string };
export const CANVAS_PARTS: CanvasPart[] = [
  { key: "setup", label: "Setup", prompt: "What is the phenomenon, and why is it interesting and important?", placeholder: "e.g. Most early-stage founders pursue weak ideas; idea quality drives startup survival." },
  { key: "subjects", label: "Setting & subjects", prompt: "Who or what are your subjects, where do they operate, and how many?", placeholder: "e.g. 300 early-stage founders at an accelerator bootcamp in India." },
  { key: "friction", label: "Business challenge / friction", prompt: "What problem do they face in improving performance?", placeholder: "e.g. Founders can't tell a strong idea from a weak one." },
  { key: "insight", label: "Your insight", prompt: "What is your unique insight about how the problem can be addressed?", placeholder: "e.g. Teaching an explicit model of idea quality helps them select better ideas." },
  { key: "solution", label: "Solution (the treatment)", prompt: "How will you design the treatment that solves the problem?", placeholder: "e.g. Train them on the attributes of a good idea, with feedback when they judge right or wrong." },
  { key: "mechanism", label: "Why & when will it work?", prompt: "Describe the mechanism, and when it will and won't work.", placeholder: "e.g. It works because people lack a mental model to judge ideas; it won't help those already good at judging." },
  { key: "nullComparison", label: "Your null", prompt: "What are you comparing the treatment to, and why is it a credible comparison?", placeholder: "e.g. A control group that spends the same time thinking about startups but gets no model." },
  { key: "impact", label: "Impact on the business", prompt: "If it works, what changes in the subjects' behavior and performance, and how will you measure it?", placeholder: "e.g. Higher idea quality, rated by consumers; larger effect for founders with weaker priors." },
];

export type ExperimentCanvas = {
  setup: string;
  subjects: string;
  friction: string;
  insight: string;
  solution: string;
  mechanism: string;
  nullComparison: string;
  impact: string;
};
export const DEFAULT_CANVAS: ExperimentCanvas = { setup: "", subjects: "", friction: "", insight: "", solution: "", mechanism: "", nullComparison: "", impact: "" };

export function canvasComplete(c: ExperimentCanvas): boolean {
  return CANVAS_PARTS.every((p) => (c[p.key] || "").trim().length > 2);
}
export function canvasFilledCount(c: ExperimentCanvas): number {
  return CANVAS_PARTS.filter((p) => (c[p.key] || "").trim().length > 2).length;
}

// The six intervention design patterns (slide 13 / 26).
export const INTERVENTION_PATTERNS = ["Training", "Information", "Incentives", "Spillovers", "Process", "Resource"] as const;
export type InterventionPattern = (typeof INTERVENTION_PATTERNS)[number];
export const PATTERN_EXEMPLARS: Record<InterventionPattern, string> = {
  Training: "Camuffo et al. (2020), a scientific approach to entrepreneurial decisions",
  Information: "Kim (2019), the value of competitor information",
  Incentives: "Gallus (2017), symbolic awards on Wikipedia",
  Spillovers: "Chatterji, Delecourt, Hasan & Koning (2019), when advice impacts startups",
  Process: "Bloom et al. (2013), does management matter? India",
  Resource: "De Mel, McKenzie & Woodruff (2012), cash or capital to microenterprises",
};

// The data-generating process the AI proposes from the canvas. Everything is in
// the units of the main outcome, expressed as a z-scaled effect so it reads as
// "standard deviations of lift" — honest and comparable across outcomes.
export type DGP = {
  outcomeName: string; // the main Y, e.g. "idea quality (consumer rating)"
  outcomeUnit: string; // short unit for the axis, e.g. "rating"
  baseline: number; // control-group mean of Y
  sd: number; // within-group sd of Y
  effect: number; // b1: average treatment effect, in Y units
  moderatorName: string; // the pre-treatment X, e.g. "weak prior mental model"
  moderatorShare: number; // fraction of subjects who are "high moderator" (0..1)
  hetEffect: number; // b3: extra treatment effect for the high-moderator group, in Y units
  n: number; // total sample (both arms)
  attrition: number; // fraction lost before measurement (0..1)
  secondary?: { name: string; effect: number; unit: string }; // a mechanism outcome
  longTerm?: { name: string; effect: number; unit: string }; // a downstream/long-run outcome
};

export const DEFAULT_DGP: DGP = {
  outcomeName: "the main outcome", outcomeUnit: "units", baseline: 50, sd: 15, effect: 6,
  moderatorName: "a pre-treatment trait", moderatorShare: 0.5, hetEffect: 4,
  n: 300, attrition: 0.1,
};

// ---- A small statistics kit -----------------------------------------------
// Seeded RNG so a run is reproducible; Gaussian via Box–Muller.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Invert a small square matrix via Gauss–Jordan (used for (X'X)^-1).
function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
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
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((r) => r.slice(n));
}

// Normal CDF → two-sided p-value from a t/z statistic (large-sample normal).
function twoSidedP(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  // Abramowitz-Stegun erf approximation.
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return Math.max(0, Math.min(1, 1 - y)); // = 2*(1-Phi(|z|))
}

export type Coef = { name: string; est: number; se: number; t: number; p: number };
export type SimResult = {
  coefs: Coef[]; // intercept, treatment (b1), moderator (b2), interaction (b3)
  n: number; // analyzed n after attrition
  r2: number;
  // group means for the summary graph (main Y), by arm and moderator level
  cells: { arm: "Control" | "Treatment"; mod: "Low" | "High"; mean: number; se: number; n: number }[];
  armMeans: { control: number; treatment: number; controlSe: number; treatmentSe: number };
  power: number; // estimated power for detecting b1 at α=.05
  secondary?: { name: string; est: number; se: number; p: number; unit: string };
  longTerm?: { name: string; est: number; se: number; p: number; unit: string };
};

// OLS for y ~ [1, T, X, T·X]; returns estimates + classical SEs.
function ols4(rows: { t: number; x: number; y: number }[]): { beta: number[]; se: number[]; r2: number } | null {
  const n = rows.length;
  const XtX = Array.from({ length: 4 }, () => Array(4).fill(0));
  const Xty = Array(4).fill(0);
  let sy = 0;
  for (const r of rows) {
    const v = [1, r.t, r.x, r.t * r.x];
    for (let i = 0; i < 4; i++) { Xty[i] += v[i] * r.y; for (let j = 0; j < 4; j++) XtX[i][j] += v[i] * v[j]; }
    sy += r.y;
  }
  const inv = invert(XtX);
  if (!inv) return null;
  const beta = inv.map((row) => row.reduce((s, val, j) => s + val * Xty[j], 0));
  let sse = 0;
  const ybar = sy / n;
  let sst = 0;
  for (const r of rows) {
    const yhat = beta[0] + beta[1] * r.t + beta[2] * r.x + beta[3] * r.t * r.x;
    sse += (r.y - yhat) ** 2;
    sst += (r.y - ybar) ** 2;
  }
  const dof = Math.max(1, n - 4);
  const sigma2 = sse / dof;
  const se = inv.map((row, i) => Math.sqrt(Math.max(0, sigma2 * row[i])));
  return { beta, se, r2: sst > 0 ? 1 - sse / sst : 0 };
}

// One simulated experiment: assign treatment 50/50, draw the moderator, generate
// the outcome from the DGP, apply attrition, fit OLS.
function runOnce(dgp: DGP, rng: () => number) {
  const rows: { t: number; x: number; y: number; y2?: number; y3?: number }[] = [];
  for (let i = 0; i < dgp.n; i++) {
    if (rng() < dgp.attrition) continue; // lost to attrition
    const t = rng() < 0.5 ? 1 : 0;
    const x = rng() < dgp.moderatorShare ? 1 : 0;
    const mean = dgp.baseline + dgp.effect * t + 0 * x + dgp.hetEffect * t * x; // b2≈0: moderator alone need not move Y
    const y = mean + gauss(rng) * dgp.sd;
    const row: any = { t, x, y };
    if (dgp.secondary) row.y2 = 0 + dgp.secondary.effect * t + gauss(rng) * dgp.sd;
    if (dgp.longTerm) row.y3 = 0 + dgp.longTerm.effect * t + gauss(rng) * dgp.sd;
    rows.push(row);
  }
  return rows;
}

function meanSe(vals: number[]): { mean: number; se: number } {
  const n = vals.length || 1;
  const m = vals.reduce((s, v) => s + v, 0) / n;
  const varr = vals.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, n - 1);
  return { mean: m, se: Math.sqrt(varr / n) };
}

// The full in-silico run: one representative experiment for the table/graph,
// plus a power estimate from many repetitions.
export function simulate(dgp: DGP, seed: number, powerReps = 240): SimResult | null {
  const rng = mulberry32(seed);
  const rows = runOnce(dgp, rng);
  const fit = ols4(rows.map((r) => ({ t: r.t, x: r.x, y: r.y })));
  if (!fit) return null;
  const names = ["Intercept", `Treatment (b1)`, `${dgp.moderatorName} (b2)`, `Treatment × moderator (b3)`];
  const coefs: Coef[] = fit.beta.map((est, i) => {
    const se = fit.se[i] || 1e-9;
    const t = est / se;
    return { name: names[i], est, se, t, p: twoSidedP(t) };
  });

  const cell = (arm: "Control" | "Treatment", mod: "Low" | "High") => {
    const tv = arm === "Treatment" ? 1 : 0, xv = mod === "High" ? 1 : 0;
    const vals = rows.filter((r) => r.t === tv && r.x === xv).map((r) => r.y);
    const { mean, se } = meanSe(vals);
    return { arm, mod, mean, se, n: vals.length };
  };
  const cells = [cell("Control", "Low"), cell("Treatment", "Low"), cell("Control", "High"), cell("Treatment", "High")];
  const cVals = rows.filter((r) => r.t === 0).map((r) => r.y);
  const trVals = rows.filter((r) => r.t === 1).map((r) => r.y);
  const cm = meanSe(cVals), tm = meanSe(trVals);

  // Power: fraction of fresh experiments where b1 is significant at .05.
  let hits = 0, valid = 0;
  for (let k = 0; k < powerReps; k++) {
    const r2 = runOnce(dgp, mulberry32(seed + 1013 * (k + 1)));
    const f2 = ols4(r2.map((r) => ({ t: r.t, x: r.x, y: r.y })));
    if (!f2) continue;
    valid++;
    const z = f2.beta[1] / (f2.se[1] || 1e-9);
    if (twoSidedP(z) < 0.05) hits++;
  }
  const power = valid ? hits / valid : 0;

  const secondary = dgp.secondary
    ? (() => { const f = ols4(rows.map((r) => ({ t: r.t, x: r.x, y: (r as any).y2 }))); const b = f?.beta[1] ?? 0, s = f?.se[1] ?? 1; return { name: dgp.secondary!.name, est: b, se: s, p: twoSidedP(b / s), unit: dgp.secondary!.unit }; })()
    : undefined;
  const longTerm = dgp.longTerm
    ? (() => { const f = ols4(rows.map((r) => ({ t: r.t, x: r.x, y: (r as any).y3 }))); const b = f?.beta[1] ?? 0, s = f?.se[1] ?? 1; return { name: dgp.longTerm!.name, est: b, se: s, p: twoSidedP(b / s), unit: dgp.longTerm!.unit }; })()
    : undefined;

  return { coefs, n: rows.length, r2: fit.r2, cells, armMeans: { control: cm.mean, treatment: tm.mean, controlSe: cm.se, treatmentSe: tm.se }, power, secondary, longTerm };
}

// A stable seed from the session code, so the artifact page reproduces the same
// draw the room showed.
export function seedFromCode(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
  return h >>> 0;
}

// Convert the AI's proposed process (effects in Cohen's d) into simulator units,
// applying optional power-playground overrides. Shared by the room and the
// standalone artifact page.
export function dgpFromAI(ai: any, nOverride?: number, effMult = 1): DGP {
  const n = (v: any, d: number) => { const x = Number(v); return isFinite(x) ? x : d; };
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
  const sd = clamp(n(ai?.sd, 15), 0.5, 1e6);
  const conv = (d: any, def: number) => clamp(n(d, def), -3, 3) * sd * effMult;
  return {
    outcomeName: String(ai?.outcomeName || "the main outcome"),
    outcomeUnit: String(ai?.outcomeUnit || "units").slice(0, 12),
    baseline: n(ai?.baseline, 50),
    sd,
    effect: conv(ai?.effectD, 0.3),
    moderatorName: String(ai?.moderatorName || "moderator").slice(0, 40),
    moderatorShare: clamp(n(ai?.moderatorShare, 0.5), 0.05, 0.95),
    hetEffect: conv(ai?.hetD, 0.2),
    n: Math.round(clamp(nOverride ?? n(ai?.n, 300), 20, 20000)),
    attrition: clamp(n(ai?.attrition, 0.1), 0, 0.6),
    secondary: ai?.secondary ? { name: String(ai.secondary.name || "mechanism outcome"), effect: conv(ai.secondary.effectD, 0.2), unit: String(ai.secondary.unit || "units").slice(0, 12) } : undefined,
    longTerm: ai?.longTerm ? { name: String(ai.longTerm.name || "long-term outcome"), effect: conv(ai.longTerm.effectD, 0.1), unit: String(ai.longTerm.unit || "units").slice(0, 12) } : undefined,
  };
}

export function fmt(n: number, d = 1): string {
  if (!isFinite(n)) return "—";
  return n.toFixed(d);
}
export function pStars(p: number): string {
  return p < 0.01 ? "***" : p < 0.05 ? "**" : p < 0.1 ? "*" : "";
}
