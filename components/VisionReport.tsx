import type { VisionReport as V } from "@/lib/vision";

// Renders a synthesized organizational vision. Layout is original; the framing
// (enduring core vs. envisioned future) follows Collins & Porras, credited below.
export default function VisionReport({ report, org }: { report: V; org?: string }) {
  if (!report) return null;
  return (
    <div className="space-y-6">
      <div data-guide="headline">
        {report.oneLiner && (
          <div className="rounded-2xl p-6 text-white" style={{ background: "var(--brand, #14283A)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">{org ? `${org} — the vision` : "The vision"}</div>
            <p className="mt-2 text-xl font-semibold leading-snug">{report.oneLiner}</p>
          </div>
        )}
      </div>

      <section data-guide="core">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The enduring core</div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Core values</h3>
            <p className="mt-0.5 text-xs text-slate-400">What you&apos;d hold even if it cost you.</p>
            <ul className="mt-3 space-y-3">
              {report.coreValues.map((v, i) => (
                <li key={i}>
                  <div className="text-sm font-semibold text-ink">{v.value}</div>
                  {v.meaning && <div className="text-sm text-slate2">{v.meaning}</div>}
                </li>
              ))}
              {report.coreValues.length === 0 && <li className="text-sm text-slate-400">Not yet drawn out.</li>}
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">Core purpose</h3>
            <p className="mt-0.5 text-xs text-slate-400">Why you exist, beyond the money.</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{report.corePurpose || "Not yet drawn out."}</p>
          </div>
        </div>
      </section>

      <section data-guide="future">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The envisioned future</div>
        <div className="mt-3 space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">The bold goal <span className="font-normal text-slate-400">(10–30 years)</span></h3>
            <p className="mt-2 text-lg font-semibold leading-snug text-ink">{report.bhag || "Not yet drawn out."}</p>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink">What it looks like when you get there</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{report.vividDescription || "Not yet drawn out."}</p>
          </div>
        </div>
      </section>

      {report.howToUse && (
        <div className="rounded-2xl border border-line bg-mist p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Make it real</div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{report.howToUse}</p>
        </div>
      )}

      <p className="text-xs text-slate-400">Framework: the vision structure of Jim Collins and Jerry Porras (enduring core + envisioned future).</p>
    </div>
  );
}
