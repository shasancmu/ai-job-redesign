"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Tutor from "@/components/lessons/Tutor";
import LessonPredict from "@/components/lessons/LessonPredict";
import { CATEGORIES, moduleByExercise, moduleBySlug, moduleCategory } from "@/lib/modules";
import { nextAfter } from "@/lib/momentum";

// The chrome shared by every explainer lesson (How AI works, The PhD path).
// The lesson body is written as a flat run of <p>/<H2>/<LessonPredict>/etc., and
// this shell paginates it into a phone-friendly slide DECK: one idea per slide,
// a "predict" moment gets its own slide, swipe or tap to move, and the last
// slide finishes the session and pushes straight into the next module.
export default function LessonShell({
  session,
  title,
  topic,
  children,
}: {
  session: any;
  title: string;
  topic: string;
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  // Badge + next module derive from the current module.
  const mod = moduleByExercise(session.exercise);
  const cat = mod ? CATEGORIES.find((c) => c.key === moduleCategory(mod.slug)) : undefined;
  const nextSlug = mod ? nextAfter(mod.slug) : null;
  const next = nextSlug ? moduleBySlug(nextSlug) : undefined;

  const slides = useMemo(() => paginate(children), [children]);
  const n = slides.length;
  const last = i >= n - 1;
  const clamp = useCallback((k: number) => Math.max(0, Math.min(n - 1, k)), [n]);

  async function finish() {
    setBusy(true);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
    router.push(next ? `/start/${next.slug}` : "/dashboard");
  }

  // Keyboard arrows on desktop (ignored while the tutor sheet is open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (askOpen) return;
      if (e.key === "ArrowRight" && !last) setI((k) => clamp(k + 1));
      else if (e.key === "ArrowLeft") setI((k) => clamp(k - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askOpen, last, clamp]);

  // Swipe left/right on the slide viewport.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) setI((k) => clamp(dx < 0 ? k + 1 : k - 1));
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-5 py-4 sm:px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setAskOpen(true)} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-500 transition hover:text-ink">💬 Ask the tutor</button>
          {cat && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cat.chip}`}>{cat.title}</span>}
        </div>
      </div>

      {/* Progress + context */}
      <div className="mt-3 flex items-center gap-1">
        {slides.map((_, k) => (
          <span key={k} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: k <= i ? "var(--brand, #3F7A52)" : "#e2e8f0" }} />
        ))}
      </div>
      {i > 0 && <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{title}</div>}

      {/* Slide viewport — a horizontal track that slides between panels */}
      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="absolute inset-0 flex transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((group, k) => (
            <div key={k} className="h-full w-full flex-none overflow-y-auto" aria-hidden={k !== i}>
              <div className="flex min-h-full flex-col justify-center py-4">
                {k === 0 && <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{title}</h1>}
                <article className="lesson mt-4 space-y-4 text-[15px] leading-relaxed text-slate-700">{group}</article>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-line pt-3">
        <div className="justify-self-start">
          <button onClick={() => setI((k) => clamp(k - 1))} disabled={i === 0} className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-slate2 transition hover:text-ink disabled:opacity-30">← Back</button>
        </div>
        <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">{i + 1} / {n}</span>
        <div className="justify-self-end">
          {last ? (
            <button onClick={finish} disabled={busy} className="btn-primary whitespace-nowrap text-sm">{busy ? "Saving…" : next ? "Next module →" : "Finish →"}</button>
          ) : (
            <button onClick={() => setI((k) => clamp(k + 1))} className="btn-primary whitespace-nowrap text-sm">Next →</button>
          )}
        </div>
      </div>

      {/* Tutor bottom sheet */}
      {askOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setAskOpen(false)}>
          <div className="max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:mx-auto sm:mb-6 sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Ask the tutor</h3>
              <button onClick={() => setAskOpen(false)} className="text-sm text-slate-400 hover:text-ink">Close</button>
            </div>
            <Tutor topic={topic} />
          </div>
        </div>
      )}
    </main>
  );
}

// Split a flat lesson body into slide groups: a new slide starts at each <H2>,
// and every <LessonPredict> is its own standalone "pause and guess" slide.
function paginate(children: React.ReactNode): React.ReactNode[][] {
  const items = React.Children.toArray(children);
  const slides: React.ReactNode[][] = [];
  let cur: React.ReactNode[] = [];
  const flush = () => { if (cur.length) { slides.push(cur); cur = []; } };
  for (const item of items) {
    const t = React.isValidElement(item) ? item.type : null;
    if (t === H2) { flush(); cur = [item]; }
    else if (t === LessonPredict) { flush(); slides.push([item]); }
    else cur.push(item);
  }
  flush();
  return slides.length ? slides : [items];
}

// Small typographic helpers for lesson bodies.
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-1 text-xl font-bold text-ink">{children}</h2>;
}
export function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-mist/50 p-3 text-sm text-slate-600">{children}</div>;
}
export function Milestone({ year, children }: { year: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
      <span className="flex-none rounded-md bg-ink px-2 py-1 text-xs font-bold tabular-nums text-white">{year}</span>
      <span className="text-sm text-slate-700">{children}</span>
    </div>
  );
}
