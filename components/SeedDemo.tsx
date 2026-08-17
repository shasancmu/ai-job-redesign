"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only helper: fill (or clear) a demo cohort with synthetic data so the
// facilitator dashboards and visualizations have something to show.
export default function SeedDemo({ code = "DEMOCOHORT" }: { code?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "seed" | "clear">(null);

  async function seed() {
    setBusy("seed");
    try {
      const r = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (r.ok) router.push(`/facilitator?cohort=${encodeURIComponent(d.cohort)}`);
      else window.alert(d.error || "Couldn't generate demo data.");
    } catch {
      window.alert("Couldn't generate demo data.");
    }
    setBusy(null);
  }

  async function clear() {
    if (!window.confirm(`Remove the demo cohort "${code}" and all its synthetic users and data?`)) return;
    setBusy("clear");
    try {
      const r = await fetch(`/api/dev/seed?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) window.alert(d.error || "Couldn't clear.");
      router.refresh();
    } catch {
      window.alert("Couldn't clear.");
    }
    setBusy(null);
  }

  return (
    <>
      <button onClick={seed} disabled={busy !== null} className="btn-ghost text-sm">
        {busy === "seed" ? "Generating…" : "✨ Demo data"}
      </button>
      <button
        onClick={clear}
        disabled={busy !== null}
        title="Remove the demo cohort"
        className="text-sm text-slate2 hover:text-clay disabled:opacity-50"
      >
        {busy === "clear" ? "Clearing…" : "Clear"}
      </button>
    </>
  );
}
