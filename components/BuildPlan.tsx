"use client";

import { useState } from "react";
import Link from "next/link";
import PlanView from "@/components/PlanView";

// Generates the structured implementation plan (both halves). By default it
// links to the stunning /plan/[code] page; with `inline` it renders the plan
// right here (used as the finale of the solo exercise).
export default function BuildPlan({
  sessionId,
  code,
  jobTitle,
  jobDescription,
  grid,
  inline = false,
  initialPlan = null,
  onPlan,
}: {
  sessionId: string;
  code: string;
  jobTitle?: string;
  jobDescription?: string;
  grid: Record<string, string[]>;
  inline?: boolean;
  initialPlan?: any;
  onPlan?: (plan: any) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<any>(hasPlanContent(initialPlan) ? initialPlan : null);
  const [err, setErr] = useState<string | null>(null);

  const hasContent = ["search", "structure", "think", "translate", "lead", "own", "judge", "integrate"].some(
    (k) => (grid[k] || []).length > 0
  );
  const ready = inline ? !!plan : plan === "done";

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
      if (res.ok && d.plan) {
        onPlan?.(d.plan);
        setPlan(inline ? d.plan : "done");
      } else {
        setErr(d.error || "Couldn't build the plan.");
      }
    } catch {
      setErr("Couldn't build the plan.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div className="card p-6 text-center">
        <div className="text-lg font-bold text-ink">Make it real</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate2">
          Turn the redesign into a beautiful, specific plan — where your week should go, the value you lead,
          and the AI recipes (with where to look) to run this week.
        </p>
        {err && <p className="mt-3 text-sm text-clay">{err}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {!ready ? (
            <button onClick={build} disabled={busy || !hasContent} className="btn-primary">
              {busy ? "Building your plan…" : "✨ Build implementation plan"}
            </button>
          ) : (
            <>
              {!inline && (
                <Link href={`/plan/${code}`} className="btn-primary">
                  View your plan →
                </Link>
              )}
              <button onClick={build} disabled={busy} className="btn-ghost text-sm">
                {busy ? "…" : "Rebuild"}
              </button>
            </>
          )}
        </div>
      </div>

      {inline && plan && <PlanView plan={plan} embedded />}
    </div>
  );
}

function hasPlanContent(p: any) {
  return (
    p && (p.headline || p.summary || (p.human?.length || 0) + (p.ai?.length || 0) > 0)
  );
}
