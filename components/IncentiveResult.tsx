"use client";

import type { ObservableScenario } from "@/lib/incentive/types";

const KIND: Record<string, { label: string; cls: string }> = {
  productive: { label: "productive", cls: "bg-sage-soft text-sage" },
  gaming: { label: "gaming", cls: "bg-amber/20 text-amber-700" },
  harmful: { label: "harmful", cls: "bg-red-100 text-red-700" },
  unmeasured_good: { label: "unrewarded value", cls: "bg-slate-200 text-slate2" },
};
const DISP: Record<string, string> = { honest_pro: "The honest pro", opportunist: "The opportunist", cynic: "The cynic", solver: "The ruthless optimizer" };

function Bar({ value, tone }: { value: number; tone: string }) {
  return <div className="h-2 rounded-full bg-mist"><div className={"h-2 rounded-full " + tone} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export default function IncentiveResult({ result, scenario, par }: { result: any; scenario: ObservableScenario; par?: { optimum: number; best: number } }) {
  const pct = result.pctOfOptimum ?? 0;
  const color = pct >= 80 ? "text-sage" : pct >= 50 ? "text-amber-600" : "text-red-600";
  const n = result.narrate || {};

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <div className={"text-5xl font-bold tabular-nums " + color}>{pct}%</div>
            <div className="text-xs uppercase tracking-wide text-slate-400">of achievable value</div>
          </div>
          <div className="flex-1 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate2">
              <span>Worker pay earned: <span className="font-semibold text-ink">{result.reward}/100</span></span>
              <span>True value delivered: <span className="font-semibold text-ink">{result.trueValue}/100</span></span>
              {result.reward - result.trueValue > 8 && <span className="font-semibold text-amber-700">gaming gap: {result.reward - result.trueValue}</span>}
            </div>
            {n.headline && <p className="mt-2 text-base font-semibold text-ink">{n.headline}</p>}
          </div>
        </div>
      </div>

      {/* the killer contrast */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">What the manager sees</div>
          <div className="mt-2 space-y-2">
            {result.dashboard.map((m: any) => (
              <div key={m.key}><div className="flex justify-between text-xs text-slate2"><span>{m.label}</span><span className="tabular-nums">{m.value}</span></div><Bar value={m.value} tone="bg-sage" /></div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">The dashboard the incentive rewards.</p>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-red-600">What actually happened</div>
          <div className="mt-2 space-y-2">
            {result.dims.map((d: any) => (
              <div key={d.key}><div className="flex justify-between text-xs text-slate2"><span>{d.label} <span className="text-slate-400">· {Math.round(d.weight * 100)}% of value</span></span><span className="tabular-nums">{d.outcome}</span></div><Bar value={d.outcome} tone={d.outcome < 40 ? "bg-red-500" : d.outcome < 70 ? "bg-amber-500" : "bg-sage"} /></div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">What the firm truly wanted.</p>
        </div>
      </div>

      {(n.exploit_story || n.what_broke) && (
        <div className="card space-y-2 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">How they gamed it</div>
          {n.exploit_story && <p className="text-sm text-ink">{n.exploit_story}</p>}
          {n.what_broke && <p className="text-sm text-red-700">{n.what_broke}</p>}
        </div>
      )}

      {/* tournament leaderboard */}
      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The self-play tournament</div>
        <div className="mt-2 space-y-2">
          {result.proposals.map((p: any, i: number) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line/60 pb-2 text-sm">
              <span className="w-32 shrink-0 font-semibold text-ink">{DISP[p.disposition] || p.disposition}</span>
              <span className="flex-1 text-slate2">&ldquo;{p.tactic}&rdquo; <span className="text-slate-400">— {p.actions}</span></span>
              <span className="tabular-nums text-slate-500">pay {p.reward} · value {p.trueValue}</span>
            </div>
          ))}
        </div>
      </div>

      {/* the reveal: what each action really did */}
      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">What each action really did</div>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead><tr className="border-b border-line text-left text-slate2"><th className="py-1 pr-3">Action</th><th className="py-1 pr-3">Kind</th><th className="py-1 pr-3">Used</th><th className="py-1">True-value effect</th></tr></thead>
            <tbody>
              {result.reveal.map((a: any) => {
                const veff = Object.entries(a.valueEffect || {}).filter(([, v]) => Math.abs(v as number) >= 5).map(([k, v]) => `${(v as number) > 0 ? "+" : ""}${Math.round(v as number)} ${k.replace(/_/g, " ")}`).join(", ");
                return (
                  <tr key={a.key} className="border-b border-line/50">
                    <td className="py-1.5 pr-3 text-ink">{a.label}</td>
                    <td className="py-1.5 pr-3"><span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (KIND[a.kind]?.cls || "bg-mist")}>{KIND[a.kind]?.label || a.kind}</span></td>
                    <td className="py-1.5 pr-3 tabular-nums text-slate2">{a.usedByWinner}%</td>
                    <td className="py-1.5 text-slate-500">{veff || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(n.missing_lever || n.coach || n.principle) && (
        <div className="card space-y-3 p-5">
          {n.missing_lever && <div><div className="text-xs font-semibold text-sage">The lever you're missing</div><p className="mt-1 text-sm text-ink">{n.missing_lever}</p></div>}
          {n.coach && <div><div className="text-xs font-semibold text-slate2">For your redesign</div><p className="mt-1 text-sm text-ink">{n.coach}</p></div>}
          {n.principle && <p className="rounded-lg bg-mist px-3 py-2 text-sm text-ink"><span className="font-semibold">The principle:</span> {n.principle}</p>}
        </div>
      )}
      <p className="text-center text-xs text-slate-400">The Incentive Lab · {scenario.firm.name}{par ? ` · a great design reaches ~${par.optimum}/100 true value` : ""}</p>
    </div>
  );
}
