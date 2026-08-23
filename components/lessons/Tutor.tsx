"use client";

import { useRef, useState } from "react";
import { streamPost } from "@/lib/streamClient";

type Msg = { role: "user" | "assistant"; content: string };

// A small "ask the tutor" chat at the end of a lesson. Grounded in the lesson
// topic; answers stream in.
export default function Tutor({ topic }: { topic: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setStreaming("");
    let acc = "";
    try {
      const reply = await streamPost("/api/tutor", { topic, messages: next }, (d) => { acc += d; setStreaming(acc); scroller.current?.scrollTo({ top: 1e9 }); });
      setMessages([...next, { role: "assistant", content: (reply || acc).trim() || "…" }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "The tutor is unavailable right now." }]);
    }
    setBusy(false);
    setStreaming("");
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-sage">Ask the tutor</div>
      <p className="mt-1 text-sm text-slate-500">Anything about how this works, what's true, or what AI can't do.</p>

      {(messages.length > 0 || streaming) && (
        <div ref={scroller} className="mt-3 max-h-80 space-y-3 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={"max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-mist text-slate-800")}>{m.content}</div>
            </div>
          ))}
          {streaming && <div className="flex justify-start"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-mist px-3.5 py-2 text-sm leading-relaxed text-slate-800">{streaming}</div></div>}
        </div>
      )}

      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Why can't it just memorize everything?" disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>Ask</button>
      </form>
    </div>
  );
}
