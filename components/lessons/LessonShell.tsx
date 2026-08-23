"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Tutor from "@/components/lessons/Tutor";

// The chrome shared by every "How AI works" lesson: header, the lesson body,
// an "ask the tutor" chat, and a Mark-complete that finishes the session.
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
        <span className="rounded-full bg-sky-soft px-3 py-1 text-sm font-semibold text-sky">How AI works</span>
      </div>

      <h1 className="text-3xl font-bold leading-tight text-ink">{title}</h1>

      <article className="lesson mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700">
        {children}
      </article>

      <div className="mt-10 border-t border-line pt-6">
        <Tutor topic={topic} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {done ? (
          <div className="text-sm font-semibold text-sage">✓ Completed</div>
        ) : (
          <button onClick={complete} disabled={busy} className="btn-primary">{busy ? "Saving…" : "I've got it →"}</button>
        )}
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">Back to dashboard</Link>
      </div>
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
