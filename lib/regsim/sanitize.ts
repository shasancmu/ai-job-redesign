// Turn the AI's proposed DGP JSON into a valid, fair Dgp. Repairs the common
// ways an LLM spec goes wrong: duplicate/blank names, invalid distributions,
// terms referencing missing or distractor variables, zero betas, and — crucially
// — keeps `role` consistent with the surviving terms, since grading uses role to
// tell a distractor apart from a driver used in the wrong form.

import type { Dgp, DgpVar, DgpTerm, Dist, Role, Fn } from "./types";

function snake(s: string, fallback: string): string {
  const out = String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^([0-9])/, "v$1");
  return out || fallback;
}

function fin(x: any, d: number): number {
  const n = Number(x);
  return isFinite(n) ? n : d;
}

function cleanDist(raw: any): Dist | null {
  if (!raw || typeof raw !== "object") return null;
  const kind = raw.kind;
  if (kind === "normal") return { kind, mean: fin(raw.mean, 0), sd: Math.max(1e-3, Math.abs(fin(raw.sd, 1))) };
  if (kind === "lognormal") return { kind, mean: fin(raw.mean, 0), sd: Math.max(1e-3, Math.abs(fin(raw.sd, 0.5))) };
  if (kind === "uniform") {
    let min = fin(raw.min, 0);
    let max = fin(raw.max, 1);
    if (max <= min) max = min + 1;
    return { kind, min, max };
  }
  if (kind === "binary") return { kind, p: Math.min(0.95, Math.max(0.05, fin(raw.p, 0.5))) };
  return null;
}

export function sanitizeDgp(raw: any, meta: { context: string; difficulty: "easy" | "hard"; seed: number; n: number }): { dgp: Dgp } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "AI returned no usable spec." };

  const outcomeName = snake(raw?.outcome?.name, "y");
  const outcomeLabel = String(raw?.outcome?.label || "Outcome").slice(0, 80);

  // variables
  const seen = new Set<string>([outcomeName]);
  const vars: DgpVar[] = [];
  for (const v of Array.isArray(raw.vars) ? raw.vars : []) {
    let name = snake(v?.name, `x${vars.length + 1}`);
    if (seen.has(name)) {
      let k = 2;
      while (seen.has(`${name}_${k}`)) k++;
      name = `${name}_${k}`;
    }
    const dist = cleanDist(v?.dist);
    if (!dist) continue;
    seen.add(name);
    const role: Role = v?.role === "distractor" ? "distractor" : "driver";
    vars.push({ name, label: String(v?.label || name).slice(0, 80), dist, role });
  }
  if (vars.length < 4) return { error: "AI spec had too few valid variables." };

  const byName = new Map(vars.map((v) => [v.name, v]));

  // terms — only over existing variables; dedupe; nonzero betas
  const termKeys = new Set<string>();
  const terms: DgpTerm[] = [];
  const referenced = new Set<string>();
  for (const t of Array.isArray(raw.terms) ? raw.terms : []) {
    const beta = fin(t?.beta, 0);
    if (!beta) continue;
    if (t?.kind === "linear") {
      const vn = snake(t.var, "");
      if (!byName.has(vn)) continue;
      const key = `lin:${vn}`;
      if (termKeys.has(key)) continue;
      termKeys.add(key);
      terms.push({ kind: "linear", var: vn, beta });
      referenced.add(vn);
    } else if (t?.kind === "transform") {
      const vn = snake(t.var, "");
      const fn: Fn = t.fn === "sqrt" ? "sqrt" : t.fn === "square" ? "square" : "log";
      if (!byName.has(vn)) continue;
      const key = `${fn}:${vn}`;
      if (termKeys.has(key)) continue;
      termKeys.add(key);
      terms.push({ kind: "transform", var: vn, fn, beta });
      referenced.add(vn);
    } else if (t?.kind === "interaction") {
      const a = snake(t?.vars?.[0], "");
      const b = snake(t?.vars?.[1], "");
      if (!byName.has(a) || !byName.has(b) || a === b) continue;
      const key = `int:${[a, b].sort().join("*")}`;
      if (termKeys.has(key)) continue;
      termKeys.add(key);
      terms.push({ kind: "interaction", vars: [a, b], beta });
      referenced.add(a);
      referenced.add(b);
    }
  }
  if (terms.length === 0) return { error: "AI spec had no usable true terms." };

  // Keep role consistent with the terms: anything referenced is a driver; any
  // driver never referenced becomes a distractor (so the puzzle has real red
  // herrings and grading can name them).
  for (const v of vars) v.role = referenced.has(v.name) ? "driver" : "distractor";

  // correlations among existing vars
  const correlations: { a: string; b: string; rho: number }[] = [];
  for (const c of Array.isArray(raw.correlations) ? raw.correlations : []) {
    const a = snake(c?.a, "");
    const b = snake(c?.b, "");
    if (!byName.has(a) || !byName.has(b) || a === b) continue;
    correlations.push({ a, b, rho: Math.max(-0.8, Math.min(0.8, fin(c?.rho, 0))) });
  }

  const noiseSd = Math.max(1e-3, Math.abs(fin(raw.noiseSd, meta.difficulty === "easy" ? 2 : 6)));

  const dgp: Dgp = {
    context: meta.context,
    scenario: String(raw.scenario || "").slice(0, 600),
    difficulty: meta.difficulty,
    n: meta.n,
    seed: meta.seed,
    outcome: { name: outcomeName, label: outcomeLabel },
    intercept: fin(raw.intercept, 0),
    vars,
    terms,
    correlations,
    noiseSd,
  };
  return { dgp };
}
