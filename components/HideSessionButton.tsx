"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Facilitator control to hide/unhide one response from the cohort view + roll-ups.
export default function HideSessionButton({ code, hidden }: { code: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await fetch("/api/facilitator/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, hidden: !hidden }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={toggle} disabled={busy} className="text-xs font-medium text-slate-400 transition hover:text-clay disabled:opacity-50">
      {busy ? "…" : hidden ? "Unhide" : "Hide"}
    </button>
  );
}
