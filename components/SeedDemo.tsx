"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only helper: fill (or clear) a demo cohort with synthetic data so the
// facilitator dashboards and visualizations have something to show.
export default function SeedDemo({ code = "DEMOCOHORT" }: { code?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "seed" | "clear">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function seed() {
    setBusy("seed");
    setMsg(null);
    try {
      const r = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (r.ok) {
        router.push(`/facilitator?cohort=${encodeURIComponent(d.cohort)}`);
      } else {
        setMsg(d.error || "Couldn't generate demo data.");
      }
    } catch {
      setMsg("Couldn't generate demo data.");
    }
    setBusy(null);
  }

  async function clear() {
    if (!window.confirm(`Remove the demo cohort "${code}" and all its synthetic users and data?`)) return;
    setBusy("clear");
    setMsg(null);
    try {
      const r = await fetch(`/api/dev/seed?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      const d = await r.json();
      setMsg(r.ok ? `Removed demo cohort (${d.removedUsers} users).` : d.error || "Couldn't clear.");
      router.refresh();
    } catch {
      setMsg("Couldn't clear.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button onClick={seed} disabled={busy !== null} className="btn-ghost text-sm">
          {busy === "seed" ? "Generating…" : "✨ Demo cohort"}
        </button>
        <button onClick={clear} disabled={busy !== null} className="text-sm text-slate2 hover:text-clay">
          {busy === "clear" ? "Clearing…" : "Clear"}
        </button>
      </div>
      {msg && <span className="text-xs text-slate2">{msg}</span>}
    </div>
  );
}
