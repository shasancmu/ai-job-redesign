"use client";

import { useState } from "react";
import Link from "next/link";

// The curator (global) / director (org) decision surface.
export default function ReviewQueue({ initial }: { initial: any[] }) {
  const [rows, setRows] = useState<any[]>(initial);
  const [busy, setBusy] = useState("");

  async function decide(id: string, decision: string) {
    setBusy(id + decision);
    const note = decision === "rejected" ? (window.prompt("Optional note to the author:") || "") : "";
    const res = await fetch("/api/mechanics/promote/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision, note }) });
    setBusy("");
    if (res.ok) setRows((r) => r.map((x) => (x.id === id ? { ...x, status: decision } : x)));
  }

  if (rows.length === 0) return <p className="mt-6 text-sm text-slate-500">Nothing to review right now.</p>;

  return (
    <div className="mt-6 space-y-3">
      {rows.map((r) => {
        const u = r.readiness?.usage || {};
        const gate = r.readiness?.gate;
        const runHref = r.kind === "roleplay" ? `/m/${r.slug}` : r.kind === "negotiation" ? `/n/${r.slug}` : r.kind === "benchmark" ? `/b/${r.slug}` : r.kind === "analytical" ? `/x/${r.slug}` : r.kind === "redesign" ? `/rd/${r.slug}` : null;
        return (
          <div key={r.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.tier === "global" ? "bg-accent-soft text-accent" : "bg-mist text-slate-600"}`} style={r.tier === "global" ? { background: "var(--ai-soft, #e8eef7)", color: "var(--ai, #26457a)" } : {}}>{r.tier === "global" ? "🌐 Global" : "🏢 Org"}</span>
              <span className="font-semibold text-ink">{r.slug}</span>
              <span className="font-mono text-[11px] text-slate-400">{r.kind}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] ${r.status === "pending" ? "bg-amber-soft text-amber" : r.status === "approved" ? "bg-sage-soft text-sage" : "bg-mist text-slate-500"}`}>{r.status}</span>
            </div>
            {u.supported && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{u.learners} learners</span><span>{u.cohorts} cohorts</span><span>completion {u.completionRate == null ? "—" : Math.round(u.completionRate * 100) + "%"}</span><span>score {u.scoreLow ?? "—"}–{u.scoreHigh ?? "—"}</span><span>right-call {u.correctPct == null ? "—" : u.correctPct + "%"}</span>
              </div>
            )}
            {r.readiness?.evidence && <div className="mt-1 text-xs text-slate-500">Critic ready: {r.readiness.evidence.criticReady ? "✓" : "✗"} · Playtest discriminates: {r.readiness.evidence.playtestSeparates ? "✓" : "✗"}</div>}
            {r.decayFlags?.length > 0 && <div className="mt-1 text-xs text-clay">⚠ {r.decayFlags.join(" ")}</div>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {runHref && <Link href={runHref} target="_blank" className="btn-ghost text-sm">Preview →</Link>}
              {r.status !== "approved" && <button onClick={() => decide(r.id, "approved")} disabled={!!busy} className="btn-primary text-sm">Approve</button>}
              {r.status === "pending" && <button onClick={() => decide(r.id, "rejected")} disabled={!!busy} className="btn-ghost text-sm">Reject</button>}
              {r.status === "approved" && <button onClick={() => decide(r.id, "demoted")} disabled={!!busy} className="btn-ghost text-sm text-clay">Demote</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
