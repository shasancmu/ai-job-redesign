"use client";

import { useState } from "react";

// An inline predict-then-reveal checkpoint inside a lesson. Multiple-choice (pass
// `choices` + `answer` index) or free-guess (omit them). The reveal is the
// teaching moment — the gap between the guess and the answer is the point.
export default function LessonPredict({
  prompt,
  choices,
  answer,
  reveal,
}: {
  prompt: string;
  choices?: string[];
  answer?: number;
  reveal: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);

  const canReveal = choices ? picked !== null : text.trim().length > 0;

  return (
    <div className="my-6 rounded-2xl border-2 border-dashed border-sky/40 bg-sky-soft/40 p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky">Predict first</div>
      <p className="mt-1 font-semibold text-ink">{prompt}</p>

      {choices ? (
        <div className="mt-3 space-y-2">
          {choices.map((c, i) => {
            const isPicked = picked === i;
            const isAnswer = revealed && answer === i;
            const isWrongPick = revealed && isPicked && answer !== i;
            return (
              <button
                key={i}
                type="button"
                disabled={revealed}
                onClick={() => setPicked(i)}
                className={
                  "flex w-full items-center gap-2 rounded-xl border-2 p-3 text-left text-sm transition " +
                  (isAnswer
                    ? "border-sage bg-sage-soft text-ink"
                    : isWrongPick
                      ? "border-clay bg-clay-soft text-ink"
                      : isPicked
                        ? "border-ink bg-white"
                        : "border-slate-200 bg-white hover:border-slate-300")
                }
              >
                <span className={"flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold " + (isPicked || isAnswer ? "bg-ink text-white" : "bg-mist text-slate-500")}>
                  {String.fromCharCode(65 + i)}
                </span>
                {c}
              </button>
            );
          })}
        </div>
      ) : (
        <input className="field mt-3 w-full text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your honest guess…" disabled={revealed} />
      )}

      {!revealed ? (
        <button onClick={() => setRevealed(true)} disabled={!canReveal} className="btn-primary mt-3 text-sm disabled:opacity-40">Reveal</button>
      ) : (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-ink">The answer: </span>{reveal}
        </div>
      )}
    </div>
  );
}
