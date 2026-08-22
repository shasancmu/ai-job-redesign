"use client";

import { useCallback, useEffect, useState } from "react";

export type TourStep = { sel: string; title: string; body: string };

// A button anyone can place to replay the tour.
export function TourButton({ className = "btn-ghost text-sm", label = "Take a tour" }: { className?: string; label?: string }) {
  return <button onClick={() => window.dispatchEvent(new Event("app:start-tour"))} className={className}>{label}</button>;
}

// A dependency-free coach-mark tour: dims the screen, spotlights one element at
// a time via a box-shadow cutout, and floats a tooltip next to it. Auto-runs
// once (localStorage), and replays when any element dispatches "app:start-tour".
export default function Tour({ steps, storageKey, welcomeTitle, welcomeBody, auto = true }: { steps: TourStep[]; storageKey: string; welcomeTitle: string; welcomeBody: string; auto?: boolean }) {
  const [stage, setStage] = useState<"off" | "welcome" | number>("off");
  const [rect, setRect] = useState<DOMRect | null>(null);

  const finish = useCallback(() => {
    setStage("off");
    try { localStorage.setItem(storageKey, "1"); } catch {}
  }, [storageKey]);

  const goto = useCallback((idx: number) => {
    if (idx < 0) { setStage("welcome"); return; }
    if (idx >= steps.length) { finish(); return; }
    setStage(idx);
    const el = document.querySelector(steps[idx].sel) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [steps, finish]);

  // Auto-run once (unless auto is off — e.g. a walkthrough you open on demand),
  // and allow replay via a window event.
  useEffect(() => {
    if (!auto) return;
    let seen = "1";
    try { seen = localStorage.getItem(storageKey) || ""; } catch {}
    if (!seen) { const id = setTimeout(() => setStage("welcome"), 700); return () => clearTimeout(id); }
  }, [storageKey, auto]);

  useEffect(() => {
    const start = () => setStage("welcome");
    window.addEventListener("app:start-tour", start);
    return () => window.removeEventListener("app:start-tour", start);
  }, []);

  // Keep the spotlight aligned as things scroll/resize.
  useEffect(() => {
    if (typeof stage !== "number") { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(steps[stage].sel) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const id = setTimeout(measure, 350); // after smooth-scroll settles
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(id); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, [stage, steps]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stage === "off") return;
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") goto(typeof stage === "number" ? stage + 1 : 0);
      else if (e.key === "ArrowLeft") goto(typeof stage === "number" ? stage - 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, goto, finish]);

  if (stage === "off") return null;

  // ---- Welcome card (centered, no spotlight) ----
  if (stage === "welcome") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6" role="dialog" aria-modal>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div className="text-2xl">👋</div>
          <h2 className="mt-2 text-xl font-bold text-ink">{welcomeTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate2">{welcomeBody}</p>
          <div className="mt-5 flex items-center justify-between">
            <button onClick={finish} className="btn-ghost text-sm">Skip</button>
            <button onClick={() => goto(0)} className="btn-primary text-sm">Take the tour →</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Spotlight step ----
  const step = steps[stage];
  const pad = 8;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip position: below the hole if room, else above; clamp horizontally.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const TW = 320;
  let tipTop = 24, tipLeft = vw / 2 - TW / 2;
  if (hole) {
    const below = hole.top + hole.height + 12;
    const above = hole.top - 12;
    tipTop = below + 180 < vh ? below : Math.max(16, above - 180);
    tipLeft = Math.min(Math.max(16, hole.left + hole.width / 2 - TW / 2), vw - TW - 16);
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal>
      {/* Dim + spotlight (box-shadow cutout). Click-through blocked by this layer. */}
      {hole ? (
        <div
          className="pointer-events-auto absolute rounded-xl ring-2 ring-white/90 transition-all duration-200"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
          onClick={finish}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" onClick={finish} />
      )}

      {/* Tooltip */}
      <div className="pointer-events-auto absolute rounded-2xl bg-white p-4 shadow-xl" style={{ top: tipTop, left: tipLeft, width: TW }}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {stage + 1} of {steps.length}</div>
        <div className="mt-1 text-base font-bold text-ink">{step.title}</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-xs text-slate-400 hover:text-ink">Skip</button>
          <div className="flex items-center gap-2">
            {stage > 0 && <button onClick={() => goto(stage - 1)} className="btn-ghost text-sm">Back</button>}
            <button onClick={() => goto(stage + 1)} className="btn-primary text-sm">{stage === steps.length - 1 ? "Done" : "Next →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
