"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Tutor from "@/components/lessons/Tutor";
import { CATEGORIES, moduleByExercise, moduleBySlug, moduleCategory } from "@/lib/modules";
import { nextAfter } from "@/lib/momentum";

// The chrome shared by every explainer lesson (How AI works, The PhD path):
// header, the lesson body, an "ask the tutor" chat, and a completion that
// finishes the session and pushes straight into the next module in the series.
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
  const [done, setDone] = useState(session.status === "done");
  const [busy, setBusy] = useState(false);

  // Badge + next module derive from the current module, so both explainer
  // tracks (and any future one) get the right label and the right "next".
  const mod = moduleByExercise(session.exercise);
  const cat = mod ? CATEGORIES.find((c) => c.key === moduleCategory(mod.slug)) : undefined;
  const nextSlug = mod ? nextAfter(mod.slug) : null;
  const next = nextSlug ? moduleBySlug(nextSlug) : undefined;

  async function complete() {
    setBusy(true);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
    setDone(true);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
        {cat && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cat.chip}`}>{cat.title}</span>}
      </div>

      <h1 className="text-3xl font-bold leading-tight text-ink">{title}</h1>

      <article className="lesson mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700">
        {children}
      </article>

      <div className="mt-10 border-t border-line pt-6">
        <Tutor topic={topic} />
      </div>

      {done ? (
        <div className="mt-6 rounded-2xl border border-line bg-mist/40 p-4">
          <div className="text-sm font-semibold text-sage">✓ Completed</div>
          {next ? (
            <>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Next in the series</p>
              <Link href={`/start/${next.slug}`} className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 transition hover:shadow-sm">
                <span className="text-sm font-semibold text-ink">{next.name}</span>
                <span className="flex-none text-sm text-slate2">Start →</span>
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">You&rsquo;ve reached the end of this series.</p>
          )}
          <Link href="/dashboard" className="mt-3 inline-block text-sm text-slate2 hover:text-ink">Back to dashboard</Link>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={complete} disabled={busy} className="btn-primary">{busy ? "Saving…" : (next ? "Done — next module →" : "I've got it →")}</button>
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">Back to dashboard</Link>
        </div>
      )}
    </main>
  );
}

// Small typographic helpers for lesson bodies.
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-3 text-lg font-bold text-ink">{children}</h2>;
}
export function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-mist/50 p-3 text-sm text-slate-600">{children}</div>;
}
export function Milestone({ year, children }: { year: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-white p-3">
      <span className="flex-none rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">{year}</span>
      <span className="text-sm text-slate-700">{children}</span>
    </div>
  );
}
