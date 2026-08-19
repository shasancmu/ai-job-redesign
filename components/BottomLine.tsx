import type { BottomLine as B } from "@/lib/advice";

// The hero at the top of every advisory report. Establishes hierarchy: the real
// question is the biggest thing on the page, the take is prominent, the reframe
// / what-to-cut / normalize are supporting, and the next step is an unmistakable
// call to action. Read this and you know what to do; the rest is the backup.
export default function BottomLine({ b }: { b?: B | null }) {
  if (!b || (!b.realQuestion && !b.take)) return null;
  const supports = [
    b.reframe && { label: "A better frame", tone: "text-sky", body: b.reframe },
    b.cut && { label: "What to drop", tone: "text-clay", body: b.cut },
    b.normalize && { label: "For what it's worth", tone: "text-sage", body: b.normalize },
  ].filter(Boolean) as { label: string; tone: string; body: string }[];

  return (
    <div className="rounded-3xl border-2 border-ink/10 bg-gradient-to-br from-white to-mist p-6 sm:p-7">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">The bottom line</div>

      {b.realQuestion && (
        <p className="mt-2 text-2xl font-bold leading-snug text-ink sm:text-[28px]">{b.realQuestion}</p>
      )}

      {b.take && (
        <div className="mt-4 rounded-2xl border border-line bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Our take</div>
          <p className="mt-1 text-base font-medium leading-relaxed text-ink">{b.take}</p>
        </div>
      )}

      {supports.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {supports.map((s, i) => (
            <div key={i} className="rounded-xl border border-line bg-white/70 p-3">
              <div className={"text-xs font-semibold uppercase tracking-wide " + s.tone}>{s.label}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      )}

      {b.nextStep && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-ink p-4 text-white">
          <span className="mt-0.5 text-lg leading-none">→</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Do this next</div>
            <p className="mt-0.5 text-base font-medium leading-relaxed">{b.nextStep}</p>
          </div>
        </div>
      )}
    </div>
  );
}
