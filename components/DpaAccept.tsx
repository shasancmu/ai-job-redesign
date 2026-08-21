"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type DpaOrgRow = { id: string; name: string; acceptedAt: string | null; acceptedBy: string | null };

// Per-organization accept panel, shown at the top of /dpa for directors.
export default function DpaAccept({ orgs }: { orgs: DpaOrgRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function accept(id: string) {
    setBusy(id); setErr(null);
    try {
      const res = await fetch("/api/dpa/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't record acceptance.");
      router.refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  if (!orgs.length) return null;

  return (
    <div className="mb-10 space-y-3 rounded-2xl border border-line bg-mist p-5">
      <div className="text-sm font-semibold text-ink">Accept for your organization</div>
      {orgs.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3">
          <div className="min-w-0">
            <div className="font-medium text-ink">{o.name}</div>
            {o.acceptedAt ? (
              <div className="text-xs text-sage">Accepted {new Date(o.acceptedAt).toLocaleDateString()}{o.acceptedBy ? ` by ${o.acceptedBy}` : ""}</div>
            ) : (
              <div className="text-xs text-slate-400">Not yet accepted</div>
            )}
          </div>
          {o.acceptedAt ? (
            <span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-sage">✓ Accepted</span>
          ) : (
            <button onClick={() => accept(o.id)} disabled={busy === o.id} className="btn-primary text-sm">{busy === o.id ? "Recording…" : "Accept the DPA"}</button>
          )}
        </div>
      ))}
      {err && <p className="text-sm text-clay">{err}</p>}
      <p className="text-xs text-slate-400">By accepting, you confirm you&apos;re authorized to bind your organization to the terms below.</p>
    </div>
  );
}
