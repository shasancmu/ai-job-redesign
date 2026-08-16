"use client";

import { useState } from "react";
import Link from "next/link";

// Generates the structured implementation plan (both halves) and links to the
// stunning /plan/[code] page.
export default function BuildPlan({
  sessionId,
  code,
  jobTitle,
  jobDescription,
  grid,
}: {
  sessionId: string;
  code: string;
  jobTitle?: string;
  jobDescription?: string;
  grid: Record<string, string[]>;
}) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasContent = ["search", "structure", "think", "translate", "lead", "own", "judge", "integrate"].some(
    (k) => (grid[k] || []).length > 0
  );

  async function build() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, jobTitle, jobDescription, grid }),
      });
      const d = await res.json();
      if (res.ok && d.plan) setReady(true);
      else setErr(d.error || "Couldn't build the plan.");
    } catch {
      setErr("Couldn't build the plan.");
    }
    setBusy(false);
  }

  return (
    <div className="card p-6 text-center">
      <div className="text-lg font-bold text-ink">Make it real</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate2">
        Turn the redesign into a beautiful, specific implementation plan — the value you lead, and the AI
        recipes to run this week.
      </p>
      {err && <p className="mt-3 text-sm text-clay">{err}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {!ready ? (
          <button onClick={build} disabled={busy || !hasContent} className="btn-primary">
            {busy ? "Building your plan…" : "✨ Build implementation plan"}
          </button>
        ) : (
          <>
            <Link href={`/plan/${code}`} className="btn-primary">
              View your plan →
            </Link>
            <button onClick={build} disabled={busy} className="btn-ghost text-sm">
              {busy ? "…" : "Rebuild"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
