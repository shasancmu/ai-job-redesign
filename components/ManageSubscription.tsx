"use client";

import { useState } from "react";

export default function ManageSubscription() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErr(data.error || "Couldn't open billing.");
    } catch {
      setErr("Couldn't open billing.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button onClick={go} disabled={busy} className="btn-ghost">
        {busy ? "Opening…" : "Manage subscription"}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
