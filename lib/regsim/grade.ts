// Objective grading: compare the student's submitted model to the DGP's true
// terms. Structure recovery (did they find the right terms and drop the
// distractors) dominates; sign correctness and parsimony round it out. The AI
// layer (separate) grades the written reasoning on top of this.

import type { Dgp } from "./types";
import { parseFormula, termKey, termLabel, termVars, dgpTermKey, dgpTermLabel, buildDesign, type Term } from "./formula";
import { ols } from "./stats";

export type GradeBreakdown = {
  score: number; // 0-100 overall
  structure: number; // 0-100 (F1 on the term set)
  signs: number; // 0-100 (sign accuracy on correctly-identified terms)
  parsimony: number; // 0-100 (penalty for junk terms)
  precision: number;
  recall: number;
  f1: number;
  correct: string[]; // true terms the student recovered (labels)
  missed: string[]; // true terms the student missed (labels)
  extra: { label: string; why: string }[]; // student terms that shouldn't be there
  signAccuracy: number; // fraction of correct terms with the right sign
  trueModel: string; // readable ground-truth equation
  studentModel: string; // normalized student RHS
  error?: string;
};

// Format a coefficient for the equation. Uses enough precision that a small but
// real coefficient never collapses to "0" (a near-zero display on a large-scale
// interaction product would read as a bug).
function num(x: number): string {
  if (!isFinite(x)) return "?";
  if (x === 0) return "0";
  const a = Math.abs(x);
  let s = a >= 1 ? x.toFixed(2) : a >= 0.0001 ? x.toFixed(5) : x.toExponential(1);
  if (s.includes(".") && !s.includes("e")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

// Human-readable ground-truth equation.
export function trueModelString(dgp: Dgp): string {
  const parts: string[] = [num(dgp.intercept)];
  for (const t of dgp.terms) {
    const b = t.kind === "linear" ? t.beta : t.kind === "transform" ? t.beta : t.beta;
    const sign = b >= 0 ? "+" : "−";
    parts.push(`${sign} ${num(Math.abs(b))}·${dgpTermLabel(t)}`);
  }
  return `${dgp.outcome.name} = ${parts.join(" ")} + ε`;
}

const varRole = (dgp: Dgp, name: string) => dgp.vars.find((v) => v.name === name)?.role;

function whyExtra(dgp: Dgp, t: Term): string {
  const vars = termVars(t);
  if (vars.every((v) => varRole(dgp, v) === "distractor")) return "distractor — not in the true model";
  if (t.kind === "interaction") return "spurious interaction";
  if (t.kind === "fn") return "wrong functional form for this variable";
  // a driver included in the wrong form (e.g. linear where truth is log)
  return "driver, but not the form used in the true model";
}

export function gradeSubmission(dgp: Dgp, columns: Record<string, number[]>, formula: string): GradeBreakdown {
  const empty = (error: string): GradeBreakdown => ({
    score: 0, structure: 0, signs: 0, parsimony: 0, precision: 0, recall: 0, f1: 0,
    correct: [], missed: dgp.terms.map(dgpTermLabel), extra: [], signAccuracy: 0,
    trueModel: trueModelString(dgp), studentModel: formula, error,
  });

  const parsed = parseFormula(formula);
  if ("error" in parsed) return empty(parsed.error);

  const trueKeys = new Map(dgp.terms.map((t) => [dgpTermKey(t), t]));
  const studentKeys = new Map(parsed.terms.map((t) => [termKey(t), t]));

  const correct: string[] = [];
  const correctTerms: Term[] = [];
  for (const [k, t] of studentKeys) {
    if (trueKeys.has(k)) {
      correct.push(termLabel(t));
      correctTerms.push(t);
    }
  }
  const missed: string[] = [];
  for (const [k, t] of trueKeys) if (!studentKeys.has(k)) missed.push(dgpTermLabel(t));
  const extra: { label: string; why: string }[] = [];
  for (const [k, t] of studentKeys) if (!trueKeys.has(k)) extra.push({ label: termLabel(t), why: whyExtra(dgp, t) });

  const tp = correct.length;
  const fp = extra.length;
  const fn = missed.length;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  // sign accuracy on correctly-identified terms
  let signAccuracy = 1;
  if (correctTerms.length) {
    const design = buildDesign(columns, parsed.terms);
    if (!("error" in design)) {
      const fit = ols(design.X, columns[parsed.outcome] || columns[dgp.outcome.name], design.names);
      let good = 0;
      for (const t of correctTerms) {
        const label = termLabel(t);
        const ci = fit.names.indexOf(label);
        const trueT = trueKeys.get(termKey(t))!;
        const trueBeta = trueT.beta;
        if (ci >= 0 && isFinite(fit.coef[ci]) && Math.sign(fit.coef[ci]) === Math.sign(trueBeta)) good++;
      }
      signAccuracy = good / correctTerms.length;
    }
  }

  // parsimony: full credit with no junk; lose ground per extra term relative to
  // the size of the true model.
  const parsimony = Math.max(0, 1 - fp / Math.max(3, dgp.terms.length));

  const structure100 = 100 * f1;
  const signs100 = 100 * signAccuracy;
  const parsimony100 = 100 * parsimony;
  const score = Math.round(0.7 * structure100 + 0.2 * signs100 + 0.1 * parsimony100);

  return {
    score,
    structure: Math.round(structure100),
    signs: Math.round(signs100),
    parsimony: Math.round(parsimony100),
    precision,
    recall,
    f1,
    correct,
    missed,
    extra,
    signAccuracy,
    trueModel: trueModelString(dgp),
    studentModel: parsed.terms.map(termLabel).join(" + ") || "(intercept only)",
  };
}
