"use client";

import { useState } from "react";

type Fingerprint = Record<string, number>;
type Precedent = { title: string; year?: number };
type Step = { round: number; gap: string; abstract: string; gain: number; fingerprint: Fingerprint; legit?: boolean; concern?: string; precedent?: Precedent[] };
type Bet = { id: number; headline: string; finalScore: number; gain: number; steps: Step[]; signature: Fingerprint; grounded?: string[] };
type Twin = { title: string; year?: number; score: number };
type Lever = { term: string; lift: number; examples: string[] };
type Grounding = { target: string; n: number; highMean: number; lowMean: number; levers: Lever[]; synthesis: { name: string; why: string }[]; topTwins: Twin[] };
type Headroom = { current: number; ceiling: number };
type Result = { target: string; goal?: number; baseline: Fingerprint; bets?: Bet[]; steps?: Step[]; grounding?: Grounding | null; headroom?: Headroom | null; stop: string };

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

      {/* twin grounding — real matched papers that made a similar move scored higher */}
      {bet.grounded && bet.grounded.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-sky/10 px-2 py-0.5 text-[11px] font-semibold text-sky">◆ Twin-grounded</span>
          <span className="text-[11px] text-slate-400">real higher-outcome twins share: <span className="font-medium text-slate2">{bet.grounded.join(", ")}</span></span>
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

function GroundingPanel({ g, target }: { g: Grounding; target: string }) {
  const [open, setOpen] = useState(false);
  const label = LABEL[target] || target;
  const levers = (g.levers || []).slice(0, 6);
  const synthesis = (g.synthesis || []).slice(0, 4);
  return (
    <div className="rounded-2xl border border-sky/30 bg-sky/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky">◆ Twin evidence</span>
        <span className="text-[11px] text-slate2">{g.n} real papers from this work's neighborhood</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">
        Among the paper's closest real twins, the higher-{label.toLowerCase()} group averages <span className="font-bold text-sage tabular-nums">{g.highMean}</span> vs <span className="font-bold text-slate-400 tabular-nums">{g.lowMean}</span> for the lower group. What separates them — from the real papers, not the model:
      </p>

      {/* empirically-observed levers (what high-outcome twins share) */}
      {(synthesis.length > 0 || levers.length > 0) && (
        <div className="mt-3 space-y-2">
          {synthesis.length > 0
            ? synthesis.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-sage">✓</span>
                  <div className="text-sm text-ink"><span className="font-semibold">{s.name}</span>{s.why ? <span className="text-slate2"> — {s.why}</span> : null}</div>
                </div>
              ))
            : (
              <div className="flex flex-wrap gap-1.5">
                {levers.map((lv) => <span key={lv.term} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-sky/20">{lv.term}</span>)}
              </div>
            )}
        </div>
      )}

      <button onClick={() => setOpen(!open)} className="mt-3 text-xs font-semibold text-sky hover:underline">{open ? "Hide the twins" : "See the higher-outcome twins & signals →"}</button>
      {open && (
        <div className="mt-3 space-y-3 border-t border-sky/20 pt-3">
          {g.topTwins?.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Higher-outcome twins</div>
              <ul className="space-y-1">
                {g.topTwins.map((t, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 text-slate-700">{t.title}{t.year ? <span className="text-slate-400"> ({t.year})</span> : null}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-sage">{t.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {levers.length > 0 && synthesis.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Distinguishing signals (data-driven)</div>
              <div className="flex flex-wrap gap-1.5">
                {levers.map((lv) => <span key={lv.term} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-sky/20" title={lv.examples.join(" · ")}>{lv.term}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
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
  // for the near-ceiling (0-bet) case: where the work stands on every measure, and
  // the other measure with the most headroom to redirect to.
  const allDims = Object.keys(base);
  const others = allDims.filter((d) => d !== target && typeof base[d] === "number");
  const roomiest = others.slice().sort((a, b) => (base[a] as number) - (base[b] as number))[0];

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
          {bets.length > 0
            ? <>{bets.length} distinct research bet{bets.length === 1 ? "" : "s"} <span className="text-sm font-medium text-slate-400">— from {LABEL[target] || target} {baseT} to as high as {best}</span></>
            : <>Already near the ceiling <span className="text-sm font-medium text-slate-400">— {LABEL[target] || target} {baseT}/100</span></>}
        </p>
        <div className="mt-1 text-sm text-slate-500">{STOP_NOTE[r.stop] || ""}</div>
        {bets.length > 0 && <p className="mt-2 text-xs text-slate2">A portfolio, not one path: each bet reaches the target through <span className="font-medium text-ink">genuinely different science</span>, with its own trade-offs. Diversify the wager.</p>}

        {/* AlphaZero value-to-go: the model's predicted reachable ceiling for this abstract */}
        {r.headroom && r.headroom.ceiling > r.headroom.current && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-mist px-3 py-2">
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Value-to-go</span>
            <span className="text-sm text-slate-600">Reachable ceiling <span className="font-bold text-ink tabular-nums">~{r.headroom.ceiling}</span> · untapped headroom <span className="font-bold text-sage tabular-nums">+{r.headroom.ceiling - r.headroom.current}</span></span>
            <span className="text-[11px] text-slate-400">— the model's estimate of how high this work can climb</span>
          </div>
        )}
      </div>

      {r.grounding && (r.grounding.levers?.length > 0 || r.grounding.synthesis?.length > 0) && <GroundingPanel g={r.grounding} target={target} />}

      {bets.length > 0 ? (
        <div className="space-y-3">
          {bets.map((b, i) => <BetCard key={b.id} bet={b} target={target} baseT={baseT} goal={r.goal} rank={i + 1} defaultOpen={i === 0} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-sm font-semibold text-ink">No added science moved {LABEL[target] || target} by more than +2.</div>
          <p className="mt-1 text-sm text-slate2">That's a finding, not a failure: on this measure the work is close to maxed, so there's little headroom to optimize. A very short abstract can also read as near-ceiling — a fuller one gives the search more to work with.</p>
          {others.length > 0 && (
            <>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Where it stands — pick a measure with more room</div>
              <div className="mt-2 space-y-1.5">
                {allDims.slice().sort((a, b) => (base[a] as number) - (base[b] as number)).map((d) => (
                  <div key={d} className="flex items-center gap-3">
                    <div className={"w-32 shrink-0 text-xs " + (d === target ? "font-semibold text-ink" : "text-slate2")}>{LABEL[d] || d}{d === target ? " ◄ maxed" : ""}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist"><div className={"h-full rounded-full " + (d === target ? "bg-slate-300" : "bg-sage")} style={{ width: `${Math.max(2, Math.min(100, base[d] as number))}%` }} /></div>
                    <div className="w-8 text-right text-xs font-semibold tabular-nums text-slate-500">{base[d]}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {roomiest && <p className="mt-3 text-sm text-slate2">Try optimizing <b className="text-ink">{LABEL[roomiest] || roomiest}</b> ({base[roomiest]}/100 — more room to climb), give a fuller abstract, or aim for a lower target.</p>}
        </div>
      )}

      {bets.length > 0 && <p className="text-xs text-slate-400">Predicted scores assume each step succeeds. The added science is hypothetical — a prioritization aid for where to take the work, not a promise. Watch each bet's "also moves" chips for the dimensions a path would cost you.</p>}
    </div>
  );
}
