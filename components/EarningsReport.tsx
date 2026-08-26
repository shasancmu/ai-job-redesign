"use client";

type Value = "high" | "med" | "low" | "none";
type QItem = { text: string; value: Value; note: string };
type MapItem = { probe: string; value: Exclude<Value, "none">; asked: boolean };
export type EarningsReportData = {
  score: number;
  verdict_correct: boolean;
  calibration: string;
  calibration_note: string;
  questions: QItem[];
  info_map: MapItem[];
  best_miss: string;
  the_tell: string;
  naive_ai: string;
  principle: string;
};

const CALL_LABEL: Record<string, string> = { stuffing: "Channel stuffing", clean: "Clean quarter", cant_tell: "Can't tell yet" };

const VAL_META: Record<Value, { label: string; cls: string; bar: string }> = {
  high: { label: "High signal", cls: "bg-sage text-white", bar: "bg-sage" },
  med: { label: "Some signal", cls: "bg-amber text-white", bar: "bg-amber" },
  low: { label: "Low signal", cls: "bg-slate-200 text-slate-600", bar: "bg-slate-300" },
  none: { label: "No signal", cls: "bg-slate-100 text-slate-400", bar: "bg-slate-200" },
};

function ValuePill({ v }: { v: Value }) {
  const m = VAL_META[v] || VAL_META.none;
  return <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " + m.cls}>{m.label}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function EarningsReport({ report, verdict }: { report: EarningsReportData; verdict?: { call?: string; confidence?: number } }) {
  const score = Math.max(0, Math.min(100, Number(report.score) || 0));
  const scoreColor = score >= 75 ? "#3F7A52" : score >= 50 ? "#CE8F2C" : "#B4532E";
  const calGood = report.calibration === "well-calibrated";

  return (
    <div className="space-y-5">
      {/* Verdict + score */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnostic score</div>
            <div className="mt-1 text-5xl font-bold tabular-nums" style={{ color: scoreColor }}>{score}<span className="text-2xl text-slate-400">/100</span></div>
            <div className="mt-1 text-xs text-slate-500">how much your questions revealed</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={"rounded-full px-3 py-1 text-sm font-semibold " + (report.verdict_correct ? "bg-sage text-white" : "bg-clay text-white")}>
              {report.verdict_correct ? "✓ Right call" : "✗ Wrong call"}
            </span>
            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (calGood ? "bg-sage/15 text-sage" : "bg-amber/15 text-amber")}>
              {report.calibration}
            </span>
          </div>
        </div>
        {verdict?.call && (
          <div className="mt-3 text-sm text-slate-600">Your verdict: <b className="text-ink">{CALL_LABEL[verdict.call] || verdict.call}</b>{typeof verdict.confidence === "number" ? `, ${verdict.confidence}% confident` : ""}.</div>
        )}
        {report.calibration_note && <p className="mt-1 text-sm leading-relaxed text-slate-600">{report.calibration_note}</p>}
      </div>

      {/* Your question trail */}
      <Section title="Your questions, scored">
        <div className="space-y-3">
          {(report.questions || []).map((q, i) => {
            const m = VAL_META[q.value] || VAL_META.none;
            return (
              <div key={i} className="flex gap-3">
                <div className={"mt-1 h-full w-1 shrink-0 rounded-full " + m.bar} style={{ minHeight: 34 }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-ink">{q.text}</div>
                    <ValuePill v={q.value} />
                  </div>
                  {q.note && <div className="mt-0.5 text-xs leading-snug text-slate-500">{q.note}</div>}
                </div>
              </div>
            );
          })}
          {!(report.questions || []).length && <div className="text-sm text-slate-400">You didn't ask any questions.</div>}
        </div>
      </Section>

      {/* Information map */}
      <Section title="The information map">
        <p className="text-sm text-slate-500">Every cut that mattered this quarter, ranked by how much it would have moved you. Checked cuts are the ones you probed.</p>
        <div className="mt-3 space-y-1.5">
          {(report.info_map || []).map((it, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-line/60 pb-1.5 text-sm">
              <span className={"w-5 shrink-0 text-center " + (it.asked ? "text-sage" : "text-slate-300")}>{it.asked ? "✓" : "○"}</span>
              <span className={"flex-1 " + (it.asked ? "text-ink" : "text-slate-500")}>{it.probe}</span>
              <ValuePill v={it.value} />
            </div>
          ))}
        </div>
        {report.best_miss && (
          <div className="mt-4 rounded-xl bg-clay-soft p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-clay">Your highest-value miss</div>
            <p className="mt-1 text-sm leading-relaxed text-ink">{report.best_miss}</p>
          </div>
        )}
      </Section>

      {/* The tell */}
      <Section title="The tell, this time">
        <p className="text-sm leading-relaxed text-slate-700">{report.the_tell}</p>
      </Section>

      {/* You vs the naive AI */}
      <Section title="You vs. a naive AI">
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Asked to judge the quarter cold, a general AI said</div>
          <p className="mt-1 text-sm italic leading-relaxed text-slate-600">"{report.naive_ai}"</p>
          <div className="mt-2 text-sm font-semibold" style={{ color: report.verdict_correct ? "#3F7A52" : "#B4532E" }}>
            {report.verdict_correct ? "It was wrong. You weren't. It had every number you had; it just didn't know what to ask." : "It was wrong too. The edge is in the questions, and this time neither of you found it."}
          </div>
        </div>
      </Section>

      {/* Principle */}
      <div className="rounded-2xl bg-ink p-5 text-white">
        <div className="text-xs font-semibold uppercase tracking-wide text-white/50">The transferable skill</div>
        <p className="mt-1 text-sm leading-relaxed text-white/90">{report.principle}</p>
      </div>
    </div>
  );
}
