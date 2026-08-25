"use client";

type Score = { raw: number; stars: number };
type Scores = { commercial: Score; scientific: Score; social: Score };
type Read = {
  headline?: string; strongest?: string;
  readCommercial?: string; readScientific?: string; readSocial?: string;
  raise?: string[]; whoCares?: string[]; verdict?: string;
};

function Stars({ n }: { n: number }) {
  const full = Math.max(0, Math.min(5, Math.round(n || 0)));
  return <span className="text-amber" aria-label={`${full} of 5`}>{"★".repeat(full)}<span className="text-slate-300">{"★".repeat(5 - full)}</span></span>;
}
function ScoreCard({ label, s, note }: { label: string; s?: Score; note?: string }) {
  const pct = Math.round((s?.raw ?? 0) * 100);
  const color = pct >= 66 ? "#3F7A52" : pct >= 33 ? "#CE8F2C" : "#C06A47";
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label} potential</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-ink">{pct}</span>
        <span className="text-xs text-slate-400">/100</span>
        <span className="ml-auto text-sm"><Stars n={s?.stars ?? 0} /></span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
      {note && <p className="mt-2 text-sm text-slate-600">{note}</p>}
    </div>
  );
}

export default function ScoreInventionReport({ read, scores }: { read: Read; scores?: Scores }) {
  const r = read || {};
  return (
    <div className="space-y-5">
      {r.headline && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">The read</div>
          <p className="mt-1 text-lg font-bold leading-snug text-ink">{r.headline}</p>
          {r.strongest && <p className="mt-2 text-sm text-slate-600">{r.strongest}</p>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <ScoreCard label="Commercial" s={scores?.commercial} note={r.readCommercial} />
        <ScoreCard label="Scientific" s={scores?.scientific} note={r.readScientific} />
        <ScoreCard label="Social" s={scores?.social} note={r.readSocial} />
      </div>

      {Array.isArray(r.raise) && r.raise.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">How to raise it</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {r.raise.map((x, i) => <li key={i} className="flex gap-2"><span className="text-sage">▸</span><span>{x}</span></li>)}
          </ul>
        </div>
      )}

      {Array.isArray(r.whoCares) && r.whoCares.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Who would care</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {r.whoCares.map((x, i) => <li key={i} className="flex gap-2"><span className="text-slate-300">•</span><span>{x}</span></li>)}
          </ul>
        </div>
      )}

      {r.verdict && (
        <div className="rounded-2xl border border-clay/30 bg-clay-soft/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">Verdict</div>
          <p className="mt-1 text-sm font-medium text-ink">{r.verdict}</p>
        </div>
      )}

      <p className="text-xs text-slate-400">Scores are Scientifiq&rsquo;s predictive potential for this abstract, benchmarked against its field. A forward-looking signal, not a guarantee.</p>
    </div>
  );
}
