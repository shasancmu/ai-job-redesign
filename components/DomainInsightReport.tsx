"use client";

type Read = { headline?: string; summary?: string; sections?: { title?: string; items?: string[] }[]; verdict?: string };

// Renders any of the landscape scans: the AI read (headline, sections) plus the
// underlying Scientifiq data (averages, top experts, standout work, subfields,
// active companies) as reference.
export default function DomainInsightReport({ read, data }: { read: Read; data?: any }) {
  const r = read || {};
  const d = data || {};
  const experts = (d.topExperts || []).slice(0, 8);
  const papers = (d.standoutPapers || []).slice(0, 6);
  const subs = (d.subfieldBreakdown || []).slice(0, 8);
  const patents = (d.patents || []).slice(0, 6);
  const round = (x: any) => Math.round(Number(x) || 0);

  return (
    <div className="space-y-5">
      {r.headline && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">The read</div>
          <p className="mt-1 text-lg font-bold leading-snug text-ink">{r.headline}</p>
          {r.summary && <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.summary}</p>}
        </div>
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[["Commercial", d.avgCommPot], ["Scientific", d.avgSciPot], ["Social", d.avgSocPot]].map(([label, v]: any) => (
            <div key={label} className="card p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Avg {label.toLowerCase()}</div>
              <div className="mt-1 text-xl font-bold text-ink">{round(v)}<span className="text-xs font-normal text-slate-400">/100</span></div>
            </div>
          ))}
        </div>
      )}

      {(r.sections || []).map((sec, i) => (
        <div key={i} className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{sec.title}</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">{(sec.items || []).map((x, k) => <li key={k} className="flex gap-2"><span className="text-sage">▸</span><span>{x}</span></li>)}</ul>
        </div>
      ))}

      {r.verdict && (
        <div className="rounded-2xl border border-clay/30 bg-clay-soft/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">Verdict</div>
          <p className="mt-1 text-sm font-medium text-ink">{r.verdict}</p>
        </div>
      )}

      {experts.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top researchers in the sample</div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400"><th className="py-1.5 pr-3 font-semibold">Name</th><th className="py-1.5 pr-3 font-semibold">Institution</th><th className="py-1.5 pr-3 text-right font-semibold">Sci</th><th className="py-1.5 text-right font-semibold">Comm</th></tr></thead>
              <tbody>
                {experts.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-1.5 pr-3 font-medium text-ink">{e.name}</td>
                    <td className="py-1.5 pr-3 text-slate-500">{e.org}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600">{round(e.scipot)}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">{round(e.compot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {papers.length > 0 && (
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Standout work</div>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">{papers.map((p: any, i: number) => <li key={i}>{p.title}{p.year ? ` (${p.year})` : ""}{p.authors ? ` — ${p.authors}` : ""}</li>)}</ul>
          </div>
        )}
        {patents.length > 0 && (
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Companies active (patent assignees)</div>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">{patents.map((p: any, i: number) => <li key={i}>{p.title}{p.assignees ? ` — ${p.assignees}` : ""}</li>)}</ul>
          </div>
        )}
      </div>

      {subs.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subfield mix (sample)</div>
          <div className="mt-2 flex flex-wrap gap-1.5">{subs.map((s: any, i: number) => <span key={i} className="rounded-full bg-mist px-2.5 py-1 text-xs text-slate-600">{s.name} <span className="text-slate-400">{s.count}</span></span>)}</div>
        </div>
      )}

      <p className="text-xs text-slate-400">Built from a Scientifiq relevance sample and its predictive potential scores. A signal for direction, not a universe census.</p>
    </div>
  );
}
