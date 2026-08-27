"use client";

import { useEffect, useState } from "react";

export default function Timer({
  startedAt,
  minutes,
  onReset,
  onAdvance,
}: {
  startedAt: string | null;
  minutes: number;
  onReset: () => void;
  onAdvance?: () => void; // when the step runs over, offer a gentle "move on"
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
  // Gentle pacing, never an alarm: a quiet halfway tick, then a calm amber for
  // the last stretch and over-time, rather than a stressful red.
  const nearEnd = !over && remaining <= Math.max(30, total * 0.15);
  const winding = nearEnd || over;
  const pct = Math.min(100, (elapsed / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="relative hidden h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 sm:block">
        <div
          className={"h-full transition-all " + (winding ? "bg-amber-400" : "bg-ai")}
          style={{ width: `${pct}%` }}
        />
        {/* halfway marker — a soft "about halfway" cue */}
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/70" />
      </div>
      <div
        className={
          "min-w-[68px] text-center font-mono text-xl font-bold tabular-nums " +
          (winding ? "text-amber-600" : "text-ink")
        }
      >
        {over ? "0:00" : `${mm}:${ss.toString().padStart(2, "0")}`}
      </div>
      {over && onAdvance && (
        <button
          onClick={onAdvance}
          className="timer-nudge rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
        >
          Time&apos;s up · Next →
        </button>
      )}
      <button
        onClick={onReset}
        title="Restart this step's timer"
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
      >
        ↻
      </button>
      <style>{`@keyframes timer-nudge-k { 0%,100% { opacity: 1; } 50% { opacity: .6; } } .timer-nudge { animation: timer-nudge-k 1.6s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .timer-nudge { animation: none; } }`}</style>
    </div>
  );
}
