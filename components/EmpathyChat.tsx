"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import IntakeNotice from "@/components/IntakeNotice";
import { streamPost } from "@/lib/streamClient";

type Msg = { role: "user" | "assistant"; content: string };

// PUBLIC customer-facing empathy interview: a warm chat with an AI researcher.
// Holds the running transcript in state and posts it each turn; on finish it
// synthesizes the profile server-side. No account, mobile-first.
export default function EmpathyChat({ token, business }: { token: string; business: string }) {
  const [phase, setPhase] = useState<"intro" | "chat" | "done">("intro");
  const [name, setName] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false); // interviewer is thinking
  const [streaming, setStreaming] = useState(""); // reply arriving token by token
  const [finishing, setFinishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const forWhom = business ? `for ${business}` : "for a small business";
  const answered = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, waiting, streaming]);

  async function ask(history: Msg[]) {
    setWaiting(true); setErr(null); setStreaming("");
    let acc = "";
    try {
      const full = await streamPost("/api/empathy/chat", { token, messages: history }, (d) => { acc += d; setStreaming(acc); });
      const finalText = (full || acc).trim();
      if (finalText) setMessages([...history, { role: "assistant", content: finalText }]);
      else setErr("The interviewer is unavailable. Try again.");
    } catch (e: any) {
      setErr(e?.message || "Connection hiccup. Try again.");
    }
    setStreaming(""); setWaiting(false);
  }

  function begin() {
    setPhase("chat");
    ask([]);
  }

  function send() {
    const text = input.trim();
    if (!text || waiting) return;
    setInput("");
    ask([...messages, { role: "user", content: text }]);
  }

  async function finish() {
    setFinishing(true);
    setErr(null);
    try {
      const res = await fetch("/api/empathy/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, messages, name: name.trim() }),
      });
      const d = await res.json();
      if (res.ok && d.ok) setPhase("done");
      else { setErr(d.error || "Couldn't wrap up. Try again."); setFinishing(false); }
    } catch {
      setErr("Couldn't wrap up. Try again.");
      setFinishing(false);
    }
  }

  // ---- Intro ----
  if (phase === "intro") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold text-ink">A quick chat, {forWhom}</h1>
        <p className="mt-3 leading-relaxed text-slate2">
          Someone building {business || "a business"} would love to understand you better. It&apos;s a short, casual conversation, just a few questions about your own experience. There are no right answers, and nothing is being sold. Speak freely.
        </p>
        <div className="mt-6">
          <label className="lbl">Your first name (optional)</label>
          <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" maxLength={60} />
        </div>
        <button onClick={begin} className="btn-primary mt-6 px-6 py-3 text-base">Start the chat →</button>
        <p className="mt-3 text-xs text-slate-400">Takes about 5 minutes. Your answers are shared with the business owner.</p>
        <IntakeNotice what="Your answers" />
      </main>
    );
  }

  // ---- Done ----
  if (phase === "done") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl">🙏</div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Thank you, truly</h1>
        <p className="mt-2 leading-relaxed text-slate2">That&apos;s incredibly helpful. Your answers will help {business || "the owner"} build something that actually fits people like you. You can close this tab now.</p>
      </main>
    );
  }

  // ---- Chat ----
  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-sky-soft text-sm">💬</div>
          <div>
            <div className="text-sm font-semibold text-ink">Your interviewer</div>
            <div className="text-[11px] text-slate-400">Listening {forWhom}</div>
          </div>
        </div>
        {answered >= 3 && (
          <button onClick={finish} disabled={finishing} className="btn-ghost text-xs disabled:opacity-50">
            {finishing ? "Wrapping…" : "I'm done"}
          </button>
        )}
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed " +
                (m.role === "user" ? "rounded-br-sm bg-ink text-white" : "rounded-bl-sm bg-mist text-ink")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-mist px-4 py-2.5 text-[15px] leading-relaxed text-ink">{streaming}</div>
          </div>
        )}
        {waiting && !streaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-mist px-4 py-3">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
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
        {answered >= 3 && (
          <p className="mt-2 text-center text-[11px] text-slate-400">Done sharing? Tap &ldquo;I&apos;m done&rdquo; up top anytime.</p>
        )}
      </div>

      <style>{`
        .typing-dot { display:inline-block; width:7px; height:7px; margin:0 2px; border-radius:9999px; background: var(--slate2, #8a94a6); opacity:.5; animation: td 1.2s infinite ease-in-out; }
        .typing-dot:nth-child(2){ animation-delay:.15s } .typing-dot:nth-child(3){ animation-delay:.3s }
        @keyframes td { 0%,60%,100%{ transform: translateY(0); opacity:.35 } 30%{ transform: translateY(-4px); opacity:.9 } }
      `}</style>
    </div>
  );
}
