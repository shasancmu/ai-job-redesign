"use client";

import { useEffect, useRef, useState } from "react";

// A "processing" progress bar for long, opaque AI generations where we can't know
// real progress. It eases toward ~92% over the expected duration (decelerating so
// it never stalls at a hard stop) and cycles a status line through the actual
// phases of the work, so the wait feels responsive. The parent unmounts it on
// completion — a finished generation swaps the whole view — so it doesn't need a
// "done" state. Honest about not knowing exact progress; it's a pacing cue.
export default function ProcessingBar({ steps, etaSeconds = 50, note }: { steps: string[]; etaSeconds?: number; note?: string }) {
  const [pct, setPct] = useState(5);
  const [idx, setIdx] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    start.current = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - start.current) / 1000;
      // Asymptotic approach to 92% — fast at first, slowing as it goes.
      const target = 92 * (1 - Math.exp(-t / (etaSeconds / 2.5)));
      setPct(Math.max(5, Math.min(92, target)));
      setIdx(Math.min(steps.length - 1, Math.floor(t / (etaSeconds / steps.length))));
    }, 180);
    return () => clearInterval(id);
  }, [etaSeconds, steps.length]);

  return (
    <div className="mt-4 rounded-2xl border border-line bg-white p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
          <svg className="h-4 w-4 shrink-0 animate-spin text-sage motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="truncate">{steps[idx]}…</span>
        </span>
        <span className="shrink-0 tabular-nums text-slate-400">{Math.round(pct)}%</span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-sage transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="mt-2 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
