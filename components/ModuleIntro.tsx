"use client";

import { useCallback, useEffect, useState } from "react";
import type { IntroStep } from "@/lib/moduleIntros";

// The first-run teaching moment for a module: a few quick cards, then it steps
// aside. Shows once (localStorage), and a discreet "How this works" chip lets
// anyone replay it. Fast to dismiss — Skip or Esc starts the exercise.
export default function ModuleIntro({ slug, name, steps }: { slug: string; name: string; steps: IntroStep[] }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const key = "intro-seen:" + slug;

  useEffect(() => {
    let seen = "1";
    try { seen = localStorage.getItem(key) || ""; } catch {}
    if (!seen) { const t = setTimeout(() => { setI(0); setOpen(true); }, 350); return () => clearTimeout(t); }
  }, [key]);

  const close = useCallback(() => { try { localStorage.setItem(key, "1"); } catch {} setOpen(false); }, [key]);
  const replay = () => { setI(0); setOpen(true); };
  const next = useCallback(() => { if (i >= steps.length - 1) close(); else setI(i + 1); }, [i, steps.length, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next]);

  if (!steps.length) return null;

  if (!open) {
    return (
      <button
        onClick={replay}
        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-line bg-white/95 px-3 py-2 text-xs font-medium text-slate-500 shadow-soft backdrop-blur transition hover:text-ink lg:bottom-auto lg:top-20"
      >
        <span aria-hidden>💡</span> How this works
      </button>
    );
  }

  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 px-6" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-1.5">
          {steps.map((_, n) => (
            <span key={n} className="h-1.5 flex-1 rounded-full transition" style={{ background: n <= i ? "var(--brand, #3F7A52)" : "#e2e8f0" }} />
          ))}
        </div>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{name} · {i + 1} of {steps.length}</div>
        <h2 className="mt-1 text-xl font-bold text-ink">{step.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={close} className="text-sm text-slate-400 hover:text-ink">Skip</button>
          <div className="flex items-center gap-2">
            {i > 0 && <button onClick={() => setI(i - 1)} className="btn-ghost text-sm">Back</button>}
            <button onClick={next} className="btn-primary text-sm">{last ? "Start →" : "Next →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
