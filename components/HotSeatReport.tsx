"use client";

type Flag = { severity: "false" | "misleading" | "overshare" | "stonewall"; quote: string; note: string };
type Moment = { quote: string; note: string };
export type HotSeatReportData = {
  survived: boolean;
  headline: string;
  legal_risk: "low" | "medium" | "high";
  truthfulness: number;
  poise: number;
  flags: Flag[];
  best_moment: Moment;
  worst_moment: Moment;
  analyst_read: string;
  coaching: string;
  principle: string;
};

const RISK_META: Record<string, { label: string; cls: string }> = {
  low: { label: "Low legal risk", cls: "bg-sage text-white" },
  medium: { label: "Some legal risk", cls: "bg-amber text-white" },
  high: { label: "High legal risk", cls: "bg-clay text-white" },
};

const FLAG_META: Record<Flag["severity"], { label: string; cls: string }> = {
  false: { label: "False statement", cls: "border-clay bg-clay-soft" },
  misleading: { label: "Materially misleading", cls: "border-clay bg-clay-soft" },
  overshare: { label: "Overshared", cls: "border-amber bg-amber-soft" },
  stonewall: { label: "Stonewalled", cls: "border-amber bg-amber-soft" },
};

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color = v >= 75 ? "#3F7A52" : v >= 50 ? "#CE8F2C" : "#B4532E";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-lg font-bold tabular-nums" style={{ color }}>{v}</div>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full" style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function HotSeatReport({ report }: { report: HotSeatReportData }) {
  const risk = RISK_META[report.legal_risk] || RISK_META.medium;
  return (
    <div className="space-y-5">
      {/* Verdict */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={"rounded-full px-3 py-1 text-sm font-semibold " + (report.survived ? "bg-sage text-white" : "bg-clay text-white")}>
            {report.survived ? "✓ You held the line" : "✗ You did not survive this cleanly"}
          </span>
          <span className={"rounded-full px-3 py-1 text-xs font-semibold " + risk.cls}>{risk.label}</span>
        </div>
        <p className="mt-3 text-lg font-bold leading-snug text-ink">{report.headline}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Bar label="Truthful & not misleading" value={report.truthfulness} />
          <Bar label="Poise & credibility" value={report.poise} />
        </div>
      </div>

      {/* Flags */}
      <Section title="Every statement worth flagging">
        {(report.flags || []).length ? (
          <div className="space-y-2.5">
            {(report.flags || []).map((f, i) => {
              const m = FLAG_META[f.severity] || FLAG_META.overshare;
              return (
                <div key={i} className={"rounded-xl border-l-4 p-3 " + m.cls}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink">{m.label}</div>
                  <p className="mt-1 text-sm italic text-slate-700">"{f.quote}"</p>
                  <p className="mt-1 text-xs leading-snug text-slate-600">{f.note}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nothing false or misleading, and no needless self-inflicted wounds. A clean call.</p>
        )}
      </Section>

      {/* Best / worst */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Your best moment">
          {report.best_moment?.quote ? (
            <>
              <p className="text-sm italic text-slate-700">"{report.best_moment.quote}"</p>
              <p className="mt-1.5 text-xs leading-snug text-sage">{report.best_moment.note}</p>
            </>
          ) : <p className="text-sm text-slate-400">Nothing stood out.</p>}
        </Section>
        <Section title="Your riskiest moment">
          {report.worst_moment?.quote ? (
            <>
              <p className="text-sm italic text-slate-700">"{report.worst_moment.quote}"</p>
              <p className="mt-1.5 text-xs leading-snug text-clay">{report.worst_moment.note}</p>
            </>
          ) : <p className="text-sm text-slate-400">Nothing stood out.</p>}
        </Section>
      </div>

      {/* Analyst read */}
      <Section title="How the analyst left the call">
        <p className="text-sm leading-relaxed text-slate-700">{report.analyst_read}</p>
      </Section>

      {/* Coaching */}
      <Section title="How a skilled CEO would have played the hardest moment">
        <p className="text-sm leading-relaxed text-slate-700">{report.coaching}</p>
      </Section>

      {/* Principle */}
      <div className="rounded-2xl bg-ink p-5 text-white">
        <div className="text-xs font-semibold uppercase tracking-wide text-white/50">The transferable skill</div>
        <p className="mt-1 text-sm leading-relaxed text-white/90">{report.principle}</p>
      </div>
    </div>
  );
}
