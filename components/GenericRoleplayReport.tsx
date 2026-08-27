"use client";

// Renders a role-play grade from the rubric-shaped JSON, laid out by the spec's
// report[] blocks. Handles the block types the Earnings-Call rubric uses; unknown
// keys degrade to a labeled text block.
const VAL: Record<string, { label: string; cls: string; bar: string }> = {
  high: { label: "High signal", cls: "bg-sage text-white", bar: "bg-sage" },
  med: { label: "Some signal", cls: "bg-amber text-white", bar: "bg-amber" },
  low: { label: "Low signal", cls: "bg-slate-200 text-slate-600", bar: "bg-slate-300" },
  none: { label: "No signal", cls: "bg-slate-100 text-slate-400", bar: "bg-slate-200" },
};
function Pill({ v }: { v: string }) { const m = VAL[v] || VAL.none; return <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " + m.cls}>{m.label}</span>; }

export default function GenericRoleplayReport({ report, blocks }: { report: any; blocks: { type: string; source: string; title?: string }[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        const v = report[b.source];
        if (b.type === "verdictLine") {
          const score = Math.max(0, Math.min(100, Number(report.score) || 0));
          const color = score >= 75 ? "#3F7A52" : score >= 50 ? "#CE8F2C" : "#B4532E";
          const ok = !!report.verdict_correct;
          return (
            <div key={i} className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Score</div><div className="mt-1 text-5xl font-bold tabular-nums" style={{ color }}>{score}<span className="text-2xl text-slate-400">/100</span></div></div>
                <div className="flex flex-col items-end gap-2">
                  <span className={"rounded-full px-3 py-1 text-sm font-semibold " + (ok ? "bg-sage text-white" : "bg-clay text-white")}>{ok ? "✓ Right call" : "✗ Wrong call"}</span>
                  {report.calibration && <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate-600">{report.calibration}</span>}
                </div>
              </div>
              {report.calibration_note && <p className="mt-2 text-sm leading-relaxed text-slate-600">{report.calibration_note}</p>}
            </div>
          );
        }
        if (b.type === "trail" && Array.isArray(v)) {
          return (
            <Section key={i} title={b.title}>
              <div className="space-y-3">{v.map((q: any, j: number) => { const m = VAL[q.value] || VAL.none; return (
                <div key={j} className="flex gap-3"><div className={"mt-1 w-1 shrink-0 rounded-full " + m.bar} style={{ minHeight: 34 }} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="text-sm font-medium text-ink">{q.text}</div><Pill v={q.value} /></div>{q.note && <div className="mt-0.5 text-xs leading-snug text-slate-500">{q.note}</div>}</div></div>
              ); })}</div>
            </Section>
          );
        }
        if (b.type === "map" && Array.isArray(v)) {
          return (
            <Section key={i} title={b.title}>
              <div className="space-y-1.5">{v.map((it: any, j: number) => (
                <div key={j} className="flex items-center gap-2 border-b border-line/60 pb-1.5 text-sm"><span className={"w-5 shrink-0 text-center " + (it.asked ? "text-sage" : "text-slate-300")}>{it.asked ? "✓" : "○"}</span><span className={"flex-1 " + (it.asked ? "text-ink" : "text-slate-500")}>{it.probe}</span><Pill v={it.value} /></div>
              ))}</div>
              {report.best_miss && <div className="mt-4 rounded-xl bg-clay-soft p-4"><div className="text-xs font-semibold uppercase tracking-wide text-clay">Your highest-value miss</div><p className="mt-1 text-sm leading-relaxed text-ink">{report.best_miss}</p></div>}
            </Section>
          );
        }
        if (b.type === "quote") {
          return (
            <Section key={i} title={b.title}>
              <div className="rounded-xl border border-line bg-white p-4"><p className="text-sm italic leading-relaxed text-slate-600">"{v}"</p><div className="mt-2 text-sm font-semibold" style={{ color: report.verdict_correct ? "#3F7A52" : "#B4532E" }}>{report.verdict_correct ? "It was wrong. You weren't." : "It was wrong too — the edge is in the questions."}</div></div>
            </Section>
          );
        }
        if (b.type === "principle") {
          return <div key={i} className="rounded-2xl bg-ink p-5 text-white"><div className="text-xs font-semibold uppercase tracking-wide text-white/50">The transferable skill</div><p className="mt-1 text-sm leading-relaxed text-white/90">{v}</p></div>;
        }
        // section + fallback
        return <Section key={i} title={b.title}><p className="text-sm leading-relaxed text-slate-700">{typeof v === "string" ? v : JSON.stringify(v)}</p></Section>;
      })}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return <section className="card p-5">{title && <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>}<div className={title ? "mt-3" : ""}>{children}</div></section>;
}
