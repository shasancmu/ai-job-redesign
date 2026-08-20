"use client";

import BottomLine from "@/components/BottomLine";
import { sciLink, SciLink } from "@/lib/scientifiqLinks";

type Score = { raw: number; stars: number };
type Scores = { commercial: Score; scientific: Score; social: Score };
type Brief = {
  bottomLine?: any;
  headline?: string;
  market?: string;
  licensees?: { who: string; why: string }[];
  ipLandscape?: string;
  risks?: string[];
  outreach?: string[];
  note?: string;
};

function Stars({ n }: { n: number }) {
  const full = Math.max(0, Math.min(5, Math.round(n || 0)));
  return <span className="text-amber" aria-label={`${full} of 5`}>{"★".repeat(full)}<span className="text-slate-300">{"★".repeat(5 - full)}</span></span>;
}

function ScoreCard({ label, s }: { label: string; s?: Score }) {
  const pct = Math.round((s?.raw ?? 0) * 100);
  const color = pct >= 66 ? "#3F7A52" : pct >= 33 ? "#CE8F2C" : "#C06A47";
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-ink">{pct}</span>
        <span className="text-xs text-slate-400">/100</span>
        <span className="ml-auto text-sm"><Stars n={s?.stars ?? 0} /></span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function LicensingBriefReport({
  brief,
  scores,
  comparables = [],
  patents = [],
  title,
}: {
  brief: Brief;
  scores?: Scores;
  comparables?: { id?: string; title: string; year?: number; comm: number; authors?: string }[];
  patents?: { id?: string; title: string; year?: number; assignees: string }[];
  title?: string;
}) {
  return (
    <div className="space-y-6">
      {brief.bottomLine ? (
        <BottomLine b={brief.bottomLine} />
      ) : brief.headline ? (
        <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Licensing brief{title ? ` · ${title}` : ""}</div>
          <p className="mt-1 text-2xl font-bold leading-snug text-ink">{brief.headline}</p>
        </div>
      ) : null}

      {/* Potential scores */}
      {scores && (
        <div>
          <h2 className="eyebrow mb-2">Predicted potential (this invention)</h2>
          <div className="grid grid-cols-3 gap-3">
            <ScoreCard label="Commercial" s={scores.commercial} />
            <ScoreCard label="Scientific" s={scores.scientific} />
            <ScoreCard label="Social" s={scores.social} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">Scientifiq&apos;s forward-looking scores for this abstract (predicted at publish, not citation-based).</p>
            {title && <SciLink href={sciLink.search(title)}>Explore this space on Scientifiq</SciLink>}
          </div>
        </div>
      )}

      {brief.market && (
        <div>
          <h2 className="eyebrow mb-2">The market</h2>
          <div className="card p-5 text-sm leading-relaxed text-slate-700">{brief.market}</div>
        </div>
      )}

      {(brief.licensees || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Who to approach</h2>
          <div className="card divide-y divide-line p-0">
            {brief.licensees!.map((l, i) => (
              <div key={i} className="p-4">
                <div className="text-sm font-semibold text-ink">{l.who}</div>
                <div className="text-sm leading-relaxed text-slate-600">{l.why}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IP landscape */}
      {(brief.ipLandscape || patents.length > 0) && (
        <div>
          <h2 className="eyebrow mb-2">IP landscape</h2>
          {brief.ipLandscape && <div className="card mb-3 p-5 text-sm leading-relaxed text-slate-700">{brief.ipLandscape}</div>}
          {patents.length > 0 && (
            <div className="card divide-y divide-line p-0">
              {patents.map((p, i) => (
                <div key={i} className="p-4">
                  <div className="text-sm font-medium text-ink">{p.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                    <span>{[p.year, p.assignees].filter(Boolean).join(" · ")}</span>
                    {p.id && <SciLink href={sciLink.patent(p.id)}>Scientifiq</SciLink>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparable science */}
      {comparables.length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Comparable science</h2>
          <div className="card divide-y divide-line p-0">
            {comparables.slice(0, 6).map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{c.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                    <span>{[c.year, c.authors].filter(Boolean).join(" · ")}</span>
                    {c.id && <SciLink href={sciLink.paper(c.id)}>Scientifiq</SciLink>}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate2">Com<span className="font-bold text-ink">{Math.round(c.comm)}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(brief.risks || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Risks</h2>
          <div className="rounded-2xl border border-clay/30 bg-clay-soft/40 p-5">
            <ul className="space-y-2">
              {brief.risks!.map((r, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink"><span className="mt-0.5 text-clay">!</span><span>{r}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {(brief.outreach || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Outreach plan</h2>
          <div className="card p-5">
            <ol className="space-y-2">
              {brief.outreach!.map((o, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span><span>{o}</span></li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {brief.note && <div className="rounded-2xl border border-line bg-mist p-4 text-sm leading-relaxed text-slate-600">{brief.note}</div>}
    </div>
  );
}
