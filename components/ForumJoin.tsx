"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id: string; name: string; text: string; created_at: string };

// PUBLIC, no sign-in. Pick a name, post messages, watch the room's chat stream.
export default function ForumJoin({ code, topic }: { code: string; topic: string }) {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const n = localStorage.getItem("forum-name");
      if (n) { setName(n); setJoined(true); }
    } catch { /* no storage */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json().catch(() => ({}));
      if (d.messages) setMessages(d.messages);
    } catch { /* keep last */ }
  }, [code]);

  useEffect(() => {
    if (!joined) return;
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [joined, load]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function join(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim() || "Anonymous";
    setName(n);
    try { localStorage.setItem("forum-name", n); } catch { /* ignore */ }
    setJoined(true);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setErr(null);
    setText("");
    try {
      const res = await fetch("/api/forum/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name, text: t }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Couldn't send."); setText(t); }
      else load();
    } catch {
      setErr("Couldn't send.");
      setText(t);
    } finally {
      setSending(false);
    }
  }

  if (!joined) {
    return (
      <form onSubmit={join} className="card p-7">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The question</div>
        <h1 className="mt-1 text-xl font-bold leading-snug text-ink">{topic || "Join the conversation"}</h1>
        <label className="lbl mt-5">Your name on screen</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Bill, or leave blank for Anonymous" className="field mt-1" />
        <button className="btn-primary mt-4 w-full py-3">Join the chat →</button>
      </form>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <div className="border-b border-line px-1 pb-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The question</div>
        <h1 className="mt-0.5 text-base font-bold leading-snug text-ink">{topic || "Open floor"}</h1>
      </div>

      <div ref={feedRef} className="flex-1 space-y-2.5 overflow-y-auto py-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Be the first to say something.</p>
        ) : (
          messages.map((m) => {
            const mine = m.name === name;
            return (
              <div key={m.id} className={"max-w-[85%] rounded-2xl px-3 py-2 text-sm " + (mine ? "ml-auto bg-sage-soft text-ink" : "bg-mist text-slate-700")}>
                <div className="text-[11px] font-semibold text-slate-400">{m.name || "Anonymous"}</div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            );
          })
        )}
      </div>

      {err && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-line py-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={800} placeholder="Say something…" className="field flex-1" />
        <button className="btn-primary shrink-0" disabled={sending || !text.trim()}>{sending ? "…" : "Send"}</button>
      </form>
    </div>
  );
}
