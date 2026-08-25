"use client";

type Score = { raw: number; stars: number };
type Read = { headline?: string; isReal?: string; maturity?: string; leaders?: string; green?: string[]; red?: string[]; verdict?: string };
type Item = { title: string; year?: number; authors?: string; assignees?: string };

function Stars({ n }: { n: number }) {
  const full = Math.max(0, Math.min(5, Math.round(n || 0)));
  return <span className="text-amber">{"★".repeat(full)}<span className="text-slate-300">{"★".repeat(5 - full)}</span></span>;
}

export default function DiligenceScienceReport({ read, scores, comparables = [], patents = [] }: { read: Read; scores?: any; comparables?: Item[]; patents?: Item[] }) {
  const r = read || {};
  const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);
  return (
    <div className="space-y-5">
      {r.headline && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">The read</div>
          <p className="mt-1 text-lg font-bold leading-snug text-ink">{r.headline}</p>
        </div>
      )}

      {scores && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[["Scientific", scores.scientific], ["Commercial", scores.commercial], ["Social", scores.social]].map(([label, s]: any) => (
            <div key={label} className="card p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-1 flex items-baseline gap-2"><span className="text-xl font-bold text-ink">{pct(s)}</span><span className="text-xs text-slate-400">/100</span><span className="ml-auto text-xs"><Stars n={s?.stars ?? 0} /></span></div>
            </div>
          ))}
        </div>
      )}

      {[["Is the science real?", r.isReal], ["Maturity", r.maturity], ["Who leads it", r.leaders]].map(([label, body]: any) => body && (
        <div key={label} className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{body}</p>
        </div>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.isArray(r.green) && r.green.length > 0 && (
          <div className="rounded-2xl border border-sage/30 bg-sage-soft/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-sage">Green flags</div>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{r.green.map((x, i) => <li key={i} className="flex gap-2"><span className="text-sage">✓</span><span>{x}</span></li>)}</ul>
          </div>
        )}
        {Array.isArray(r.red) && r.red.length > 0 && (
          <div className="rounded-2xl border border-clay/30 bg-clay-soft/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-clay">Red flags / probe</div>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{r.red.map((x, i) => <li key={i} className="flex gap-2"><span className="text-clay">▸</span><span>{x}</span></li>)}</ul>
          </div>
        )}
      </div>

      {r.verdict && (
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verdict</div>
          <p className="mt-1 text-sm font-semibold text-ink">{r.verdict}</p>
        </div>
      )}

      {(comparables.length > 0 || patents.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {comparables.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Comparable science</div>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600">{comparables.slice(0, 6).map((c, i) => <li key={i}>{c.title}{c.year ? ` (${c.year})` : ""}{c.authors ? ` — ${c.authors}` : ""}</li>)}</ul>
            </div>
          )}
          {patents.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nearby patents</div>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600">{patents.slice(0, 6).map((p, i) => <li key={i}>{p.title}{p.year ? ` (${p.year})` : ""}{p.assignees ? ` — ${p.assignees}` : ""}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">Built from Scientifiq&rsquo;s predictive scores and the comparable literature/patent landscape. A signal to guide diligence, not a substitute for it.</p>
    </div>
  );
}
