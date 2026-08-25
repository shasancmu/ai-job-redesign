"use client";

type Ranked = { label: string; comm: number; sci: number; soc: number; stars?: { c: number; s: number; so: number } };
type Read = { summary?: string; prioritize?: string[]; watch?: string[]; verdict?: string };

function bar(v: number) {
  const color = v >= 66 ? "#3F7A52" : v >= 33 ? "#CE8F2C" : "#C06A47";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} /></div>
      <span className="tabular-nums text-xs text-slate-500">{v}</span>
    </div>
  );
}

export default function RankDisclosuresReport({ ranked = [], read }: { ranked: Ranked[]; read?: Read }) {
  const r = read || {};
  return (
    <div className="space-y-5">
      {r.summary && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">The portfolio</div>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{r.summary}</p>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ranked by commercial potential</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-1.5 pr-3 font-semibold">#</th>
                <th className="py-1.5 pr-3 font-semibold">Disclosure</th>
                <th className="py-1.5 pr-3 font-semibold">Commercial</th>
                <th className="py-1.5 pr-3 font-semibold">Scientific</th>
                <th className="py-1.5 font-semibold">Social</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((d, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-2 pr-3 text-slate-400">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium text-ink">{d.label}</td>
                  <td className="py-2 pr-3">{bar(d.comm)}</td>
                  <td className="py-2 pr-3">{bar(d.sci)}</td>
                  <td className="py-2">{bar(d.soc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {Array.isArray(r.prioritize) && r.prioritize.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prioritize</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">{r.prioritize.map((x, i) => <li key={i} className="flex gap-2"><span className="text-sage">▸</span><span>{x}</span></li>)}</ul>
        </div>
      )}
      {Array.isArray(r.watch) && r.watch.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Worth a note</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">{r.watch.map((x, i) => <li key={i} className="flex gap-2"><span className="text-slate-300">•</span><span>{x}</span></li>)}</ul>
        </div>
      )}
      {r.verdict && (
        <div className="rounded-2xl border border-clay/30 bg-clay-soft/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">Verdict</div>
          <p className="mt-1 text-sm font-medium text-ink">{r.verdict}</p>
        </div>
      )}
      <p className="text-xs text-slate-400">Scores are Scientifiq&rsquo;s predictive potential per disclosure, benchmarked to field. A forward-looking signal, not a guarantee.</p>
    </div>
  );
}
