"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MYOPIA_DOMAINS, type MyopiaDomain } from "@/lib/myopia";
import MyopiaReport from "@/components/MyopiaReport";
import ShareReport from "@/components/ShareReport";

type Msg = { role: "user" | "assistant"; content: string };

export default function MyopiaRoom({ session, initialWorkspace, domain }: { session: any; initialWorkspace: any; domain: MyopiaDomain }) {
  const supabase = createClient();
  const d = MYOPIA_DOMAINS[domain];
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const [subject, setSubject] = useState<string>(ws.canvas?.subject || "");
  const [started, setStarted] = useState<boolean>(!!ws.canvas?.subject);
  const [messages, setMessages] = useState<Msg[]>(ws.canvas?.interview_chat || []);
  const [report, setReport] = useState<any>(ws.canvas?.report || null);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const phase: "intake" | "chat" | "report" = report ? "report" : started ? "chat" : "intake";
  const answered = messages.filter((m) => m.role === "user").length;

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages, waiting]);

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  async function ask(history: Msg[]) {
    setWaiting(true); setErr(null);
    try {
      const res = await fetch("/api/myopia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", domain, subject, messages: history, sessionId: session.id }) });
      const dj = await res.json();
      if (res.ok && dj.reply) { const next = [...history, { role: "assistant" as const, content: dj.reply }]; setMessages(next); saveCanvas({ interview_chat: next }); }
      else setErr(dj.error || "The advisor is unavailable. Try again.");
    } catch { setErr("Connection hiccup. Try again."); }
    setWaiting(false);
  }

  async function begin() {
    if (subject.trim().length < 3) return;
    setStarted(true);
    await saveCanvas({ subject: subject.trim() });
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
      const res = await fetch("/api/myopia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "report", domain, subject, interview: messages, sessionId: session.id }) });
      const dj = await res.json();
      if (res.ok && dj.report) { setReport(dj.report); await saveCanvas({ report: dj.report }); await supabase.from("sessions").update({ status: "done" }).eq("id", session.id); }
      else setErr(dj.error || "Couldn't build the diagnosis. Try again.");
    } catch { setErr("Couldn't build the diagnosis. Try again."); }
    setBuilding(false);
  }

  // ---- Report ----
  if (phase === "report" && report) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Your blind spots</span>
          <div className="flex items-center gap-2">
            <ShareReport code={session.code} title={`${domain === "career" ? "Career" : "Business"} blind spots`} text={`Here are the blind spots in ${d.subject}, from Superadditive:`} />
            <Link href="/dashboard" className="btn-ghost text-sm">Done</Link>
          </div>
        </header>
        <MyopiaReport report={report} subjectWord={domain} />
        <Link href={`/myopia/${session.code}`} className="btn-primary mt-6 block text-center">Open the full write-up →</Link>
      </main>
    );
  }

  // ---- Intake ----
  if (phase === "intake") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{domain === "career" ? "Your Career's Blind Spots" : "Your Business's Blind Spots"}</span>
        </div>
        <h1 className="text-2xl font-bold text-ink">What got you here won&apos;t always keep you here</h1>
        <p className="mt-2 text-slate2">
          Success quietly narrows what you pay attention to. An AI advisor interviews you about {d.subject}, then names the blind spots you can&apos;t see, distant places, distant times, and the bets you&apos;re not taking, and a plan to explore before you have to.
        </p>
        <label className="lbl mt-6 block">{d.intakeLabel}</label>
        <input className="field mt-1" placeholder={d.intakePlaceholder} value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") begin(); }} />
        <button onClick={begin} disabled={subject.trim().length < 3} className="btn-primary mt-4 px-6 py-2.5 disabled:opacity-40">Start the interview →</button>
      </main>
    );
  }

  // ---- Chat ----
  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
        <span className="text-sm font-semibold text-ink">{domain === "career" ? "Career" : "Business"} blind spots</span>
        <button onClick={build} disabled={answered < 3 || building} className="btn-dark px-3 py-1.5 text-xs disabled:opacity-40">{building ? "Diagnosing…" : answered < 3 ? "Keep going" : "See my blind spots →"}</button>
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
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Type your answer…" className="field max-h-32 flex-1 resize-none py-2.5" disabled={waiting} />
          <button onClick={send} disabled={waiting || !input.trim()} className="btn-primary shrink-0 px-4 py-2.5 disabled:opacity-40">Send</button>
        </div>
        {answered >= 3 && <p className="mt-2 text-center text-[11px] text-slate-400">Covered the main areas? Tap &ldquo;See my blind spots&rdquo; up top.</p>}
      </div>
    </div>
  );
}
