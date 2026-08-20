"use client";

import { useEffect, useState } from "react";

type FacOrg = { slug: string; name: string };

// A one-time welcome for someone who's just been made a facilitator of an org.
// Facilitators are *assigned* (they didn't opt in), so without this they'd only
// discover the role by noticing their dashboard changed. Dismissal is kept in
// localStorage (keyed by org), so it shows once per browser — no backend.
export default function FacilitatorWelcome({ orgs }: { orgs: FacOrg[] }) {
  const [show, setShow] = useState<FacOrg | null>(null);

  useEffect(() => {
    for (const o of orgs) {
      let seen = "1";
      try { seen = localStorage.getItem("fac-welcome:" + o.slug) || ""; } catch {}
      if (!seen) { setShow(o); break; }
    }
  }, [orgs]);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem("fac-welcome:" + show.slug, "1"); } catch {}
    setShow(null);
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft" style={{ borderLeft: "4px solid var(--brand, #4A6A4E)" }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-white" style={{ background: "var(--brand, #4A6A4E)" }} aria-hidden>
        ★
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink">You&apos;re now a facilitator for {show.name}.</div>
        <div className="mt-0.5 text-sm text-slate2">Run live activities, open cohorts, and review the room&apos;s work from the facilitator hub.</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a href="/facilitator" onClick={dismiss} className="btn-primary text-sm">Open the hub →</a>
        <button onClick={dismiss} aria-label="Dismiss" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-mist hover:text-ink">✕</button>
      </div>
    </div>
  );
}
