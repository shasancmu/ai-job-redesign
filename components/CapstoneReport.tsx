"use client";

type Flag = { severity: "fraud" | "risky" | "tell"; quote: string; note: string };
type Reck = { when: string; event: string };
export type CapstoneReportData = {
  headline: string;
  hit_target: boolean;
  indicted: boolean;
  market_verdict: "clean" | "suspected" | "caught";
  scores: { mosaic: number; detection_evasion: number; value_preservation: number; judgment: number };
  analyst_read: string;
  flags: Flag[];
  reckoning: Reck[];
  value_destroyed_note: string;
  principle: string;
};

const MARKET: Record<string, { label: string; cls: string }> = {
  clean: { label: "The beat looked real", cls: "bg-sage text-white" },
  suspected: { label: "The analyst smelled something", cls: "bg-amber text-white" },
  caught: { label: "The management was exposed", cls: "bg-clay text-white" },
};

const FLAG: Record<Flag["severity"], { label: string; cls: string }> = {
  fraud: { label: "Fraud", cls: "border-clay bg-clay-soft" },
  risky: { label: "Risky", cls: "border-amber bg-amber-soft" },
  tell: { label: "Left a tell", cls: "border-amber bg-amber-soft" },
};

const SCORE_LABEL: Record<string, string> = {
  mosaic: "Read the data mosaic",
  detection_evasion: "Evaded detection",
  value_preservation: "Preserved long-term value",
  judgment: "Judgment under pressure",
};

function Bar({ k, v }: { k: string; v: number }) {
  const val = Math.max(0, Math.min(100, Number(v) || 0));
  const color = val >= 75 ? "#3F7A52" : val >= 50 ? "#CE8F2C" : "#B4532E";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold text-slate-500">{SCORE_LABEL[k] || k}</div>
        <div className="text-base font-bold tabular-nums" style={{ color }}>{val}</div>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full" style={{ width: `${val}%`, background: color }} /></div>
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

export default function CapstoneReport({ report }: { report: CapstoneReportData }) {
  const market = MARKET[report.market_verdict] || MARKET.suspected;
  return (
    <div className="space-y-5">
      {report.indicted && (
        <div className="rounded-2xl bg-clay p-5 text-center text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Indicted</div>
          <p className="mt-1 text-lg font-bold">You crossed the line into fraud. The quarter does not matter now.</p>
        </div>
      )}

      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={"rounded-full px-3 py-1 text-sm font-semibold " + (report.hit_target ? "bg-sage text-white" : "bg-clay text-white")}>{report.hit_target ? "✓ Hit consensus" : "✗ Missed the number"}</span>
          <span className={"rounded-full px-3 py-1 text-xs font-semibold " + market.cls}>{market.label}</span>
        </div>
        <p className="mt-3 text-lg font-bold leading-snug text-ink">{report.headline}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["mosaic", "detection_evasion", "value_preservation", "judgment"] as const).map((k) => (
            <Bar key={k} k={k} v={report.scores?.[k] ?? 0} />
          ))}
        </div>
      </div>

      {(report.flags || []).length > 0 && (
        <Section title="Flagged choices and answers">
          <div className="space-y-2.5">
            {report.flags.map((f, i) => {
              const m = FLAG[f.severity] || FLAG.risky;
              return (
                <div key={i} className={"rounded-xl border-l-4 p-3 " + m.cls}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink">{m.label}</div>
                  <p className="mt-1 text-sm italic text-slate-700">"{f.quote}"</p>
                  <p className="mt-1 text-xs leading-snug text-slate-600">{f.note}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="How the analyst left the call">
        <p className="text-sm leading-relaxed text-slate-700">{report.analyst_read}</p>
      </Section>

      {/* The reckoning: the whole point */}
      <div className="rounded-2xl border border-clay/30 bg-clay-soft p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-clay">The reckoning: what it costs, later</div>
        <div className="mt-3 space-y-3">
          {(report.reckoning || []).map((r, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-24 shrink-0 text-xs font-bold text-clay">{r.when}</div>
              <div className="text-sm leading-snug text-ink">{r.event}</div>
            </div>
          ))}
          {!(report.reckoning || []).length && <p className="text-sm text-slate-500">No lasting damage recorded.</p>}
        </div>
        {report.value_destroyed_note && <p className="mt-4 border-t border-clay/20 pt-3 text-sm font-medium leading-relaxed text-ink">{report.value_destroyed_note}</p>}
      </div>

      <div className="rounded-2xl bg-ink p-5 text-white">
        <div className="text-xs font-semibold uppercase tracking-wide text-white/50">The lesson</div>
        <p className="mt-1 text-sm leading-relaxed text-white/90">{report.principle}</p>
      </div>
    </div>
  );
}
