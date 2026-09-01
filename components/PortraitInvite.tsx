"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// A gentle, dismissible nudge to the portrait interview — shown only to people
// who haven't done it yet. Self-contained: checks their own portrait on mount.
export default function PortraitInvite() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let live = true;
    try { if (localStorage.getItem("portrait_dismissed") === "1") return; } catch { /* ignore */ }
    fetch("/api/portrait").then((r) => r.json()).then((d) => {
      if (live && d?.ok && !d.reflection && !d.portrait) setShow(true);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <div className="text-sm font-bold text-ink">Tell us who you are</div>
        <p className="mt-0.5 max-w-lg text-sm text-slate2">A few minutes so the people who teach you actually understand you — and you leave with a clearer sense of what you&apos;re working toward.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/portrait" className="btn-primary text-sm">Start</Link>
        <button onClick={() => { try { localStorage.setItem("portrait_dismissed", "1"); } catch { /* ignore */ } setShow(false); }} className="text-slate-400 hover:text-ink" aria-label="Not now">✕</button>
      </div>
    </div>
  );
}
