"use client";

import { useState } from "react";

export default function ResetBenchmarkButton({ cohort }: { cohort: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function reset() {
    if (!confirm("Clear all benchmark scores for this cohort? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch("/api/benchmark/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => window.location.reload(), 600);
    } else {
      alert("Couldn't reset — try again.");
    }
  }

  return (
    <button onClick={reset} disabled={busy} className="btn-ghost text-sm">
      {busy ? "Clearing…" : done ? "Cleared" : "Reset results"}
    </button>
  );
}
