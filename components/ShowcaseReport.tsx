"use client";

export type ShowcaseReportData = {
  headline: string;
  strengths: string[];
  suggestions: string[];
  themes: { label: string; gist: string }[];
  standouts: { quote: string; name?: string }[];
  encouragement: string;
  avg_rating: number | null;
  rating_count: number;
  feedback_count: number;
};

export default function ShowcaseReport({ report, itemTitle, presenter }: { report: ShowcaseReportData; itemTitle?: string; presenter?: string }) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        {itemTitle && <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{itemTitle}{presenter ? ` · ${presenter}` : ""}</div>}
        <p className="mt-1 text-lg font-bold leading-snug text-ink">{report.headline}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {report.avg_rating !== null && (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-ink tabular-nums">{report.avg_rating}</span>
              <span className="text-sm text-slate-400">/ 5 avg</span>
            </div>
          )}
          <span className="text-sm text-slate-500">{report.feedback_count} comment{report.feedback_count === 1 ? "" : "s"}{report.rating_count ? ` · ${report.rating_count} rating${report.rating_count === 1 ? "" : "s"}` : ""}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">What landed</div>
          <ul className="mt-2 space-y-1.5">
            {(report.strengths || []).map((s, i) => <li key={i} className="border-l-2 border-sage pl-3 text-sm leading-snug text-slate-700">{s}</li>)}
            {!(report.strengths || []).length && <li className="text-sm text-slate-400">Nothing specific noted.</li>}
          </ul>
        </section>
        <section className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">What to sharpen</div>
          <ul className="mt-2 space-y-1.5">
            {(report.suggestions || []).map((s, i) => <li key={i} className="border-l-2 border-clay pl-3 text-sm leading-snug text-slate-700">{s}</li>)}
            {!(report.suggestions || []).length && <li className="text-sm text-slate-400">No suggestions raised.</li>}
          </ul>
        </section>
      </div>

      {(report.themes || []).length > 0 && (
        <section className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Themes in the feedback</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {report.themes.map((th, i) => (
              <div key={i} className="rounded-xl bg-mist p-3">
                <div className="text-sm font-bold text-ink">{th.label}</div>
                <div className="mt-0.5 text-xs leading-snug text-slate-600">{th.gist}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(report.standouts || []).length > 0 && (
        <section className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">In their words</div>
          <div className="mt-3 space-y-2">
            {report.standouts.map((q, i) => (
              <div key={i} className="rounded-xl bg-mist/60 px-3 py-2">
                <p className="text-sm italic text-slate-700">"{q.quote}"</p>
                {q.name && <div className="mt-0.5 text-[11px] text-slate-400">— {q.name}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {report.encouragement && (
        <div className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-sm leading-relaxed text-white/90">{report.encouragement}</p>
        </div>
      )}
    </div>
  );
}
