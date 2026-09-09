"use client";

import { useState } from "react";

// Post-report "reflect & commit": a calibration check (how close was your
// prediction) and an implementation intention (if-then + a date). Gollwitzer's
// if-then format roughly doubles follow-through vs. a plain to-do. Self-contained
// via the session code; the saved date seeds the spaced follow-up.
export default function ReflectCommit({ code, hasPrediction }: { code: string; hasPrediction?: boolean }) {
  const [calibration, setCalibration] = useState<number | null>(null);
  const [ifPart, setIfPart] = useState("");
  const [thenPart, setThenPart] = useState("");
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSave = (hasPrediction && calibration) || thenPart.trim().length > 0;

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, calibration, ifPart, thenPart, date }),
      });
      setSaved(true);
    } catch {
      setSaved(true); // fail soft; don't block the learner
    }
    setBusy(false);
  }

  const whenLabel = date ? new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

  if (saved) {
    return (
      <div className="mt-5 rounded-2xl border border-sage/30 bg-sage-soft p-4 no-print">
        <div className="text-sm font-semibold text-ink">Committed.</div>
        <p className="mt-0.5 text-sm text-slate-600">
          {thenPart
            ? <>We&apos;ll remind you{whenLabel ? ` on ${whenLabel}` : " in a few days"} — it&apos;ll show up on your dashboard so you actually follow through.</>
            : <>Saved. You&apos;ll find this reflection with your report whenever you come back to it.</>}
        </p>
      </div>
    );
  }

  const CAL = ["Way off", "", "Half right", "", "Spot on"];

  return (
    <div className="mt-5 rounded-2xl border border-line bg-white p-5 no-print">
      <div className="text-xs font-semibold uppercase tracking-wide text-sage">Before you go — lock it in</div>
      <p className="mt-1 text-sm text-slate-600">What you just worked out fades within a day. Name one concrete move you&apos;ll make, tie it to a moment, and we&apos;ll remind you — so the exercise turns into something you actually do.</p>

      {hasPrediction && (
        <div className="mt-3">
          <div className="text-sm text-slate-600">How close was your prediction?</div>
          <div className="mt-1.5 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setCalibration(n)}
                className={"h-9 w-9 rounded-full border text-sm font-semibold transition " + (calibration === n ? "border-transparent bg-ink text-white" : "border-line text-slate-500 hover:border-slate-300")}>
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Way off</span><span>Spot on</span></div>
        </div>
      )}

      <div className="mt-4">
        <div className="text-sm font-medium text-ink">Your next move, as an “if-then”</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="field text-sm" value={ifPart} onChange={(e) => setIfPart(e.target.value)} placeholder="When… (a moment or trigger)" />
          <input className="field text-sm" value={thenPart} onChange={(e) => setThenPart(e.target.value)} placeholder="…I will (a specific action)" />
          <input type="date" className="field text-sm" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Remind me by" />
        </div>
        <div className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
          Example: <span className="italic text-slate-500">When it&apos;s Monday&apos;s planning meeting, I will propose handing the first draft to AI.</span><br />
          A move tied to a specific moment gets done far more often than a plain to-do.
        </div>
      </div>

      <button onClick={save} disabled={busy || !canSave} className="btn-primary mt-4 text-sm disabled:opacity-40">
        {busy ? "Saving…" : "Save & commit"}
      </button>
    </div>
  );
}
