import BottomLine from "@/components/BottomLine";

// The cross-interview synthesis for Understand Your Customer. Shared by the
// owner's room and the public shared-report view.
export default function EmpathyAggregate({ a }: { a: any }) {
  return (
    <div className="mt-3 space-y-4">
      {a.bottomLine && <BottomLine b={a.bottomLine} />}
      <div className="card space-y-5 p-5">
      {a.headline && <p className="text-lg font-semibold leading-snug text-ink">{a.headline}</p>}

      {Array.isArray(a.themes) && a.themes.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Themes</div>
          <div className="mt-2 space-y-2">
            {a.themes.map((t: any, i: number) => (
              <div key={i} className="rounded-lg bg-mist px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{t.title}</span>
                  {typeof t.count === "number" && <span className="text-xs text-slate-400">{t.count} said this</span>}
                </div>
                <p className="text-sm text-slate2">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(a.segments) && a.segments.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer types</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {a.segments.map((s: any, i: number) => (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="text-sm font-semibold text-ink">{s.name}</div>
                {s.who && <div className="text-xs text-slate-400">{s.who}</div>}
                {s.job && <p className="mt-1 text-sm text-slate2"><b className="text-ink">Job:</b> {s.job}</p>}
                {s.hook && <p className="text-sm text-slate2"><b className="text-ink">Hook:</b> {s.hook}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(a.topNeeds) && a.topNeeds.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top unmet needs</div>
          <ul className="mt-1.5 space-y-1">
            {a.topNeeds.map((n: string, i: number) => <li key={i} className="flex gap-2 text-sm text-slate2"><span className="text-slate-300">•</span><span>{n}</span></li>)}
          </ul>
        </div>
      )}

      {Array.isArray(a.opportunities) && a.opportunities.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Opportunities</div>
          <div className="mt-2 space-y-2">
            {a.opportunities.map((o: any, i: number) => (
              <div key={i} className="rounded-lg bg-sage-soft/40 px-3 py-2">
                <div className="text-sm font-medium text-ink">{o.move}</div>
                {o.why && <p className="text-sm text-slate2">{o.why}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(a.quotes) && a.quotes.length > 0 && (
        <div className="space-y-1.5 border-t border-line pt-3">
          {a.quotes.map((q: string, i: number) => <p key={i} className="border-l-2 border-line pl-3 text-sm italic text-slate2">&ldquo;{q}&rdquo;</p>)}
        </div>
      )}
      </div>
    </div>
  );
}
