"use client";

import { useState } from "react";
import ShareBar from "@/components/ShareBar";

// Drop-in "Share this report" control for owner-facing report pages. Sharing is
// opt-in: clicking mints the public link (via /api/share/enable), then reveals
// the full share row. Anyone with the resulting link can view the report,
// no account, so we say so plainly.
export default function ShareReport({ code, title, text }: { code: string; title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function enable() {
    if (url) { setOpen(!open); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/share/enable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json();
      if (res.ok && d.url) { setUrl(d.url); setOpen(true); }
      else setErr(d.error || "Couldn't create a share link.");
    } catch { setErr("Couldn't create a share link."); }
    setBusy(false);
  }

  return (
    <div className="relative print:hidden">
      <button onClick={enable} disabled={busy} className="btn-ghost text-sm disabled:opacity-50">
        {busy ? "Creating link…" : "↗ Share"}
      </button>
      {err && <p className="absolute right-0 mt-1 text-xs text-clay">{err}</p>}
      {open && url && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,440px)] rounded-2xl border border-line bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Share this report</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-ink">✕</button>
            </div>
            <ShareBar url={url} title={title} text={text} />
            <p className="mt-2 text-xs text-slate-400">Anyone with this link can view the report, no account needed.</p>
          </div>
        </>
      )}
    </div>
  );
}
