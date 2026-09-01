"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// "Click an email to understand someone" — resolve an email to their profile.
export default function PersonLookup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!email.trim()) return;
    setBusy(true); setErr("");
    try {
      const d = await fetch(`/api/team/person/lookup?email=${encodeURIComponent(email.trim())}`, { cache: "no-store" }).then((r) => r.json());
      if (d?.id) router.push(`/team/person/${d.id}`);
      else setErr(d?.error || "Not found.");
    } catch { setErr("Couldn't look that up."); }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field max-w-xs flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          placeholder="Understand a student — enter their email"
          type="email"
        />
        <button onClick={go} disabled={busy} className="btn-dark text-sm">{busy ? "…" : "Open"}</button>
      </div>
      {err && <p className="mt-1.5 text-sm text-red-700">{err}</p>}
    </div>
  );
}
