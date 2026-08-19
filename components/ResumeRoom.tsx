"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ResumeSource } from "@/lib/resume";
import ResumeIntake from "@/components/ResumeIntake";
import ResumeReport from "@/components/ResumeReport";
import ShareReport from "@/components/ShareReport";

type Msg = { role: "user" | "assistant"; content: string };

export default function ResumeRoom({
  session,
  initialWorkspace,
  prefill,
  prefillFrom,
}: {
  session: any;
  initialWorkspace: any;
  prefill?: string;
  prefillFrom?: string;
}) {
  const supabase = createClient();
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const [source, setSource] = useState<ResumeSource | null>(ws.canvas?.source || null);
  const [messages, setMessages] = useState<Msg[]>(ws.canvas?.interview_chat || []);
  const [report, setReport] = useState<any>(ws.canvas?.report || null);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const phase: "intake" | "chat" | "report" = report ? "report" : source ? "chat" : "intake";
  const answered = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, waiting]);

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  async function ask(history: Msg[]) {
    setWaiting(true); setErr(null);
    try {
      const res = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", messages: history, source, sessionId: session.id }) });
      const d = await res.json();
      if (res.ok && d.reply) {
        const next = [...history, { role: "assistant" as const, content: d.reply }];
        setMessages(next);
        saveCanvas({ interview_chat: next });
      } else setErr(d.error || "The coach is unavailable. Try again.");
    } catch { setErr("Connection hiccup. Try again."); }
    setWaiting(false);
  }

  async function startInterview(s: ResumeSource) {
    setSource(s);
    await saveCanvas({ source: s });
    ask([]);
  }

  function send() {
    const text = input.trim();
    if (!text || waiting) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    ask(next);
  }

  async function build() {
    setBuilding(true); setErr(null);
    try {
      const res = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "report", source, interview: messages, sessionId: session.id }) });
      const d = await res.json();
      if (res.ok && d.report) {
        setReport(d.report);
        await saveCanvas({ report: d.report });
        await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
      } else setErr(d.error || "Couldn't build the changes. Try again.");
    } catch { setErr("Couldn't build the changes. Try again."); }
    setBuilding(false);
  }

  // ---- Report ----
  if (phase === "report" && report) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Your résumé changes</span>
          <div className="flex items-center gap-2">
            <ShareReport code={session.code} title="Résumé changes" text="Here are the changes to make to my résumé, from Superadditive:" />
            <Link href="/dashboard" className="btn-ghost text-sm">Done</Link>
          </div>
        </header>
        <ResumeReport report={report} />
        <Link href={`/resume/${session.code}`} className="btn-primary mt-6 block text-center">Open the full write-up →</Link>
      </main>
    );
  }

  // ---- Intake ----
  if (phase === "intake") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Refresh Your Résumé</span>
        </div>
        <ResumeIntake prefill={prefill} prefillFrom={prefillFrom} onStart={startInterview} />
      </main>
    );
  }

  // ---- Chat ----
  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
        <span className="text-sm font-semibold text-ink">Résumé interview</span>
        <button onClick={build} disabled={answered < 3 || building} className="btn-dark px-3 py-1.5 text-xs disabled:opacity-40">
          {building ? "Building…" : answered < 3 ? "Keep going" : "Build my changes →"}
        </button>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed " + (m.role === "user" ? "rounded-br-sm bg-ink text-white" : "rounded-bl-sm bg-mist text-ink")}>{m.content}</div>
          </div>
        ))}
        {waiting && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-mist px-4 py-3 text-slate-400">…</div></div>}
        {err && <div className="mx-auto max-w-sm rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{err}</div>}
      </div>

      <div className="border-t border-line px-3 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Type your answer…"
            className="field max-h-32 flex-1 resize-none py-2.5"
            disabled={waiting}
          />
          <button onClick={send} disabled={waiting || !input.trim()} className="btn-primary shrink-0 px-4 py-2.5 disabled:opacity-40">Send</button>
        </div>
        {answered >= 3 && <p className="mt-2 text-center text-[11px] text-slate-400">Covered your main wins? Tap &ldquo;Build my changes&rdquo; up top.</p>}
      </div>
    </div>
  );
}
