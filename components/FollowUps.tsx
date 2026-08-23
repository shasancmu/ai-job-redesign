"use client";

import { useState } from "react";
import type { FollowUp } from "@/lib/followups";

// The dashboard check-in surface: due follow-ups from past exercises. Each asks
// the learner to recall the takeaway (retrieval practice) and report how the
// commitment went, then closes the loop.
export default function FollowUps({ items }: { items: FollowUp[] }) {
  const [remaining, setRemaining] = useState(items);
  if (remaining.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: "#CE8F2C" }} />
        <h3 className="text-sm font-bold text-ink">Check in on your commitments</h3>
      </div>
      <div className="space-y-3">
        {remaining.map((f) => (
          <FollowUpCard key={f.code} f={f} onDone={() => setRemaining((r) => r.filter((x) => x.code !== f.code))} />
        ))}
      </div>
    </section>
  );
}

function FollowUpCard({ f, onDone }: { f: FollowUp; onDone: () => void }) {
  const [recall, setRecall] = useState("");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(o: string) {
    setOutcome(o);
    setBusy(true);
    try {
      await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: f.code, recall, outcome: o }),
      });
    } catch {
      /* fail soft */
    }
    setBusy(false);
    setTimeout(onDone, 700);
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">From “{f.moduleName}”</div>
      {f.commitment?.text && <div className="mt-1 text-sm text-slate-600">You committed: <span className="font-medium text-ink">{f.commitment.text}</span></div>}

      <div className="mt-3">
        <div className="text-sm text-slate-600">Before we show it back — what was your main takeaway?</div>
        <input className="field mt-1.5 w-full text-sm" value={recall} onChange={(e) => setRecall(e.target.value)} placeholder="From memory, in a few words." disabled={busy || !!outcome} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Did you follow through?</span>
        {[
          { k: "done", label: "Did it" },
          { k: "partly", label: "Partly" },
          { k: "not-yet", label: "Not yet" },
        ].map((o) => (
          <button
            key={o.k}
            onClick={() => save(o.k)}
            disabled={busy || !!outcome}
            className={"rounded-full border px-3 py-1 text-sm font-medium transition " + (outcome === o.k ? "border-transparent bg-ink text-white" : "border-line text-slate-600 hover:border-slate-300")}
          >
            {o.label}
          </button>
        ))}
        <a href={`/room/${f.code}`} className="ml-auto text-sm font-medium text-sage hover:underline">Revisit &rarr;</a>
      </div>
    </div>
  );
}
