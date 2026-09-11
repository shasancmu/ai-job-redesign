"use client";

import { useEffect, useRef, useState } from "react";

// A reassuring progress bar for the deep-tech rooms that run a real query
// (BigQuery warehouse, the sciscore models, web-evidence). We can't get true
// progress from a single fetch, so this eases a determinate bar toward ~96%
// over an expected duration and walks through named stages — the point is that
// people can see something is happening and roughly how long it takes, instead
// of staring at a spinning button and feeling like they're waiting for nothing.
// It lives inside a `{busy && <QueryProgress .../>}` and simply unmounts when the
// result arrives, so it never has to fake a final jump to 100%.
export default function QueryProgress({
  estimateMs = 20000,
  stages,
  note,
}: {
  estimateMs?: number;
  stages: string[];
  note?: string;
}) {
  const [pct, setPct] = useState(3);
  const [stageIdx, setStageIdx] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    start.current = Date.now();
    const tick = () => {
      const t = Date.now() - start.current;
      // Asymptotic ease: ~92% of the way there at t = estimateMs, then it keeps
      // creeping (capped at 96%) so a slow cold start still feels like progress.
      const frac = 1 - Math.exp(-t / (estimateMs / 2.5));
      setPct(Math.min(96, 3 + frac * 93));
      setStageIdx(Math.min(stages.length - 1, Math.floor((t / estimateMs) * stages.length)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [estimateMs, stages.length]);

  const secs = Math.round(estimateMs / 1000);
  return (
    <div className="rounded-2xl border border-line bg-white p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{stages[stageIdx]}</span>
        <span className="shrink-0 tabular-nums text-slate-400">{Math.round(pct)}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-ai transition-all duration-500 ease-out" style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{note || `This usually takes about ${secs}s. You can leave this open.`}</p>
    </div>
  );
}
