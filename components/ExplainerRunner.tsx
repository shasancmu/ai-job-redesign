"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function beacon(slug: string, stage: string) {
  try { fetch("/api/module-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, kind: "explainer", stage }), keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}

// A taught walkthrough: paginated sections, key points, an optional check, and
// the takeaway at the end.
export default function ExplainerRunner({ spec }: { spec: any }) {
  const sections: any[] = spec.sections || [];
  const total = sections.length + 1; // + takeaway/intro handled inline
  const [i, setI] = useState(0);
  const done = i >= sections.length;

  // Drop-off funnel: opened, and reached the takeaway (once).
  useEffect(() => { if (spec.slug) beacon(spec.slug, "start"); }, [spec.slug]);
  const completed = useRef(false);
  useEffect(() => { if (done && spec.slug && !completed.current) { completed.current = true; beacon(spec.slug, "complete"); } }, [done, spec.slug]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-1.5">
        {sections.map((_, k) => <div key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k < i ? "var(--ink,#191c22)" : k === i && !done ? "var(--ai,#26457a)" : "#e2e5ea" }} />)}
        <div className="h-1.5 flex-1 rounded-full" style={{ background: done ? "var(--ai,#26457a)" : "#e2e5ea" }} />
      </div>

      {i === 0 && spec.intro && !done && <p className="mb-4 rounded-xl bg-mist p-4 text-sm leading-relaxed text-slate-600">{spec.intro}</p>}

      {!done ? (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Part {i + 1} of {sections.length}</div>
          <h1 className="mt-1 font-serif text-2xl text-ink">{sections[i].title}</h1>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{sections[i].body}</p>
          {Array.isArray(sections[i].key) && sections[i].key.length > 0 && (
            <ul className="mt-4 space-y-1">
              {sections[i].key.map((k: string, n: number) => <li key={n} className="flex items-start gap-2 text-sm text-ink"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ai" />{k}</li>)}
            </ul>
          )}
          {sections[i].check && <div className="mt-4 rounded-lg border border-ai/20 bg-ai/5 p-3 text-sm text-ink"><span className="font-semibold">Think:</span> {sections[i].check}</div>}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <div className="text-3xl">🎯</div>
          <div className="mt-2 font-serif text-xl text-ink">The takeaway</div>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-slate-700">{spec.takeaway || "You've reached the end."}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn-ghost disabled:opacity-40">Back</button>
        {!done ? <button onClick={() => setI((x) => x + 1)} className="btn-primary">Next →</button> : <Link href="/dashboard?done=1" className="btn-primary">Done</Link>}
      </div>
    </div>
  );
}
