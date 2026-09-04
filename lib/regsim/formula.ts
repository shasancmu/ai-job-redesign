// A tiny R-style formula parser: "y ~ x1 + log(x2) + x1:x3 + I(x2^2)".
// Turns a formula into a design matrix (for OLS) and into a canonical term set
// (for grading against the DGP). Supported RHS terms:
//   x              a raw variable
//   log(x)         natural log        sqrt(x)   square root
//   I(x^2) or x^2  square
//   a:b            interaction (product of two variables)
//   a*b            expands to  a + b + a:b

import type { DgpTerm } from "./types";

export type Term =
  | { kind: "var"; name: string }
  | { kind: "fn"; fn: "log" | "sqrt" | "square"; name: string }
  | { kind: "interaction"; a: string; b: string };

export type ParsedFormula = { outcome: string; terms: Term[] };

const VAR = /^[a-zA-Z_]\w*$/;

function classify(tokRaw: string): Term[] | { error: string } {
  const tok = tokRaw.replace(/\s+/g, "");
  if (!tok) return { error: "empty term" };
  // a*b  -> main effects + interaction
  if (tok.includes("*")) {
    const [a, b] = tok.split("*");
    if (!VAR.test(a) || !VAR.test(b)) return { error: `bad interaction "${tokRaw}"` };
    return [{ kind: "var", name: a }, { kind: "var", name: b }, { kind: "interaction", a, b }];
  }
  // a:b  -> interaction only
  if (tok.includes(":")) {
    const [a, b] = tok.split(":");
    if (!VAR.test(a) || !VAR.test(b)) return { error: `bad interaction "${tokRaw}"` };
    return [{ kind: "interaction", a, b }];
  }
  let m = tok.match(/^(log|sqrt)\(([a-zA-Z_]\w*)\)$/);
  if (m) return [{ kind: "fn", fn: m[1] as "log" | "sqrt", name: m[2] }];
  m = tok.match(/^I\(([a-zA-Z_]\w*)\^2\)$/) || tok.match(/^([a-zA-Z_]\w*)\^2$/);
  if (m) return [{ kind: "fn", fn: "square", name: m[1] }];
  if (VAR.test(tok)) return [{ kind: "var", name: tok }];
  return { error: `couldn't parse term "${tokRaw}"` };
}

export function parseFormula(src: string): ParsedFormula | { error: string } {
  const parts = src.split("~");
  if (parts.length !== 2) return { error: "A formula needs one ~, e.g. y ~ x1 + x2" };
  const outcome = parts[0].trim();
  if (!VAR.test(outcome)) return { error: `left side "${outcome}" isn't a variable name` };
  const rhs = parts[1].trim();
  if (!rhs || rhs === "1") return { outcome, terms: [] };
  const terms: Term[] = [];
  const seen = new Set<string>();
  for (const tok of rhs.split("+")) {
    if (!tok.trim() || tok.trim() === "1") continue;
    const res = classify(tok);
    if ("error" in res) return res;
    for (const t of res) {
      const key = termKey(t);
      if (!seen.has(key)) {
        seen.add(key);
        terms.push(t);
      }
    }
  }
  return { outcome, terms };
}

// Canonical key used to compare a student's term to a DGP term.
export function termKey(t: Term): string {
  if (t.kind === "var") return t.name;
  if (t.kind === "fn") return `${t.fn === "square" ? "sq" : t.fn}:${t.name}`;
  return `int:${[t.a, t.b].sort().join("*")}`;
}

export function termLabel(t: Term): string {
  if (t.kind === "var") return t.name;
  if (t.kind === "fn") return t.fn === "square" ? `I(${t.name}^2)` : `${t.fn}(${t.name})`;
  return `${t.a}:${t.b}`;
}

// The DGP's true terms mapped into the same canonical key space.
export function dgpTermKey(t: DgpTerm): string {
  if (t.kind === "linear") return t.var;
  if (t.kind === "transform") return `${t.fn === "square" ? "sq" : t.fn}:${t.var}`;
  return `int:${[...t.vars].sort().join("*")}`;
}

export function dgpTermLabel(t: DgpTerm): string {
  if (t.kind === "linear") return t.var;
  if (t.kind === "transform") return t.fn === "square" ? `I(${t.var}^2)` : `${t.fn}(${t.var})`;
  return `${t.vars[0]}:${t.vars[1]}`;
}

// Every base variable a term references (for validation against the dataset).
export function termVars(t: Term): string[] {
  if (t.kind === "interaction") return [t.a, t.b];
  return [t.name];
}

export type Design = { X: number[][]; names: string[] };

// Build the OLS design matrix (intercept first) from the dataset columns.
export function buildDesign(columns: Record<string, number[]>, terms: Term[]): Design | { error: string } {
  const n = columns[Object.keys(columns)[0]]?.length || 0;
  const names = ["(Intercept)", ...terms.map(termLabel)];
  const X: number[][] = Array.from({ length: n }, () => [1]);
  for (const t of terms) {
    for (const v of termVars(t)) {
      if (!columns[v]) return { error: `unknown variable "${v}"` };
    }
    for (let i = 0; i < n; i++) {
      let val: number;
      if (t.kind === "var") val = columns[t.name][i];
      else if (t.kind === "interaction") val = columns[t.a][i] * columns[t.b][i];
      else if (t.fn === "log") {
        const x = columns[t.name][i];
        if (x <= 0) return { error: `log(${t.name}) needs positive values` };
        val = Math.log(x);
      } else if (t.fn === "sqrt") {
        const x = columns[t.name][i];
        if (x < 0) return { error: `sqrt(${t.name}) needs non-negative values` };
        val = Math.sqrt(x);
      } else val = columns[t.name][i] * columns[t.name][i];
      X[i].push(val);
    }
  }
  return { X, names };
}
