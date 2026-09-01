"use client";

import { useEffect, useState } from "react";

// The institution's remembering "presence" on the dashboard: a warm greeting that
// knows what you were last working on, plus a transparent "what I remember" the
// learner can read and clear. Refreshes itself in the background when stale, so it
// never slows the page.
export default function PresenceGreeting({
  presenceName,
  initialGreeting,
  initialRemembers = [],
  needsRefresh = false,
}: {
  presenceName: string;
  initialGreeting: string | null;
  initialRemembers?: string[];
  needsRefresh?: boolean;
}) {
  const [greeting, setGreeting] = useState(initialGreeting || "");
  const [remembers, setRemembers] = useState<string[]>(initialRemembers);
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!needsRefresh) return;
    let live = true;
    fetch("/api/presence/refresh", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (live && d?.ok && d.greeting) { setGreeting(d.greeting); setRemembers(Array.isArray(d.remembers) ? d.remembers : []); } })
      .catch(() => {});
    return () => { live = false; };
  }, [needsRefresh]);

  async function forget() {
    setGone(true);
    try { await fetch("/api/presence/refresh", { method: "DELETE" }); } catch { /* best effort */ }
  }

  if (gone || !greeting) return null;

  return (
    <div className="mb-6 border-l-2 border-line pl-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{presenceName}</div>
      <p className="mt-1 text-[1.02rem] leading-relaxed text-ink">{greeting}</p>
      {remembers.length > 0 && (
        <div className="mt-1.5">
          <button onClick={() => setOpen((o) => !o)} className="text-xs text-slate-400 hover:text-slate2">{open ? "Hide" : "What I've noted"}</button>
          {open && (
            <div className="mt-2 max-w-xl">
              <ul className="space-y-1">
                {remembers.map((r, i) => <li key={i} className="text-sm text-slate-600">— {r}</li>)}
              </ul>
              <div className="mt-2 text-[11px] text-slate-400">Yours to <button onClick={forget} className="underline hover:text-clay">forget</button>.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
