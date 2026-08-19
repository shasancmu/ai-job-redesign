"use client";

import type { ConsultReport as Report } from "@/lib/business";
import { WMS_AREAS } from "@/lib/business";

const LEVER_LABEL: Record<string, string> = { volume: "Sell more", price: "Price higher", cost: "Cut cost" };

export default function ConsultReport({ report, wms }: { report: Report; wms?: { overall: number; byArea: Record<string, number> } }) {
  const axisPos = report.businessType?.axis === "cost" ? 12 : report.businessType?.axis === "value" ? 88 : 50;
  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The one thing</div>
        <p className="mt-1 text-xl font-bold leading-snug text-ink">{report.headline}</p>
      </div>

      {/* What kind of business */}
      <Section title="What kind of business you are">
        <div className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>Cost-led</span>
          <span>Value-led</span>
        </div>
        <div className="relative mt-2 h-2 rounded-full bg-gradient-to-r from-clay/30 via-slate-200 to-sage/40">
          <div className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-ink shadow" style={{ left: `${axisPos}%` }} />
        </div>
        <div className="mt-4 text-base font-bold text-ink">{report.businessType?.label}</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{report.businessType?.why}</p>
      </Section>

      {/* Margin engine */}
      <Section title="What drives your margin">
        <p className="text-sm leading-relaxed text-slate-600">{report.marginEngine?.summary}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(report.marginEngine?.drivers || []).map((d, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">{LEVER_LABEL[d.lever] || d.lever}</div>
              <div className="mt-1 text-sm text-slate-600">{d.note}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Popcorn */}
      <Section title="Where your margin really lives">
        <div className="rounded-2xl bg-amber-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber">🍿 The popcorn</div>
          <p className="mt-1 font-medium text-ink">{report.profitPool?.popcorn}</p>
          <p className="mt-1.5 text-sm text-slate-600">{report.profitPool?.note}</p>
        </div>
      </Section>

      {/* Management practices */}
      <Section title="How the business is run">
        {wms && wms.overall > 0 && (
          <div className="mb-4 space-y-2">
            {WMS_AREAS.map((a) => {
              const v = wms.byArea?.[a.key] || 0;
              return (
                <div key={a.key} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-sm text-slate-600">{a.label}</div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${(v / 5) * 100}%` }} />
                  </div>
                  <div className="w-10 shrink-0 text-right text-sm font-semibold text-ink">{v || "—"}</div>
                </div>
              );
            })}
            <div className="pt-1 text-xs text-slate-400">Overall {wms.overall}/5 (Bloom, Van Reenen & Sadun). Higher practices independently lift productivity and margin.</div>
          </div>
        )}
        <p className="text-sm leading-relaxed text-slate-600">{report.practices?.summary}</p>
        <div className="mt-3 space-y-2">
          {(report.practices?.gaps || []).map((g, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-clay">{g.area}</div>
              <div className="mt-0.5 text-sm font-medium text-ink">{g.issue}</div>
              <div className="mt-1 text-sm text-slate-600"><span className="font-medium text-sage">Fix:</span> {g.fix}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 80/20 */}
      <Section title="The 80/20">
        <p className="text-sm leading-relaxed text-slate-600">{report.eightyTwenty?.summary}</p>
        {(report.eightyTwenty?.risks || []).length > 0 && (
          <ul className="mt-2 space-y-1">
            {report.eightyTwenty.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-slate-300">•</span><span>{r}</span></li>
            ))}
          </ul>
        )}
      </Section>

      {/* Upstream */}
      {(report.upstream || []).length > 0 && (
        <Section title="Where you're getting stuck">
          <ul className="space-y-1">
            {report.upstream.map((u, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-clay">▸</span><span>{u}</span></li>
            ))}
          </ul>
        </Section>
      )}

      {/* Plan */}
      <Section title="Your execution plan">
        <div className="space-y-3">
          {(report.plan || []).map((m, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</div>
              <div>
                <div className="font-bold text-ink">{m.title}</div>
                <div className="mt-0.5 text-sm text-slate-600">{m.why}</div>
                <div className="mt-1 text-sm"><span className="font-medium text-sage">This week:</span> {m.firstStep}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="card p-5">{children}</div>
    </div>
  );
}
