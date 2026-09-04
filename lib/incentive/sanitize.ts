// Validate/repair the AI's scenario into a valid HiddenScenario and derive the
// answer-free ObservableScenario the student designs against.

import type { HiddenScenario, ObservableScenario, Metric, Dim, Action, ActionKind } from "./types";

const KINDS = new Set<ActionKind>(["productive", "gaming", "harmful", "unmeasured_good"]);
const num = (x: any, d: number) => (isFinite(Number(x)) ? Number(x) : d);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const str = (x: any, d = "") => (typeof x === "string" && x.trim() ? x.trim() : d);
function slug(s: string, f: string) { const o = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); return o || f; }

export function sanitizeScenario(raw: any, meta: { context: string; difficulty: "easy" | "hard" }): { hidden: HiddenScenario; observable: ObservableScenario } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "AI returned no usable scenario." };

  const firm = { name: str(raw?.firm?.name, "the firm"), oneLiner: str(raw?.firm?.oneLiner, "") };
  const role = { title: str(raw?.role?.title, "the role"), brief: str(raw?.role?.brief, "") };

  // metrics
  const mSeen = new Set<string>();
  const metrics: Metric[] = [];
  for (const m of Array.isArray(raw?.metrics) ? raw.metrics : []) {
    let k = slug(m?.key || m?.label, `m${metrics.length + 1}`);
    if (mSeen.has(k)) k = `${k}_${metrics.length + 1}`;
    mSeen.add(k);
    metrics.push({ key: k, label: str(m?.label, k), unit: str(m?.unit) || undefined });
  }
  if (metrics.length < 2) return { error: "Scenario needs at least 2 metrics." };

  // true-value dimensions
  const dSeen = new Set<string>();
  let dims: Dim[] = [];
  for (const d of Array.isArray(raw?.trueDims) ? raw.trueDims : []) {
    let k = slug(d?.key || d?.label, `d${dims.length + 1}`);
    if (dSeen.has(k)) k = `${k}_${dims.length + 1}`;
    dSeen.add(k);
    dims.push({ key: k, label: str(d?.label, k), weight: Math.max(0, num(d?.weight, 1)) });
  }
  if (dims.length < 2) return { error: "Scenario needs at least 2 true-value dimensions." };
  const wsum = dims.reduce((s, d) => s + d.weight, 0) || 1;
  dims = dims.map((d) => ({ ...d, weight: d.weight / wsum }));

  const metricKeys = new Set(metrics.map((m) => m.key));
  const dimKeys = new Set(dims.map((d) => d.key));

  // actions
  const aSeen = new Set<string>();
  const actions: Action[] = [];
  for (const a of Array.isArray(raw?.actions) ? raw.actions : []) {
    let k = slug(a?.key || a?.label, `a${actions.length + 1}`);
    if (aSeen.has(k)) k = `${k}_${actions.length + 1}`;
    aSeen.add(k);
    const metricEffect: Record<string, number> = {};
    for (const [mk, v] of Object.entries(a?.metricEffect || {})) { const kk = slug(mk, ""); if (metricKeys.has(kk)) metricEffect[kk] = clamp(num(v, 0), 0, 100); }
    const valueEffect: Record<string, number> = {};
    for (const [dk, v] of Object.entries(a?.valueEffect || {})) { const kk = slug(dk, ""); if (dimKeys.has(kk)) valueEffect[kk] = clamp(num(v, 0), -100, 100); }
    actions.push({
      key: k, label: str(a?.label, k), description: str(a?.description, ""),
      effort: clamp(num(a?.effort, 0.5), 0.1, 1),
      metricEffect, valueEffect,
      kind: KINDS.has(a?.kind) ? a.kind : "productive",
    });
  }
  if (actions.length < 4) return { error: "Scenario needs at least 4 actions." };

  const hidden: HiddenScenario = {
    context: meta.context, difficulty: meta.difficulty, firm, role, metrics, trueDims: dims, actions,
    leisure: clamp(num(raw?.leisure, 20), 0, 45),
    principle: str(raw?.principle, ""),
  };
  const observable: ObservableScenario = {
    context: meta.context, difficulty: meta.difficulty, firm, role,
    trueObjective: str(raw?.trueObjective, ""),
    metrics, actions: actions.map((a) => ({ key: a.key, label: a.label, description: a.description })),
  };
  return { hidden, observable };
}
