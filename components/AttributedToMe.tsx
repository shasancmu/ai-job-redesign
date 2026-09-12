"use client";

import { useState } from "react";

// Modules someone else credited to you. A pending one waits for you to accept; an
// active one you can disavow. Your name, your control.
type Row = { slug: string; name: string; emoji: string; by: string; status: string };

export default function AttributedToMe({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(slug: string, action: "accept" | "remove") {
    setBusy(slug);
    try {
      const res = await fetch("/api/creator/attribution", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action }),
      });
      if (res.ok) {
        const d = await res.json();
        setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, status: d.status } : r)));
      }
    } catch { /* leave as-is */ }
    setBusy(null);
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.slug} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
          <div className="text-xl">{r.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
            <div className="text-xs text-slate-400">Credited to you by {r.by}{r.status === "removed" ? " · removed" : r.status === "pending" ? " · awaiting your OK" : ""}</div>
          </div>
          {r.status === "pending" && (
            <button onClick={() => act(r.slug, "accept")} disabled={busy === r.slug} className="btn-primary text-xs disabled:opacity-40">Accept</button>
          )}
          {r.status !== "removed" ? (
            <button onClick={() => act(r.slug, "remove")} disabled={busy === r.slug} className="btn-ghost text-xs disabled:opacity-40">Remove</button>
          ) : (
            <button onClick={() => act(r.slug, "accept")} disabled={busy === r.slug} className="btn-ghost text-xs disabled:opacity-40">Restore</button>
          )}
        </div>
      ))}
    </div>
  );
}
