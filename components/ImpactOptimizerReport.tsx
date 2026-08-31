"use client";

import { useState } from "react";

type Fingerprint = Record<string, number>;
type Step = { round: number; gap: string; abstract: string; gain: number; fingerprint: Fingerprint };
type Result = { target: string; baseline: Fingerprint; steps: Step[]; stop: string };

const LABEL: Record<string, string> = {
  commercial: "Commercial", scientific: "Scientific", social: "Social",
  complex_invention: "Complex", interdisciplinary: "Interdisc", defense: "Defense",
};
const STOP_NOTE: Record<string, string> = {
  plateau: "Stopped: the next step added less than +2 — diminishing returns.",
  ceiling: "Stopped: the target hit the model's practical ceiling.",
  maxRounds: "Stopped: reached the round cap.",
  "no-improvement": "Stopped: no scorable next step was found.",
};

function cellBg(v: number) {
  if (v == null || v < 0) return "transparent";
  const t = Math.max(0, Math.min(100, v)) / 100;
  const r = Math.round(192 + (63 - 192) * t), g = Math.round(106 + (122 - 106) * t), b = Math.round(71 + (82 - 71) * t);
  return `rgba(${r},${g},${b},${0.12 + t * 0.5})`;
}

export default function ImpactOptimizerReport({ result }: { result: Result }) {
  const r = result || ({} as Result);
  const target = r.target;
  const steps = r.steps || [];
  const base = r.baseline || {};
  const [open, setOpen] = useState<number | null>(steps.length ? 0 : null);

  // dimensions present, target first
  const dims = Object.keys(base);
  dims.sort((a, b) => (a === target ? -1 : b === target ? 1 : 0));
  const stages = [{ key: "Base", fp: base }, ...steps.map((s) => ({ key: String(s.round), fp: s.fingerprint }))];

  const baseT = base[target] ?? 0;
  const finalT = steps.length ? steps[steps.length - 1].fingerprint[target] ?? baseT : baseT;

  // side-effects: other dims that moved notably from baseline to final
  const finalFp = steps.length ? steps[steps.length - 1].fingerprint : base;
  const sideEffects = dims.filter((d) => d !== target && typeof base[d] === "number" && typeof finalFp[d] === "number" && Math.abs((finalFp[d] as number) - (base[d] as number)) >= 5)
    .map((d) => ({ dim: d, from: base[d] as number, to: finalFp[d] as number }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">Target: {LABEL[target] || target} potential</div>
        <p className="mt-1 text-lg font-bold leading-snug text-ink">
          {LABEL[target] || target}: {baseT} → {finalT} <span className={finalT > baseT ? "text-sage" : "text-slate-400"}>({finalT - baseT >= 0 ? "+" : ""}{finalT - baseT})</span>
          <span className="text-sm font-medium text-slate-400"> over {steps.length} step{steps.length === 1 ? "" : "s"}</span>
        </p>
        <div className="mt-1 text-sm text-slate-500">{STOP_NOTE[r.stop] || ""}</div>
      </div>

      {/* Trajectory across every dimension — the trade-off tracker */}
      {dims.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Trajectory (every potential, as the science compounds)</div>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-mist text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold">Potential</th>
                  {stages.map((s, i) => <th key={i} className="px-2 py-2 text-center font-semibold">{s.key}</th>)}
                  <th className="px-2 py-2 text-center font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {dims.map((d) => {
                  const vals = stages.map((s) => s.fp[d]);
                  const net = (finalFp[d] ?? base[d] ?? 0) - (base[d] ?? 0);
                  const isTarget = d === target;
                  return (
                    <tr key={d} className={"border-t border-line-soft " + (isTarget ? "bg-sage/5" : "")}>
                      <td className={"px-3 py-1.5 " + (isTarget ? "font-bold text-ink" : "text-slate-600")}>{LABEL[d] || d}{isTarget ? " ◄" : ""}</td>
                      {vals.map((v, i) => <td key={i} className="px-2 py-1.5 text-center tabular-nums" style={{ background: cellBg(v as number) }}>{v == null || v < 0 ? "—" : v}</td>)}
                      <td className={"px-2 py-1.5 text-center text-xs font-semibold tabular-nums " + (net > 0 ? "text-sage" : net < 0 ? "text-clay" : "text-slate-400")}>{net > 0 ? "+" : ""}{net}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sideEffects.length > 0 && (
            <p className="mt-2 text-xs text-slate2">
              <span className="font-semibold text-ink">Trade-offs:</span> optimizing {LABEL[target] || target} also moved {sideEffects.map((s) => `${LABEL[s.dim] || s.dim} ${s.from}→${s.to}`).join(", ")}.
              {sideEffects.some((s) => s.to < s.from) ? " Watch the dimensions that dropped." : ""}
            </p>
          )}
        </div>
      )}

      {/* The compounding roadmap — the science to do, in order */}
      {steps.length > 0 ? (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The missing science, in sequence (each builds on the last)</div>
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{s.round}</span>
                  <div className="text-sm font-medium text-ink">{s.gap}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold tabular-nums text-ink">{s.fingerprint[target] ?? "—"}<span className="text-xs text-slate-400">/100</span></div>
                  <div className="text-xs font-semibold text-sage">+{s.gain}</div>
                </div>
              </div>
              <button onClick={() => setOpen(open === i ? null : i)} className="mt-2 pl-9 text-xs font-medium text-sky hover:underline">{open === i ? "Hide" : "See the abstract at this step →"}</button>
              {open === i && <p className="mt-2 rounded-lg bg-mist p-3 text-sm leading-relaxed text-slate-700">{s.abstract}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-slate2">No meaningful next step raised the target — the work already scores near the ceiling here.</div>
      )}

      <p className="text-xs text-slate-400">Predicted scores assume each step succeeds. The added science is hypothetical — a prioritization aid for where to take the work, not a promise. Watch the trade-off row for dimensions that fall.</p>
    </div>
  );
}
