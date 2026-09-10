"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// A small delete control for a studio module. Confirms first (delete is
// permanent), calls the author-gated delete route, then refreshes the list.
export default function DeleteModuleButton({ kind, slug, name, redirectTo }: { kind: string; slug: string; name: string; redirectTo?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function del() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/studio/delete-module", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, slug }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "Couldn't delete."); setBusy(false); return; }
      if (redirectTo) { window.location.href = redirectTo; return; }
      router.refresh();
    } catch { setErr("Couldn't reach the server."); setBusy(false); }
  }

  if (!confirming) {
    return <button onClick={() => setConfirming(true)} className="btn-ghost text-xs text-clay hover:text-clay">Delete</button>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-slate-500">Delete “{name.length > 24 ? name.slice(0, 23) + "…" : name}”?</span>
      <button onClick={del} disabled={busy} className="rounded-full bg-clay px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">{busy ? "…" : "Yes, delete"}</button>
      <button onClick={() => setConfirming(false)} disabled={busy} className="text-xs text-slate-400 hover:text-ink">Cancel</button>
      {err && <span className="text-xs text-clay">{err}</span>}
    </span>
  );
}
