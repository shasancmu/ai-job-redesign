"use client";

function Narr({ n }: { n: any }) {
  if (!n || (!n.headline && !n.read)) return null;
  return (
    <div className="card space-y-2 p-5">
      {n.headline && <p className="text-base font-semibold text-ink">{n.headline}</p>}
      {n.read && <p className="text-sm text-slate2">{n.read}</p>}
      {n.action && <p className="rounded-lg bg-mist px-3 py-2 text-sm text-ink"><span className="font-semibold">Move:</span> {n.action}</p>}
    </div>
  );
}

export default function ScienceIntelResult({ mode, data, narrate }: { mode: string; data: any; narrate: any }) {
  if (mode === "talent") {
    return (
      <div className="space-y-5">
        <Narr n={narrate} />
        {data.topEmployers?.length > 0 && (
          <div className="card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Where the IP goes — top corporate employers</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{data.topEmployers.map((x: any) => <span key={x.name} className="rounded-full bg-mist px-2.5 py-1 text-sm font-medium text-ink">{x.name} <span className="text-xs text-slate-400">· {x.n}</span></span>)}</div>
          </div>
        )}
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The experts</div>
          <div className="mt-2 space-y-2">
            {data.experts.map((e: any) => (
              <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line/60 pb-2">
                <div>
                  <span className="font-semibold text-ink">{e.name}</span>
                  <span className="text-sm text-slate2"> · {e.org}{e.city ? <span className="text-slate-400"> ({e.city})</span> : null}</span>
                  {e.employer && !e.academic && <span className="ml-2 rounded-full bg-amber/20 px-2 py-0.5 text-[11px] font-medium text-amber-700">patents for {e.employer}</span>}
                  {e.academic && <span className="ml-2 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-medium text-sage">academic / hireable</span>}
                </div>
                <div className="text-[11px] tabular-nums text-slate-400">cp <span className="font-semibold text-sage">{e.compot}</span></div>
                {e.fields && <div className="w-full text-xs text-slate-400">{e.fields}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "national") {
    return (
      <div className="space-y-5">
        <Narr n={narrate} />
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Research strengths — by commercial potential</div>
          <div className="mt-2 space-y-2">
            {data.strengths.map((s: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm"><span className="text-ink">{s.subfield}</span><span className="tabular-nums text-slate-400">{s.researchers} researchers · cp {s.avgCompot}</span></div>
                <div className="mt-0.5 h-1.5 rounded-full bg-mist"><div className="h-1.5 rounded-full bg-sage" style={{ width: `${Math.min(100, s.avgCompot)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The people driving it</div>
          <div className="mt-2 space-y-1.5">
            {data.topResearchers.map((r: any, i: number) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line/50 pb-1.5">
                <div><span className="font-semibold text-ink">{r.name}</span> <span className="text-sm text-slate2">· {r.org}</span></div>
                <span className="text-[11px] tabular-nums text-slate-400">cp <span className="font-semibold text-sage">{r.compot}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // competitors
  return (
    <div className="space-y-5">
      <Narr n={narrate} />
      {data.footprint?.found && (
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{data.company} · {data.footprint.patentCount} patents · cites {data.citedCount} papers</div>
        </div>
      )}
      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Firms building on the same science</div>
        <div className="mt-2 space-y-1.5">
          {data.competitors.map((c: any, i: number) => (
            <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line/50 pb-1.5 text-sm">
              <span className="font-semibold text-ink">{c.name}</span>
              <span className="tabular-nums text-slate-400">{c.patents} patent{c.patents === 1 ? "" : "s"} on this science{c.latestYear ? ` · latest ${c.latestYear}` : ""}</span>
            </div>
          ))}
          {!data.competitors.length && <div className="text-sm text-slate-400">No other firms citing the same science were resolved.</div>}
        </div>
      </div>
    </div>
  );
}
