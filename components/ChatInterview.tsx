"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import ShareReport from "@/components/ShareReport";
import InterviewHelper from "@/components/InterviewHelper";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import InterviewProgress from "@/components/InterviewProgress";
import { useT } from "@/components/I18nProvider";

type Msg = { role: "user" | "assistant"; content: string };

// Shared "interview → build → report" chat engine. The subject-specific bits
// (which API, what to send, which report component, labels) come in as props, so
// a new text interview module is a thin wrapper around this. Intake is handled
// by the wrapper before this mounts.
export default function ChatInterview({
  session,
  ws,
  apiPath,
  extraBody,
  helpKey,
  guideKey,
  renderReport,
  reportHref,
  share,
  reportPill,
  chatTitle,
  buildLabel,
  buildingLabel,
  bottomHint,
  turns,
}: {
  session: any;
  ws: any;
  apiPath: string;
  extraBody: Record<string, any>;
  helpKey?: string;
  guideKey?: string;
  renderReport: (report: any) => ReactNode;
  reportHref: (code: string) => string;
  share: { title: string; text: string };
  reportPill: string;
  chatTitle: string;
  buildLabel: string;
  buildingLabel: string;
  bottomHint: string;
  turns?: number; // set only when lib/ai.ts holds this interview to a budget
}) {
  const t = useT();
  const supabase = createClient();
  const [messages, setMessages] = useState<Msg[]>(ws.canvas?.interview_chat || []);
  const [report, setReport] = useState<any>(ws.canvas?.report || null);
  const gate = usePredictGate({
    guideKey,
    existing: ws.canvas?.prediction || null,
    save: (p) => { saveCanvas({ prediction: p }); },
    run: () => build(),
    revealLabel: buildLabel,
  });
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const booted = useRef(false);
  const answered = messages.filter((m) => m.role === "user").length;

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages, waiting, streaming]);

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  async function ask(history: Msg[]) {
    setWaiting(true); setErr(null); setStreaming("");
    let acc = "";
    try {
      // Stream the question into a transient bubble; persist once at the end so
      // we don't write to the DB on every token.
      const full = await streamPost(
        apiPath,
        { mode: "chat", messages: history, sessionId: session.id, ...extraBody },
        (d) => { acc += d; setStreaming(acc); }
      );
      const finalText = (full || acc).trim();
      if (finalText) { const next = [...history, { role: "assistant" as const, content: finalText }]; setMessages(next); saveCanvas({ interview_chat: next }); }
      else setErr("The advisor is unavailable. Try again.");
    } catch (e: any) { setErr(e?.message || "Connection hiccup. Try again."); }
    setStreaming(""); setWaiting(false);
  }

  // Ask the first question on mount (once) if the conversation is empty.
  useEffect(() => { if (!booted.current && !report && messages.length === 0) { booted.current = true; ask([]); } }, []); // eslint-disable-line

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
      const res = await fetch(apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "report", interview: messages, sessionId: session.id, ...extraBody }) });
      const d = await res.json();
      if (res.ok && d.report) { setReport(d.report); await saveCanvas({ report: d.report }); await supabase.from("sessions").update({ status: "done" }).eq("id", session.id); }
      else setErr(d.error || "Couldn't build it. Try again.");
    } catch { setErr("Couldn't build it. Try again."); }
    setBuilding(false);
  }

  // ---- Report ----
  if (report) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{reportPill}</span>
          <div className="flex items-center gap-2 no-print">
            <ShareReport code={session.code} title={share.title} text={share.text} />
            <Link href="/dashboard" className="btn-ghost text-sm">Done</Link>
          </div>
        </header>
        <ReportReveal guideKey={guideKey} prediction={gate.prediction} code={session.code}>
          {renderReport(report)}
        </ReportReveal>
        <Link href={reportHref(session.code)} className="btn-primary mt-6 block text-center no-print">Open the full write-up →</Link>
      </main>
    );
  }

  // ---- Chat ----
  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      {gate.modal}
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
        <span className="text-sm font-semibold text-ink">{chatTitle}</span>
        <button onClick={gate.start} disabled={answered < 3 || building} className="btn-dark px-3 py-1.5 text-xs disabled:opacity-40">{building ? buildingLabel : answered < 3 ? "Keep going" : buildLabel}</button>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed " + (m.role === "user" ? "rounded-br-sm bg-ink text-white" : "rounded-bl-sm bg-mist text-ink")}>{m.content}</div>
          </div>
        ))}
        {streaming && <div className="flex justify-start"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-mist px-4 py-2.5 text-[15px] leading-relaxed text-ink">{streaming}</div></div>}
        {waiting && !streaming && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-mist px-4 py-3 text-slate-400">…</div></div>}
        {err && <div className="mx-auto max-w-sm rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{err}</div>}
      </div>

      <div className="border-t border-line px-3 py-3">
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={t("room.typeAnswer")} className="field max-h-32 flex-1 resize-none py-2.5" disabled={waiting} />
          <button onClick={send} disabled={waiting || !input.trim()} className="btn-primary shrink-0 px-4 py-2.5 disabled:opacity-40">{t("room.send")}</button>
        </div>
        {turns ? <InterviewProgress msgs={messages} turns={turns} /> : null}
        <InterviewHelper module={helpKey} answered={answered} hasDraft={!!input.trim()} onInsert={setInput} />
        {answered >= 3 && <p className="mt-2 text-center text-[11px] text-slate-400">{bottomHint}</p>}
      </div>
    </div>
  );
}
