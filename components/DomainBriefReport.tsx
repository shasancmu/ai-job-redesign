"use client";

import BottomLine from "@/components/BottomLine";
import type { DomainBriefData, ExpertSummary, PaperSummary } from "@/lib/domainBrief";

type Theme = { title: string; detail: string };
type Person = { name: string; why: string };
type Brief = {
  bottomLine?: any;
  headline?: string;
  summary?: string;
  themes?: Theme[];
  standoutPeople?: Person[];
  trajectory?: string;
  gaps?: string[];
  note?: string;
};

// A 0-100 predictive potential shown as a compact chip.
function Pot({ label, value }: { label: string; value: number }) {
  const v = Math.round(value || 0);
  const color = v >= 80 ? "#3F7A52" : v >= 60 ? "#CE8F2C" : "#9aa7b4";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate2">
      {label}
      <span className="font-bold" style={{ color }}>{v}</span>
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-xs leading-snug text-slate2">{hint}</div>}
    </div>
  );
}

function MiniBar({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-40 shrink-0 truncate text-xs text-slate2" title={r.label}>{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-sky" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate2">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DomainBriefReport({ brief, data }: { brief: Brief; data: DomainBriefData }) {
  const experts = data.topExperts || [];
  const papers = data.standoutPapers || [];

  return (
    <div className="space-y-6">
      {brief.bottomLine ? (
        <BottomLine b={brief.bottomLine} />
      ) : brief.headline ? (
        <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{data.domain} · {data.scopeLabel}</div>
          <p className="mt-1 text-2xl font-bold leading-snug text-ink">{brief.headline}</p>
        </div>
      ) : null}

      {brief.summary && (
        <div className="card p-5 text-sm leading-relaxed text-slate-700">{brief.summary}</div>
      )}

      {/* Sample stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Experts" value={String(data.researcherCount)} hint="most relevant, analyzed" />
        <Stat label="Papers" value={String(data.paperCount)} hint="most relevant, analyzed" />
        <Stat label="Avg sci. potential" value={String(Math.round(data.avgSciPot))} hint="0-100 predictive" />
        <Stat label="Avg comm. potential" value={String(Math.round(data.avgCommPot))} hint="0-100 predictive" />
      </div>
      <p className="-mt-3 text-xs text-slate-400">Potential is a forward-looking score computed at publish time (Scientifiq), not a citation count. Counts are the most-relevant sample, not the full universe.</p>

      {/* Themes */}
      {(brief.themes || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Where the expertise concentrates</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {brief.themes!.map((t, i) => (
              <div key={i} className="card p-4">
                <div className="text-sm font-bold text-ink">{t.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top experts */}
      {experts.length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">The experts</h2>
          <div className="space-y-3">
            {experts.map((e: ExpertSummary) => (
              <div key={e.id} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-base font-bold text-ink">{e.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Pot label="Sci" value={e.scipot} />
                    <Pot label="Com" value={e.compot} />
                    <Pot label="Soc" value={e.socpot} />
                  </div>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{e.org}{e.totalPubs ? ` · ${e.totalPubs} papers` : ""}{e.acaCites ? ` · ${e.acaCites.toLocaleString()} citations` : ""}</div>
                {e.subfields && <div className="mt-1 text-xs text-slate2">{e.subfields}</div>}
                {e.bio && <p className="mt-2 text-sm leading-relaxed text-slate-600">{e.bio.length > 320 ? e.bio.slice(0, 320) + "…" : e.bio}</p>}
                {(e.representative || []).length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {e.representative.map((t, i) => (
                      <li key={i} className="text-xs text-slate-500">· {t}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standout work */}
      {papers.length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Standout work (highest predicted potential)</h2>
          <div className="card divide-y divide-line p-0">
            {papers.map((p: PaperSummary) => (
              <div key={p.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink hover:underline">{p.title}</a>
                  ) : (
                    <span className="text-sm font-semibold text-ink">{p.title}</span>
                  )}
                  <div className="mt-0.5 text-xs text-slate-400">{[p.year, p.authors, p.journal].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Pot label="Com" value={p.compot} />
                  <Pot label="Sci" value={p.scipot} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composition + trajectory */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(data.subfieldBreakdown || []).length > 0 && (
          <div className="card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Sub-field composition</div>
            <MiniBar rows={data.subfieldBreakdown.map((s) => ({ label: s.name, value: s.count }))} />
          </div>
        )}
        {(data.yearTrend || []).length > 1 && (
          <div className="card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Publication trajectory (sample)</div>
            <MiniBar rows={data.yearTrend.slice(-8).map((y) => ({ label: String(y.year), value: y.count }))} />
          </div>
        )}
      </div>

      {brief.trajectory && (
        <div>
          <h2 className="eyebrow mb-2">Trajectory</h2>
          <div className="card p-5 text-sm leading-relaxed text-slate-700">{brief.trajectory}</div>
        </div>
      )}

      {/* Gaps */}
      {(brief.gaps || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Whitespace &amp; gaps</h2>
          <div className="rounded-2xl border border-clay/30 bg-clay-soft/40 p-5">
            <ul className="space-y-2">
              {brief.gaps!.map((g, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink"><span className="mt-0.5 text-clay">!</span><span>{g}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {brief.note && (
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm leading-relaxed text-slate-600">{brief.note}</div>
      )}
    </div>
  );
}
