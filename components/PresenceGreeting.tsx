"use client";

import { useEffect, useState } from "react";

type Reach = { text: string; author?: string };

// The institution's small top-of-dashboard touch: its name and a nice quote. Refreshes
// itself in the background when stale, so it never slows the page.
export default function PresenceGreeting({
  presenceName,
  initialReach = null,
  needsRefresh = false,
}: {
  presenceName: string;
  initialReach?: Reach | null;
  needsRefresh?: boolean;
}) {
  const [reach, setReach] = useState<Reach | null>(initialReach);

  useEffect(() => {
    if (!needsRefresh) return;
    let live = true;
    fetch("/api/presence/refresh", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (live && d?.ok && d.reach?.text) setReach(d.reach); })
      .catch(() => {});
    return () => { live = false; };
  }, [needsRefresh]);

  if (!reach?.text) return null;

  return (
    <div className="mb-6 border-l-2 border-line pl-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{presenceName}</div>
      <figure className="mt-1.5 max-w-xl">
        <blockquote className="serif-italic text-[1.15rem] leading-snug text-ink">“{reach.text}”</blockquote>
        {reach.author && <figcaption className="mt-1 text-xs text-slate-400">— {reach.author}</figcaption>}
      </figure>
    </div>
  );
}
