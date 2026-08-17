"use client";

import { useState } from "react";

export default function PayButton({
  label,
  plan = "all",
}: {
  label: string;
  plan?: "all" | "cohort";
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErr(data.error || "Could not start checkout.");
    } catch {
      setErr("Could not start checkout.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button onClick={go} disabled={busy} className="btn-primary w-full">
        {busy ? "Redirecting to secure checkout…" : label}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
