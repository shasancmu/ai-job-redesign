// The bare-bones "R console": parse a typed command against the in-memory
// dataset and return a structured result the UI renders (table, correlation
// matrix, regression, histogram, scatter, binscatter). Pure + client-side — the
// data lives in the browser, so commands are instant and reveal nothing extra.

import { correlation, describe, ols, mean } from "./stats";
import type { OlsResult } from "./stats";
import { parseFormula, buildDesign } from "./formula";
import { evalExpr } from "./expr";

export type ConsoleResult =
  | { type: "text"; lines: string[] }
  | { type: "error"; message: string }
  | { type: "table"; title?: string; head: string[]; rows: (string | number)[][] }
  | { type: "cormatrix"; vars: string[]; matrix: number[][] }
  | { type: "reg"; formula: string; ols: OlsResult }
  | { type: "hist"; varName: string; bins: { x0: number; x1: number; count: number }[] }
  | { type: "scatter"; xName: string; yName: string; points: [number, number][]; fit: { slope: number; intercept: number } }
  | { type: "binscatter"; xName: string; yName: string; bins: { x: number; y: number }[]; fit: { slope: number; intercept: number } };

export type RunOutput = { result: ConsoleResult; newColumn?: { name: string; values: number[] } };

const HELP = [
  "Commands:",
  "  vars()                list variables",
  "  describe()            summary stats for every column",
  "  cor()                 full correlation matrix",
  "  cor(x, y)             correlation between two variables",
  "  hist(x)               histogram of x",
  "  scatter(x, y)         scatter of y vs x (with fitted line)",
  "  binscatter(x, y)      binned scatter of y vs x",
  "  reg(y ~ x1 + x2)      OLS regression",
  "     forms: log(x), sqrt(x), I(x^2), x1:x2 (interaction), x1*x2",
  "  gen name = expr       make a new variable, e.g. gen z = log(x)*y",
];

function fitLine(x: number[], y: number[]): { slope: number; intercept: number } {
  const mx = mean(x);
  const my = mean(y);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < x.length; i++) {
    sxx += (x[i] - mx) * (x[i] - mx);
    sxy += (x[i] - mx) * (y[i] - my);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

// Parse a function-style call like `cor(a, b)` → { name:"cor", args:["a","b"] }.
function parseCall(cmd: string): { name: string; args: string[]; inner: string } | null {
  const m = cmd.match(/^([a-zA-Z_]\w*)\s*\(([\s\S]*)\)\s*$/);
  if (!m) return null;
  const inner = m[2].trim();
  const args = inner.length ? inner.split(",").map((a) => a.trim()) : [];
  return { name: m[1], args, inner };
}

export function runCommand(raw: string, columns: Record<string, number[]>, outcomeName: string): RunOutput {
  const cmd = raw.trim();
  if (!cmd) return { result: { type: "text", lines: [] } };
  if (cmd === "help" || cmd === "help()") return { result: { type: "text", lines: HELP } };

  const names = Object.keys(columns);
  const err = (message: string): RunOutput => ({ result: { type: "error", message } });

  // gen name = expr
  const gen = cmd.match(/^gen(?:erate)?\s+([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/);
  if (gen) {
    const name = gen[1];
    if (columns[name]) return err(`"${name}" already exists — pick another name.`);
    if (name === outcomeName) return err(`"${name}" is the outcome — pick another name.`);
    const vals = evalExpr(gen[2], columns);
    if ("error" in vals) return err(vals.error);
    return { result: { type: "text", lines: [`Created ${name} (${vals.length} values). Use it in any command.`] }, newColumn: { name, values: vals } };
  }

  const call = parseCall(cmd);
  if (!call) {
    // allow a bare "reg y ~ ..." without parens too
    if (/~/.test(cmd)) return runReg(cmd.replace(/^reg\s*/, ""), columns, outcomeName, err);
    return err(`Didn't understand "${cmd}". Type help for the command list.`);
  }

  const need = (v: string) => {
    if (!columns[v]) throw new Error(`unknown variable "${v}"`);
    return columns[v];
  };

  try {
    switch (call.name) {
      case "vars":
      case "names":
        return { result: { type: "text", lines: [names.join(", ")] } };
      case "head": {
        const k = Math.min(6, columns[names[0]].length);
        const rows: (string | number)[][] = [];
        for (let i = 0; i < k; i++) rows.push(names.map((n) => round(columns[n][i])));
        return { result: { type: "table", title: `First ${k} rows`, head: names, rows } };
      }
      case "describe":
      case "summary": {
        const head = ["variable", "n", "mean", "sd", "min", "median", "max"];
        const rows = names.map((n) => {
          const d = describe(columns[n]);
          return [n, d.n, round(d.mean), round(d.sd), round(d.min), round(d.median), round(d.max)];
        });
        return { result: { type: "table", title: "Summary", head, rows } };
      }
      case "cor":
      case "correlate": {
        if (call.args.length === 2) {
          const r = correlation(need(call.args[0]), need(call.args[1]));
          return { result: { type: "text", lines: [`cor(${call.args[0]}, ${call.args[1]}) = ${round(r, 3)}`] } };
        }
        if (call.args.length === 1) {
          const r = correlation(need(call.args[0]), columns[outcomeName]);
          return { result: { type: "text", lines: [`cor(${call.args[0]}, ${outcomeName}) = ${round(r, 3)}`] } };
        }
        const vlist = names;
        if (vlist.length > 16) return err("Too many variables for a full matrix — use cor(x, y) or cor(x).");
        const matrix = vlist.map((a) => vlist.map((b) => correlation(columns[a], columns[b])));
        return { result: { type: "cormatrix", vars: vlist, matrix } };
      }
      case "hist": {
        if (call.args.length !== 1) return err("hist(x) takes one variable.");
        const x = need(call.args[0]);
        return { result: histResult(call.args[0], x) };
      }
      case "scatter":
      case "plot": {
        if (call.args.length !== 2) return err("scatter(x, y) takes two variables.");
        const x = need(call.args[0]);
        const y = need(call.args[1]);
        const idx = sampleIndices(x.length, 500);
        const points = idx.map((i) => [x[i], y[i]] as [number, number]);
        return { result: { type: "scatter", xName: call.args[0], yName: call.args[1], points, fit: fitLine(x, y) } };
      }
      case "binscatter": {
        if (call.args.length !== 2) return err("binscatter(x, y) takes two variables.");
        const x = need(call.args[0]);
        const y = need(call.args[1]);
        return { result: binscatterResult(call.args[0], call.args[1], x, y) };
      }
      case "reg":
      case "lm":
        return runReg(call.inner, columns, outcomeName, err);
      default:
        return err(`Unknown command "${call.name}". Type help.`);
    }
  } catch (e: any) {
    return err(e?.message || "command failed");
  }
}

function runReg(formulaSrc: string, columns: Record<string, number[]>, outcomeName: string, err: (m: string) => RunOutput): RunOutput {
  const parsed = parseFormula(formulaSrc);
  if ("error" in parsed) return err(parsed.error);
  if (!columns[parsed.outcome]) return err(`unknown outcome "${parsed.outcome}"`);
  const design = buildDesign(columns, parsed.terms);
  if ("error" in design) return err(design.error);
  const fit = ols(design.X, columns[parsed.outcome], design.names);
  if (fit.singular) return err("Singular fit — two predictors are perfectly collinear. Drop one.");
  return { result: { type: "reg", formula: `${parsed.outcome} ~ ${design.names.slice(1).join(" + ") || "1"}`, ols: fit } };
}

function histResult(name: string, x: number[]): ConsoleResult {
  const min = Math.min(...x);
  const max = Math.max(...x);
  const k = Math.min(20, Math.max(8, Math.round(Math.sqrt(x.length))));
  const w = (max - min) / k || 1;
  const bins = Array.from({ length: k }, (_, i) => ({ x0: min + i * w, x1: min + (i + 1) * w, count: 0 }));
  for (const v of x) {
    let b = Math.floor((v - min) / w);
    if (b >= k) b = k - 1;
    if (b < 0) b = 0;
    bins[b].count++;
  }
  return { type: "hist", varName: name, bins };
}

function binscatterResult(xName: string, yName: string, x: number[], y: number[]): ConsoleResult {
  const n = x.length;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => x[a] - x[b]);
  const k = Math.min(20, Math.max(5, Math.round(n / 25)));
  const bins: { x: number; y: number }[] = [];
  const per = Math.floor(n / k) || 1;
  for (let b = 0; b < k; b++) {
    const start = b * per;
    const end = b === k - 1 ? n : (b + 1) * per;
    if (start >= end) break;
    let sx = 0;
    let sy = 0;
    for (let i = start; i < end; i++) {
      sx += x[order[i]];
      sy += y[order[i]];
    }
    bins.push({ x: sx / (end - start), y: sy / (end - start) });
  }
  return { type: "binscatter", xName, yName, bins, fit: fitLine(x, y) };
}

function sampleIndices(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = n / max;
  return Array.from({ length: max }, (_, i) => Math.floor(i * step));
}

function round(x: number, d = 3): number {
  if (!isFinite(x)) return x;
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
}
