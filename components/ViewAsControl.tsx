"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Superadmin control: enter an email to render the consumer pages as that user
// (read-only). Lives on /admin.
export default function ViewAsControl() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function start() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Couldn't start."); setBusy(false); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErr("Couldn't start.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="text-sm font-bold text-ink">View as a user</div>
      <p className="mt-1 text-xs text-slate-400">
        Render the dashboard &amp; paywall as this person — their runs balance and consumer view. Read-only; you can&apos;t act as them.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className="field flex-1"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@example.com"
          onKeyDown={(e) => { if (e.key === "Enter" && email.includes("@")) start(); }}
        />
        <button onClick={start} disabled={busy || !email.includes("@")} className="btn-dark shrink-0 text-sm">
          {busy ? "Loading…" : "View as →"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-clay">{err}</p>}
    </div>
  );
}
