"use client";

import { useState } from "react";

export default function NetworkDescribe({ cohort }: { cohort: string }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/network/describe?cohort=${encodeURIComponent(cohort)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.text) setText(data.text);
      else setErr(data.reason === "ai-off" ? "Add an AI key (AI_API_KEY) to enable this." : "Couldn't generate a description.");
    } catch {
      setErr("Couldn't generate a description.");
    }
    setBusy(false);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">AI read of the network</div>
        <button onClick={run} disabled={busy} className="btn-primary text-sm">
          {busy ? "Analyzing…" : text ? "Regenerate" : "✨ Describe the network"}
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-clay">{err}</p>}
      {text && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink">{text}</p>}
    </div>
  );
}
