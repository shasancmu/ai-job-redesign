"use client";

import { useState } from "react";

type Fingerprint = Record<string, number>;
type Precedent = { title: string; year?: number };
type Step = { round: number; gap: string; abstract: string; gain: number; fingerprint: Fingerprint; legit?: boolean; concern?: string; precedent?: Precedent[] };
type Bet = { id: number; headline: string; finalScore: number; gain: number; steps: Step[]; signature: Fingerprint };
type Result = { target: string; goal?: number; baseline: Fingerprint; bets?: Bet[]; steps?: Step[]; stop: string };

const LABEL: Record<string, string> = {
  commercial: "Commercial", scientific: "Scientific", social: "Social",
  complex_invention: "Complex", interdisciplinary: "Interdisc", defense: "Defense",
};
const STOP_NOTE: Record<string, string> = {
  reached: "Goal reached — at least one path closed the return-to-go.",
  plateau: "Stopped short of the goal: the frontier stalled (next step < +2).",
  ceiling: "Stopped: the target hit the model's practical ceiling.",
  maxRounds: "Stopped: reached the round cap before the goal.",
  "no-improvement": "Stopped: no scorable next step was found.",
};

// Fall back gracefully for results saved before the portfolio existed (single chain).
function toBets(r: Result): Bet[] {
  if (Array.isArray(r.bets) && r.bets.length) return r.bets;
  const steps = r.steps || [];
  if (!steps.length) return [];
  const finalFp = steps[steps.length - 1].fingerprint || {};
  const base = r.baseline || {};
  const signature: Fingerprint = {};
  for (const d of Object.keys(base)) signature[d] = (finalFp[d] ?? base[d]) - (base[d] ?? 0);
  const finalScore = finalFp[r.target] ?? 0;
  const baseT = base[r.target] ?? 0;
  const headline = steps.reduce((a, b) => (b.gain > a.gain ? b : a)).gap;
  return [{ id: 1, headline, finalScore, gain: finalScore - baseT, steps, signature }];
}

function BetCard({ bet, target, baseT, goal, rank, defaultOpen }: { bet: Bet; target: string; baseT: number; goal?: number; rank: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  // trade-off signature: other dimensions this bet moves, biggest first
  const sig = Object.entries(bet.signature || {})
    .filter(([d, v]) => d !== target && Math.abs(v) >= 3)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const pct = goal && goal > baseT ? Math.max(0, Math.min(100, ((bet.finalScore - baseT) / (goal - baseT)) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex h-6 shrink-0 items-center rounded-full bg-ink px-2 text-[11px] font-bold uppercase tracking-wide text-white">Bet {rank}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-snug text-ink">{bet.headline || "A distinct research path"}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">{bet.steps.length} step{bet.steps.length === 1 ? "" : "s"} of missing science</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-bold tabular-nums text-ink">{bet.finalScore}<span className="text-xs text-slate-400">/100</span></div>
          <div className="text-xs font-semibold text-sage">+{bet.gain}</div>
        </div>
      </div>

      {goal && goal > baseT && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} /></div>
      )}

      {/* trade-off signature — what else this bet moves */}
      {sig.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Also moves</span>
          {sig.map(([d, v]) => (
            <span key={d} className={"rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums " + (v > 0 ? "bg-sage/10 text-sage" : "bg-clay-soft text-clay")}>
              {LABEL[d] || d} {v > 0 ? "+" : ""}{v}
            </span>
          ))}
        </div>
      )}

      <button onClick={() => setOpen(!open)} className="mt-2.5 text-xs font-semibold text-ai hover:underline">{open ? "Hide the path" : "See the missing science, in sequence →"}</button>

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-line-soft pt-3">
          {bet.steps.map((s, i) => <StepRow key={i} step={s} target={target} />)}
        </div>
      )}
    </div>
  );
}

function StepRow({ step: s, target }: { step: Step; target: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mist text-[11px] font-bold text-slate-600">{s.round}</span>
          <div className="text-sm text-ink">{s.gap}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold tabular-nums text-ink">{s.fingerprint[target] ?? "—"}</div>
          <div className="text-[11px] font-semibold text-sage">+{s.gain}</div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7">
        {s.legit === false
          ? <span className="rounded-full bg-clay-soft px-2 py-0.5 text-[11px] font-semibold text-clay">⚠ Check: {s.concern || "may inflate framing over substance"}</span>
          : <span className="rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage">✓ Plausible science</span>}
        {s.precedent && s.precedent.length > 0
          ? <span className="text-[11px] text-slate-400"><span className="font-semibold text-slate2">Precedent:</span> {s.precedent.slice(0, 2).map((p) => p.title).join(" · ")}</span>
          : <span className="text-[11px] text-slate-400">No direct precedent — novel, or worth checking</span>}
      </div>
      <button onClick={() => setShow(!show)} className="mt-1.5 pl-7 text-[11px] font-medium text-sky hover:underline">{show ? "Hide abstract" : "Abstract at this step →"}</button>
      {show && <p className="mt-1.5 ml-7 rounded-lg bg-mist p-3 text-sm leading-relaxed text-slate-700">{s.abstract}</p>}
    </div>
  );
}

export default function ImpactOptimizerReport({ result }: { result: Result }) {
  const r = result || ({} as Result);
  const target = r.target;
  const base = r.baseline || {};
  const baseT = base[target] ?? 0;
  const bets = toBets(r);
  const best = bets.length ? Math.max(...bets.map((b) => b.finalScore)) : baseT;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Target: {LABEL[target] || target} potential</div>
          {typeof r.goal === "number" && (
            <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (r.stop === "reached" ? "bg-sage/10 text-sage" : "bg-mist text-slate2")}>
              {r.stop === "reached" ? "✓ " : ""}Goal {r.goal}/100{r.stop === "reached" ? " reached" : " (aimed)"}
            </span>
          )}
        </div>
        <p className="mt-1 text-lg font-bold leading-snug text-ink">
          {bets.length} distinct research bet{bets.length === 1 ? "" : "s"} <span className="text-sm font-medium text-slate-400">— from {LABEL[target] || target} {baseT} to as high as {best}</span>
        </p>
        <div className="mt-1 text-sm text-slate-500">{STOP_NOTE[r.stop] || ""}</div>
        <p className="mt-2 text-xs text-slate2">A portfolio, not one path: each bet reaches the target through <span className="font-medium text-ink">genuinely different science</span>, with its own trade-offs. Diversify the wager.</p>
      </div>

      {bets.length > 0 ? (
        <div className="space-y-3">
          {bets.map((b, i) => <BetCard key={b.id} bet={b} target={target} baseT={baseT} goal={r.goal} rank={i + 1} defaultOpen={i === 0} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-slate2">No meaningful next step raised the target — the work already scores near the ceiling here.</div>
      )}

      <p className="text-xs text-slate-400">Predicted scores assume each step succeeds. The added science is hypothetical — a prioritization aid for where to take the work, not a promise. Watch each bet's "also moves" chips for the dimensions a path would cost you.</p>
    </div>
  );
}
