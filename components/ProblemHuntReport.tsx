"use client";

import { HUNT_SCORE_KEYS, type HuntMode } from "@/lib/problemhunt";

type Src = { title: string; url: string };

function bar(n: number) { return Math.max(0, Math.min(5, Number(n) || 0)); }

// The graded Problem Hunt report — shared by the typed room and the voice room.
export default function ProblemHuntReport({ mode, report }: { mode: HuntMode; report: any }) {
  const keys = HUNT_SCORE_KEYS[mode];
  const ev = report.evidence || {};
  const evColor = ev.verdict === "strong" ? "text-sage" : ev.verdict === "weak" ? "text-clay" : "text-amber";
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">The verdict</div>
        <p className="mt-1 text-lg font-semibold leading-snug text-ink">{report.verdict}</p>
      </div>

      {mode === "seller" ? (
        <div className="card space-y-2 p-5 text-sm">
          <Row label="Problem" v={report.problem} strong />
          <Row label="Who has it" v={report.whoHasIt} />
          <Row label="Why now" v={report.whyNow} />
          <Row label="Your edge" v={report.yourEdge} />
          <Row label="Value at stake" v={report.sizing} />
          <Row label="Repeatable?" v={report.repeatable} />
          <Row label="Will they buy?" v={report.willBuy} />
          <Row label="Cheapest kill test" v={report.killTest} strong />
        </div>
      ) : (
        <div className="card p-5">
          {report.context && <p className="mb-3 text-sm text-slate-500">{report.context}</p>}
          <div className="space-y-3">
            {(report.opportunities || []).map((o: any, i: number) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{i + 1}. {o.name}</span>
                  {o.blindSpot && <span className="rounded-full bg-sky-soft/60 px-2 py-0.5 text-[10px] font-semibold text-slate-600">blind spot</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{o.whereValueLeaks}</p>
                {o.rootCause && <p className="mt-1 text-xs text-slate-500"><b className="text-slate-600">Root cause:</b> {o.rootCause}</p>}
                <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                  <div><b className="text-slate-600">Value:</b> {o.expectedValue}</div>
                  <div><b className="text-slate-600">Odds:</b> {o.probability}</div>
                  <div><b className="text-slate-600">Needs:</b> {o.resources}</div>
                  <div><b className="text-slate-600">Stop to fund:</b> {o.stopToFund}</div>
                </div>
                {o.killTest && <p className="mt-2 rounded-lg bg-mist px-2.5 py-1.5 text-xs text-slate-600"><b className="text-ink">Cheapest test:</b> {o.killTest}</p>}
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Pursue first" v={report.topPick} strong />
            <Row label="Cheapest test" v={report.killTest} />
            <Row label="Turn it into an experiment" v={report.handoff} />
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">Reality check</div>
          <span className={"text-xs font-bold uppercase " + evColor}>{ev.verdict || "n/a"}</span>
        </div>
        {ev.note && <p className="mt-1 text-sm text-slate-600">{ev.note}</p>}
        {Array.isArray(ev.sources) && ev.sources.length > 0 && (
          <ul className="mt-2 space-y-1">
            {ev.sources.map((s: Src, i: number) => (
              <li key={i} className="text-sm"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ai underline">{s.title}</a></li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">How the problem scores</div>
        <div className="space-y-1.5">
          {keys.map((k) => (
            <div key={k.key} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-xs text-slate-600">{k.label}</div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className={"h-2 w-6 rounded-full " + (j < bar(report.scores?.[k.key]) ? "bg-ink" : "bg-slate-200")} />
                ))}
              </div>
              <div className="w-8 text-right text-xs tabular-nums text-slate-500">{bar(report.scores?.[k.key])}/5</div>
            </div>
          ))}
        </div>
        {Array.isArray(report.gaps) && report.gaps.length > 0 && (
          <div className="mt-3 rounded-lg bg-mist px-3 py-2 text-sm text-slate-600">
            <b className="text-ink">Shore up:</b>
            <ul className="mt-1 list-disc pl-5">{report.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, v, strong }: { label: string; v?: string; strong?: boolean }) {
  if (!v) return null;
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <p className={"mt-0.5 " + (strong ? "font-semibold text-ink" : "text-slate-700")}>{v}</p>
    </div>
  );
}
