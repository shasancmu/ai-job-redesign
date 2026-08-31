"use client";

import { useState } from "react";

type Ext = { gap: string; abstract: string; score: number; delta: number };
type Roadmap = { headline?: string; priority?: { step: string; why: string }[]; caution?: string };
type Result = { target: string; baseline: number; extensions: Ext[]; roadmap?: Roadmap };

const TARGET_LABEL: Record<string, string> = {
  commercial: "Commercial", scientific: "Scientific", social: "Social",
  complex_invention: "Complex-invention", interdisciplinary: "Interdisciplinary", defense: "Defense",
};

export default function ImpactOptimizerReport({ result }: { result: Result }) {
  const r = result || ({} as Result);
  const label = TARGET_LABEL[r.target] || r.target;
  const exts = r.extensions || [];
  const maxScore = Math.max(r.baseline || 0, ...exts.map((e) => e.score), 1);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">Target: {label} potential</div>
        {r.roadmap?.headline && <p className="mt-1 text-lg font-bold leading-snug text-ink">{r.roadmap.headline}</p>}
        <div className="mt-2 text-sm text-slate-600">Current score: <span className="font-semibold text-ink">{r.baseline}/100</span>. Below: the missing science that would raise it most, each scored as the paper it would become.</div>
      </div>

      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Missing science, ranked by predicted gain</div>
        {exts.map((e, i) => {
          const color = e.score >= 66 ? "#3F7A52" : e.score >= 33 ? "#CE8F2C" : "#C06A47";
          return (
            <div key={i} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{e.gap}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold tabular-nums text-ink">{e.score}<span className="text-xs text-slate-400">/100</span></div>
                  <div className={"text-xs font-semibold " + (e.delta > 0 ? "text-sage" : "text-slate-400")}>{e.delta > 0 ? `+${e.delta}` : e.delta}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full bg-slate-300" style={{ width: `${(r.baseline / maxScore) * 100}%` }} />
                </div>
              </div>
              <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full" style={{ width: `${(e.score / maxScore) * 100}%`, background: color }} />
              </div>
              <button onClick={() => setOpen(open === i ? null : i)} className="mt-2 text-xs font-medium text-sky hover:underline">
                {open === i ? "Hide" : "See the abstract this would become →"}
              </button>
              {open === i && <p className="mt-2 rounded-lg bg-mist p-3 text-sm leading-relaxed text-slate-700">{e.abstract}</p>}
            </div>
          );
        })}
      </div>

      {Array.isArray(r.roadmap?.priority) && r.roadmap!.priority!.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Research roadmap</div>
          <ol className="mt-2 space-y-2.5">
            {r.roadmap!.priority!.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                <span><span className="font-semibold text-ink">{p.step}.</span> <span className="text-slate-600">{p.why}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-xs text-slate-400">{r.roadmap?.caution || "Predicted gains assume the added work succeeds. The extensions are hypothetical — a prioritization aid for where to take the science, not a promise."}</p>
    </div>
  );
}
