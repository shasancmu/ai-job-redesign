"use client";

import { useState } from "react";

export type Prediction = { text: string; why?: string; rating?: number; at: string };

// The predict step: shown once, right before the AI report generates. The
// learner commits their own answer first (a soft gate: Reveal stays disabled
// until they write something), so the reveal becomes a calibration moment
// instead of passive reception. Kept to one sentence so it's fast, not a chore.
export default function PredictReveal({
  prompt,
  placeholder = "Your honest guess, in a sentence.",
  ratingLabel,
  onSubmit,
  revealLabel = "Reveal it →",
}: {
  prompt: string;
  placeholder?: string;
  ratingLabel?: string;
  onSubmit: (p: Prediction) => void;
  revealLabel?: string;
}) {
  const [text, setText] = useState("");
  const [why, setWhy] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const ok = text.trim().length > 0;

  function submit() {
    if (!ok) return;
    onSubmit({ text: text.trim(), why: why.trim() || undefined, rating: rating ?? undefined, at: new Date().toISOString() });
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 px-6" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Before you see it</div>
        <h2 className="mt-1 text-lg font-bold leading-snug text-ink">{prompt}</h2>
        <p className="mt-2 text-xs text-slate-400">No peeking, commit your guess first. The gap between it and the result is the whole point.</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          rows={3}
          autoFocus
          placeholder={placeholder}
          className="field mt-3 w-full resize-none"
        />

        <input
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="In your own words, why? (optional, but it makes the reveal land harder)"
          className="field mt-2 w-full text-sm"
        />

        {ratingLabel && (
          <div className="mt-4">
            <div className="text-sm text-slate-600">{ratingLabel}</div>
            <div className="mt-1.5 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={"h-9 w-9 rounded-full border text-sm font-semibold transition " + (rating === n ? "border-transparent bg-ink text-white" : "border-line text-slate-500 hover:border-slate-300")}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Not at all</span><span>Completely</span></div>
          </div>
        )}

        <button onClick={submit} disabled={!ok} className="btn-primary mt-6 w-full disabled:opacity-40">{revealLabel}</button>
      </div>
    </div>
  );
}
