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
    <div className="mb-6 rounded-2xl border border-line bg-gradient-to-br from-sage/5 to-white p-5 shadow-soft">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sage">{presenceName}</div>
      <p className="mt-1.5 text-[1.05rem] leading-relaxed text-ink">{greeting}</p>
      {remembers.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-slate2 hover:text-ink">{open ? "Hide" : "What I remember about you"}</button>
          {open && (
            <div className="mt-2 rounded-xl bg-mist/60 p-3">
              <ul className="space-y-1">
                {remembers.map((r, i) => <li key={i} className="text-sm text-slate-700">• {r}</li>)}
              </ul>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                <span>This is yours — it's here to serve you.</span>
                <button onClick={forget} className="font-medium text-slate-500 hover:text-clay">Forget this</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
