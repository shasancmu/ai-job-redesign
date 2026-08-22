"use client";

import type { SuperpowerReport as Report } from "@/lib/superpower";
import BottomLine from "@/components/BottomLine";

const MOAT: Record<string, { label: string; chip: string }> = {
  narrow: { label: "Narrow moat", chip: "bg-clay-soft text-clay" },
  solid: { label: "Solid moat", chip: "bg-amber-soft text-amber" },
  formidable: { label: "Formidable moat", chip: "bg-sage-soft text-sage" },
};

const VRINO_ROWS: { key: keyof Report["vrino"]; label: string; hint: string }[] = [
  { key: "valuable", label: "Valuable", hint: "creates value people want" },
  { key: "rare", label: "Rare", hint: "few others have it" },
  { key: "inimitable", label: "Inimitable", hint: "hard to copy" },
  { key: "nonSubstitutable", label: "Non-substitutable", hint: "no easy alternative" },
  { key: "organized", label: "Organized to capture", hint: "positioned to profit from it" },
];

export default function SuperpowerReport({ report }: { report: Report }) {
  const moat = MOAT[report.moatStrength] || MOAT.solid;
  return (
    <div className="space-y-6">
      <div data-guide="headline">
        {report.bottomLine ? (
          <BottomLine b={report.bottomLine} />
        ) : (
          <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your superpower</div>
            <p className="mt-1 text-2xl font-bold leading-snug text-ink">{report.headline}</p>
          </div>
        )}
      </div>

      {/* The stack */}
      <div data-guide="evidence">
        <h2 className="eyebrow mb-2">Your stack</h2>
        <div className="space-y-3">
          {(report.stack || []).map((s) => (
            <div key={s.rank} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{s.rank}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold text-ink">{s.name}</div>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.whatItIs}</p>
                  {(s.evidence || []).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {s.evidence.map((e, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-sage">✓</span><span>{e}</span></li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 rounded-lg bg-mist px-3 py-2 text-sm text-slate-600"><span className="font-medium text-ink">Why it&apos;s hard to copy:</span> {s.whyRare}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Combination */}
      {report.combination && (
        <div>
          <h2 className="eyebrow mb-2">How they combine</h2>
          <div className="card p-5">
            <p className="text-sm leading-relaxed text-ink">{report.combination}</p>
          </div>
        </div>
      )}

      {/* VRIN-O scorecard */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="eyebrow">The moat (VRIN-O)</h2>
          <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + moat.chip}>{moat.label}</span>
        </div>
        <div className="card divide-y divide-line p-0">
          {VRINO_ROWS.map((r) => (
            <div key={r.key} className="flex gap-3 p-4">
              <div className="w-40 shrink-0">
                <div className="text-sm font-semibold text-ink">{r.label}</div>
                <div className="text-xs text-slate-400">{r.hint}</div>
              </div>
              <div className="flex-1 text-sm leading-relaxed text-slate-600">{report.vrino?.[r.key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Organize */}
      {(report.organize || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Build a career around it</h2>
          <div className="card p-5">
            <ul className="space-y-2">
              {report.organize.map((o, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span><span>{o}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Watchout */}
      {report.watchout && (
        <div>
          <h2 className="eyebrow mb-2">The shadow side</h2>
          <div className="rounded-2xl border border-clay/30 bg-clay-soft/40 p-4 text-sm leading-relaxed text-ink">{report.watchout}</div>
        </div>
      )}
    </div>
  );
}
