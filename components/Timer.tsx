"use client";

import { useEffect, useState } from "react";

export default function Timer({
  startedAt,
  minutes,
  onReset,
}: {
  startedAt: string | null;
  minutes: number;
  onReset: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const total = minutes * 60;
  const started = startedAt ? new Date(startedAt).getTime() : now;
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  const remaining = Math.max(0, total - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const over = remaining === 0;
  const pct = Math.min(100, (elapsed / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 sm:block">
        <div
          className={"h-full transition-all " + (over ? "bg-red-500" : "bg-ai")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={
          "min-w-[68px] text-center font-mono text-xl font-bold tabular-nums " +
          (over ? "text-red-500" : "text-ink")
        }
      >
        {over ? "0:00" : `${mm}:${ss.toString().padStart(2, "0")}`}
      </div>
      <button
        onClick={onReset}
        title="Restart this step's timer"
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
      >
        ↻
      </button>
    </div>
  );
}
