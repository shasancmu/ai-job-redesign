"use client";

import { useEffect, useRef, useState } from "react";
import type { Prediction } from "@/components/PredictReveal";

// L1 (reaction) + L0 (pre-judgment) capture, shown once under a finished report.
// The pre is posted silently on mount (from the predict-gate); the reaction is a
// single applicability item — relevance to a real decision, not satisfaction. Both
// go to /api/measure keyed by the run code, so they join to the randomized arm.
export default function ReactionCapture({ code, prediction }: { code: string; prediction?: Prediction | null }) {
  const [done, setDone] = useState(false);
  const [val, setVal] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const sentPre = useRef(false);

  // Store the L0 pre once, in the background.
  useEffect(() => {
    if (sentPre.current || !prediction?.text) return;
    sentPre.current = true;
    fetch("/api/measure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, prediction }) }).catch(() => {});
  }, [code, prediction]);

  async function submit(applicability: number) {
    setVal(applicability);
    setDone(true);
    try {
      await fetch("/api/measure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, reaction: { applicability, comment } }) });
    } catch { /* additive; never block */ }
  }

  if (done) {
    return (
      <div className="no-print mt-6 rounded-2xl border border-line bg-mist/40 p-4 text-sm text-slate-500">
        Thanks — noted.
      </div>
    );
  }

  return (
    <div className="no-print mt-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-sm font-semibold text-ink">How directly does this apply to a real decision you&apos;re facing right now?</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => submit(n)}
            className={"h-9 w-9 rounded-full border text-sm font-semibold transition " + (val === n ? "border-ai bg-ai text-white" : "border-line bg-white text-slate-600 hover:border-ai hover:text-ai")}
          >
            {n}
          </button>
        ))}
        <span className="ml-1 text-xs text-slate-400">1 = not really · 5 = a decision I&apos;m in now</span>
      </div>
      <input
        className="field mt-3 text-sm"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional: the decision it applies to"
      />
    </div>
  );
}
