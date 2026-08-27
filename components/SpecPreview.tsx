"use client";

// The live canvas: a read-only render of what a learner sees, built from the
// in-memory spec so it updates as the author types. No API calls and no hidden
// truth — the interactive run (with the model) happens on the saved /m/[slug].

function charName(spec: any): string {
  const r = (spec?.roles || []).find((x: any) => x?.kind === "character" || x?.kind === "interviewer");
  return r?.name || "the character";
}

function verdictStep(spec: any): any | null {
  return (spec?.flow || []).find((p: any) => p?.kind === "verdict") || null;
}

const BLOCK_LABEL: Record<string, string> = {
  verdictLine: "Your score",
  score: "Your score",
  trail: "Your questions, scored",
  map: "The information map",
  quote: "You vs. a naive AI",
  principle: "The transferable principle",
  section: "",
};

export default function SpecPreview({ spec }: { spec: any }) {
  const meta = spec?.meta || {};
  const flow: any[] = spec?.flow || [];
  const brief = flow.find((p) => p?.kind === "brief");
  const verdict = verdictStep(spec);
  const report: any[] = spec?.report || [];

  return (
    <div className="sticky top-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Live preview</span>
        <span className="text-[11px] text-slate-400">what the learner sees</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {/* device chrome */}
        <div className="flex items-center gap-1.5 border-b border-line bg-mist px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-2 truncate text-[11px] text-slate-400">/m/{spec?.slug || "your-module"}</span>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {/* title */}
          <div className="flex items-start gap-2">
            <div className="text-2xl leading-none">{meta.emoji || "🎭"}</div>
            <div className="min-w-0">
              <div className="text-base font-bold text-ink">{meta.name || "Untitled module"}</div>
              {meta.tagline && <div className="text-xs text-slate-500">{meta.tagline}</div>}
              {spec?.lineage?.forkedFromName && <div className="text-[10px] text-slate-400">Adapted from {spec.lineage.forkedFromName}</div>}
            </div>
          </div>

          {/* phase rail */}
          {flow.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {flow.map((p, i) => (
                <span key={i} className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {p?.title || p?.kind}{p?.minutes ? ` · ${p.minutes}m` : ""}
                </span>
              ))}
            </div>
          )}

          {/* brief */}
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">The brief</div>
            {spec?.world
              ? <p className="mt-1 whitespace-pre-wrap rounded-lg bg-mist p-3 text-xs leading-relaxed text-slate-700">{spec.world}</p>
              : <p className="mt-1 rounded-lg border border-dashed border-line p-3 text-xs text-slate-400">The situation the learner sees goes here.</p>}
            {brief?.intro && <p className="mt-2 text-xs leading-relaxed text-slate-600">{brief.intro}</p>}
          </div>

          {/* character */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-line p-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/5 text-sm">💬</div>
            <div className="text-xs text-slate-600">You'll question <span className="font-semibold text-ink">{charName(spec)}</span>{(() => { const t = flow.find((p) => p?.kind === "converse"); return t?.budget ? <> · <span className="font-medium">{t.budget} questions</span></> : null; })()}</div>
          </div>

          {/* verdict */}
          {verdict?.verdict?.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{verdict.title || "Your call"}</div>
              <div className="mt-2 space-y-2">
                {verdict.verdict.map((f: any, i: number) => (
                  <div key={i}>
                    <div className="text-xs font-medium text-slate-600">{f.label || f.key}</div>
                    {f.type === "choice" && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(f.options || []).length
                          ? f.options.map((o: any, j: number) => <span key={j} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-slate-600">{o.label || o.value}</span>)
                          : <span className="text-[11px] text-slate-400">no options yet</span>}
                      </div>
                    )}
                    {f.type === "scale" && <div className="mt-1 h-1.5 rounded-full bg-gradient-to-r from-mist to-slate-300" />}
                    {f.type === "text" && <div className="mt-1 h-8 rounded-lg border border-dashed border-line" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* report outline */}
          {report.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">The report</div>
              <div className="mt-1 space-y-1">
                {report.map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    {b.title || BLOCK_LABEL[b.type] || b.source}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Save to open the full interactive run with the AI character and grading.</p>
    </div>
  );
}
