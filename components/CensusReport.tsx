"use client";

export type CensusReportData = {
  headline: string;
  management: { read: string; strengths: string[]; gaps: string[] };
  model: { popcorn: string; note: string };
  benchmark: string;
};

export default function CensusReport({ report }: { report: CensusReportData }) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The one line</div>
        <p className="mt-1 text-xl font-bold leading-snug text-ink">{report.headline}</p>
      </div>

      <section className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">How you're managed</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{report.management?.read}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Strengths</div>
            <ul className="mt-1 space-y-1">{(report.management?.strengths || []).map((s, i) => <li key={i} className="border-l-2 border-sage pl-2 text-sm text-slate-700">{s}</li>)}</ul>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-clay">Highest-leverage gap</div>
            <ul className="mt-1 space-y-1">{(report.management?.gaps || []).map((s, i) => <li key={i} className="border-l-2 border-clay pl-2 text-sm text-slate-700">{s}</li>)}</ul>
          </div>
        </div>
        {report.benchmark && <p className="mt-3 rounded-lg bg-mist px-3 py-2 text-sm text-slate-600">{report.benchmark}</p>}
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber">🍿 Where your margin really lives</div>
        <p className="mt-1 font-medium text-ink">{report.model?.popcorn}</p>
        {report.model?.note && <p className="mt-1 text-sm text-slate-600">{report.model.note}</p>}
      </section>

      <p className="text-center text-xs text-slate-400">Thanks. Your business is now in the directory.</p>
    </div>
  );
}
