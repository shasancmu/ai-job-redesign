"use client";

import { useEffect, useState } from "react";

// A quiet reward for the curious: the Konami code reveals a small hidden note.
const SEQ = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export default function EasterEgg() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === SEQ[i] ? i + 1 : k === SEQ[0] ? 1 : 0;
      if (i === SEQ.length) { i = 0; setShow(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!show) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[60] max-w-xs rounded-2xl border border-line bg-white p-4 shadow-lift" role="dialog" aria-label="A hidden note">
      <div className="text-sm font-semibold text-ink">You found the quiet door.</div>
      <p className="mt-1 text-xs leading-relaxed text-slate2">Every corner of this was built on purpose, for you. Thanks for poking around.</p>
      <button onClick={() => setShow(false)} className="mt-2 text-[11px] font-medium text-slate-400 hover:text-ink">close</button>
    </div>
  );
}
