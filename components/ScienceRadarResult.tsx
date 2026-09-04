"use client";

export default function ScienceRadarResult({ report, narrate }: { report: any; narrate: any }) {
  const { mode, footprint, data, firms, whitespace } = report;
  const experts = (data?.topExperts || []).slice(0, 8);
  const firmList = (firms?.firms || []).slice(0, 8);
  const n = narrate || {};

  return (
    <div className="space-y-5">
      {(n.headline || n.footprint_read) && (
        <div className="card space-y-2 p-5">
          {n.headline && <p className="text-base font-semibold text-ink">{n.headline}</p>}
          {n.footprint_read && <p className="text-sm text-slate2">{n.footprint_read}</p>}
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>Avg commercial potential of this science: <span className="font-semibold text-sage">{Math.round(data?.avgCommPot || 0)}/100</span></span>
            {mode === "company" && footprint?.found && <span>{footprint.patentCount} patents analyzed</span>}
          </div>
        </div>
      )}

      {mode === "company" && footprint?.found && (
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your science footprint <span className="font-normal normal-case text-slate-400">· {footprint.patentCount} patents</span></div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {((footprint.terms && footprint.terms.length ? footprint.terms : footprint.keywords) || []).slice(0, 12).map((k: string) => <span key={k} className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-slate2">{k}</span>)}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The frontier — highest-potential researchers</div>
        {n.frontier_read && <p className="mt-1 text-sm text-slate2">{n.frontier_read}</p>}
        <div className="mt-2 space-y-2">
          {experts.map((e: any) => (
            <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line/60 pb-2">
              <div><span className="font-semibold text-ink">{e.name}</span> <span className="text-sm text-slate2">· {e.org}</span></div>
              <div className="text-[11px] tabular-nums text-slate-400">commercial potential <span className="font-semibold text-sage">{Math.round(e.compot)}</span></div>
              {e.subfields && <div className="w-full text-xs text-slate-400">{e.subfields}</div>}
            </div>
          ))}
        </div>
      </div>

      {whitespace?.length > 0 && (
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Science you could be using {mode === "company" ? "but don't cite yet" : ""}</div>
          <div className="mt-2 space-y-1.5">
            {whitespace.map((p: any, i: number) => (
              <div key={i} className="border-b border-line/50 pb-1.5 text-sm">
                <span className="text-ink">{p.title}</span>{p.year ? <span className="text-slate-400"> ({p.year})</span> : null}
                <span className="ml-1 text-[11px] tabular-nums text-slate-400">cp {Math.round(p.compot)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {firmList.length > 0 && (
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Who else is building on this science</div>
          {n.competitor_read && <p className="mt-1 text-sm text-slate2">{n.competitor_read}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {firmList.map((f: any) => <span key={f.name} className="rounded-full bg-mist px-2.5 py-1 text-sm font-medium text-ink">{f.name} <span className="text-xs text-slate-400">· {f.patents}</span></span>)}
          </div>
        </div>
      )}

      {n.action && <p className="rounded-lg bg-mist px-3 py-2 text-sm text-ink"><span className="font-semibold">Where to go:</span> {n.action}</p>}
      <p className="text-center text-xs text-slate-400">Science Radar · built on Scientifiq.AI</p>
    </div>
  );
}
