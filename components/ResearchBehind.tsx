import { frameworksFor } from "@/lib/frameworks";

// "The research behind this" — a collapsed expander on a report. Progressive
// disclosure: SMEs skip it, the curious open it. Uses native <details> so it
// needs no JS. Renders nothing if the module has no registered frameworks.
export default function ResearchBehind({ guideKey }: { guideKey?: string }) {
  const items = frameworksFor(guideKey);
  if (items.length === 0) return null;

  return (
    <details className="mt-5 rounded-2xl border border-line bg-mist/30 no-print">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ink">
        <span className="mr-1 text-slate-400">▸</span> The research behind this
        <span className="ml-1 font-normal text-slate-400">({items.length})</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        {items.map((f) => (
          <div key={f.name} className="border-t border-line pt-3">
            <div className="text-sm font-semibold text-ink">{f.name}</div>
            <p className="mt-0.5 text-sm text-slate-600">{f.finding}</p>
            <p className="mt-1 text-xs italic text-slate-400">{f.cite}</p>
          </div>
        ))}
        <a href="/frameworks" className="inline-block border-t border-line pt-3 text-xs font-semibold text-sage hover:underline">
          Browse the research behind every exercise &rarr;
        </a>
      </div>
    </details>
  );
}
