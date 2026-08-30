"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Trigger the self-improvement agent over a small batch of the most-stale
// modules. Each click runs a few (AI cost), so quality can be walked up over time.
export default function AgentRunner() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function run(count: number) {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const res = await fetch("/api/admin/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Run failed."); setBusy(false); return; }
      setMsg(`Ran ${data.ran} module${data.ran === 1 ? "" : "s"}.`);
      setBusy(false);
      router.refresh();
    } catch { setErr("Run failed."); setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={() => run(3)} disabled={busy} className="btn-dark text-sm">{busy ? "Running the agent…" : "▶ Run the agent (3 modules)"}</button>
      {msg && <span className="text-sm font-medium text-sage">{msg}</span>}
      {err && <span className="text-sm text-clay">{err}</span>}
      {busy && <span className="text-xs text-slate-400">A synthetic learner is working through each — ~30–60s.</span>}
    </div>
  );
}
