"use client";

import { useState } from "react";
import { interviewHelp } from "@/lib/interviewHelp";

// The blank-page helper for a stuck interviewee: a few tappable starter phrases
// that prefill the box, plus a subtle "why we ask" tied to the module's method.
// Deliberately quiet: it only appears in the first few turns while the box is
// empty, then gets out of the way once the person is in flow.
export default function InterviewHelper({
  module,
  answered,
  hasDraft,
  onInsert,
}: {
  module?: string;
  answered: number;
  hasDraft: boolean;
  onInsert: (text: string) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const help = interviewHelp(module);

  // Scaffold early only, and never while they're already typing.
  if (answered >= 3 || hasDraft) return null;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-400">Not sure what to say?</span>
        {help.starters.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onInsert(s)}
            className="rounded-full border border-line px-2.5 py-1 text-left text-slate-500 transition hover:border-slate-300 hover:text-ink"
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          className="text-slate-400 underline-offset-2 hover:text-ink hover:underline"
        >
          Why we ask
        </button>
      </div>
      {showWhy && <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-slate-400">{help.why}</p>}
    </div>
  );
}
