"use client";

import type { ObservableScenario } from "@/lib/starhire/types";

const ARCH: Record<string, string> = { star_trap: "Star (trap)", best_fit: "Best fit", solid: "Solid", specialist: "Specialist", internal: "Internal", journeyman: "Journeyman" };

function Bar({ label, value, tone = "sage" }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate2"><span>{label}</span><span className="tabular-nums">{value}</span></div>
      <div className="mt-1 h-2 rounded-full bg-mist"><div className={"h-2 rounded-full bg-" + tone} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}

export default function StarHireResult({ result, scenario }: { result: any; scenario: ObservableScenario }) {
  const truth: any[] = [...(result.truth || [])].sort((a, b) => a.rank - b.rank);
  const report = result.report || {};
  const revById: Record<string, any> = {};
  for (const c of report.candidates || []) revById[c.id] = c;
  const vals = truth.map((c) => c.value);
  const vMin = Math.min(...vals, 0);
  const vMax = Math.max(...vals, 1);
  const vSpan = vMax - vMin || 1;
  const ds = result.decisionScore ?? 0;
  const scoreColor = ds >= 85 ? "text-sage" : ds >= 55 ? "text-amber-600" : "text-red-600";
  const pickId = result.pick?.id;
  const bestId = result.bestId;
  const calib = report.calibration || "";
  const calibTone = calib === "well-calibrated" ? "bg-sage-soft text-sage" : "bg-amber/20 text-amber-700";

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <div className={"text-5xl font-bold tabular-nums " + scoreColor}>{ds}</div>
            <div className="text-xs uppercase tracking-wide text-slate-400">hire quality</div>
          </div>
          <div className="min-w-[220px] flex-1 space-y-2">
            {report.question_quality && <Bar label="Question quality" value={Math.round(report.question_quality.score || 0)} />}
            <div className="flex items-center gap-2 pt-1">
              {calib && <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + calibTone}>{calib}</span>}
              {result.pick && <span className="text-xs text-slate-400">you hired at {result.pick.confidence}% confidence</span>}
            </div>
          </div>
        </div>
        {report.headline && <p className="mt-4 text-base font-semibold text-ink">{report.headline}</p>}
        {report.question_quality?.note && <p className="mt-1 text-sm text-slate2">{report.question_quality.note}</p>}
      </div>

      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Who you should have hired</div>
        <div className="mt-3 space-y-3">
          {truth.map((c) => {
            const rev = revById[c.id] || {};
            const isPick = c.id === pickId;
            const isBest = c.id === bestId;
            const valPct = Math.round(100 * ((c.value - vMin) / vSpan));
            return (
              <div key={c.id} className={"rounded-xl border p-3 " + (isBest ? "border-sage bg-sage-soft/40" : isPick ? "border-ink" : "border-line")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">#{c.rank}</span>
                  <span className="text-sm font-semibold text-ink">{c.name}</span>
                  <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate2">{ARCH[c.archetype] || c.archetype}</span>
                  {isBest && <span className="rounded-full bg-sage px-2 py-0.5 text-[11px] font-semibold text-white">Best hire</span>}
                  {isPick && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">You hired</span>}
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Looked like <span className="font-semibold text-slate2">{Math.round(c.observedRating)}/100</span></span>
                      <span>·</span>
                      <span>Only <span className="font-semibold text-slate2">{Math.round(c.portableFraction * 100)}%</span> of it portable</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-mist"><div className={"h-2 rounded-full " + (isBest ? "bg-sage" : "bg-slate-400")} style={{ width: `${valPct}%` }} /></div>
                    <div className="mt-0.5 text-[11px] text-slate-400">true value to this role</div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-slate-500 sm:justify-end">
                    <span className="rounded bg-mist px-1.5 py-0.5">fit {c.matchEffect >= 0 ? "+" : ""}{c.matchEffect}</span>
                    <span className="rounded bg-mist px-1.5 py-0.5">firm-boost {c.firmEffect}</span>
                    <span className="rounded bg-mist px-1.5 py-0.5">risk {Math.round(c.tailRisk * 100)}%</span>
                    <span className="rounded bg-mist px-1.5 py-0.5">ask {c.wage}</span>
                  </div>
                </div>
                {rev.reveal && <p className="mt-2 text-sm text-ink">{rev.reveal}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {report.your_pick?.read && (
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your call</div>
          <p className="mt-1 text-sm text-ink">{report.your_pick.read}</p>
          {report.calibration_note && <p className="mt-2 text-sm text-slate2">{report.calibration_note}</p>}
        </div>
      )}

      {(report.best_question_missed || report.principle || result.principle) && (
        <div className="card space-y-3 p-5">
          {report.best_question_missed && (
            <div><div className="text-xs font-semibold text-red-600">The question you never asked</div><p className="mt-1 text-sm text-ink">{report.best_question_missed}</p></div>
          )}
          {(report.principle || result.principle) && (
            <p className="rounded-lg bg-mist px-3 py-2 text-sm text-ink"><span className="font-semibold">The principle:</span> {report.principle || result.principle}</p>
          )}
        </div>
      )}
      <p className="text-center text-xs text-slate-400">Star Hire · {scenario.firm.name}</p>
    </div>
  );
}
