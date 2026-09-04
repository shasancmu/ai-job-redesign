"use client";

import type { GradeBreakdown } from "@/lib/regsim/grade";

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate2"><span>{label}</span><span className="tabular-nums">{value}</span></div>
      <div className="mt-1 h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-sage" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}

export default function RegressionResult({ grade, feedback, context }: { grade: GradeBreakdown; feedback: any; context?: string }) {
  const scoreColor = grade.score >= 85 ? "text-sage" : grade.score >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <div className={"text-5xl font-bold tabular-nums " + scoreColor}>{grade.score}</div>
            <div className="text-xs uppercase tracking-wide text-slate-400">out of 100</div>
          </div>
          <div className="min-w-[220px] flex-1 space-y-2">
            <Bar label="Structure (right terms found)" value={grade.structure} />
            <Bar label="Signs correct" value={grade.signs} />
            <Bar label="Parsimony (no junk)" value={grade.parsimony} />
          </div>
        </div>
        {grade.error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Your formula couldn&apos;t be parsed: {grade.error}</div>}
      </div>

      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The true model</div>
        <div className="mt-1 font-mono text-sm text-ink">{grade.trueModel}</div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your model</div>
        <div className="mt-1 font-mono text-sm text-slate2">{grade.studentModel}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Recovered ✓</div>
          <ul className="mt-2 space-y-1 font-mono text-[13px] text-ink">{grade.correct.length ? grade.correct.map((c) => <li key={c}>{c}</li>) : <li className="text-slate-400">none</li>}</ul>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Missed</div>
          <ul className="mt-2 space-y-1 font-mono text-[13px] text-ink">{grade.missed.length ? grade.missed.map((c) => <li key={c}>{c}</li>) : <li className="text-slate-400">none</li>}</ul>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Shouldn&apos;t be there</div>
          <ul className="mt-2 space-y-1.5 text-[13px] text-ink">{grade.extra.length ? grade.extra.map((e) => <li key={e.label}><span className="font-mono">{e.label}</span> <span className="text-xs text-slate-400">— {e.why}</span></li>) : <li className="text-slate-400">none</li>}</ul>
        </div>
      </div>

      {feedback && (
        <div className="card space-y-3 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Instructor feedback</div>
          {feedback.headline && <p className="text-base font-semibold text-ink">{feedback.headline}</p>}
          {Array.isArray(feedback.strengths) && feedback.strengths.length > 0 && (
            <div><div className="text-xs font-semibold text-sage">What worked</div><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">{feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
          {Array.isArray(feedback.gaps) && feedback.gaps.length > 0 && (
            <div><div className="text-xs font-semibold text-red-600">What you missed</div><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">{feedback.gaps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
          {Array.isArray(feedback.process_tips) && feedback.process_tips.length > 0 && (
            <div><div className="text-xs font-semibold text-slate2">Next time, try</div><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">{feedback.process_tips.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
          {feedback.one_thing && <p className="rounded-lg bg-mist px-3 py-2 text-sm text-ink"><span className="font-semibold">The one thing:</span> {feedback.one_thing}</p>}
        </div>
      )}
      {context && <p className="text-center text-xs text-slate-400">Regression Detective · {context}</p>}
    </div>
  );
}
