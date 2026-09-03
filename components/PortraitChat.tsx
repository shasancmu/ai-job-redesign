"use client";

import { useEffect, useRef, useState } from "react";
import InterviewProgress from "@/components/InterviewProgress";
import { useT } from "@/components/I18nProvider";

type Msg = { role: "user" | "assistant"; content: string };
type Stage = "intro" | "chat" | "done";

// The portrait interview — a calm, unhurried conversation that draws the person
// out and reflects them back. It's theirs: framed openly, deletable anytime.
export default function PortraitChat({ existingReflection = null }: { existingReflection?: string | null }) {
  const t = useT();
  const [stage, setStage] = useState<Stage>(existingReflection ? "done" : "intro");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [reflection, setReflection] = useState<string | null>(existingReflection);
  const [err, setErr] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const userTurns = msgs.filter((m) => m.role === "user").length;

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, streaming]);

  async function stream(history: Msg[]) {
    setBusy(true); setErr(""); setStreaming("");
    try {
      const res = await fetch("/api/portrait/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let f: any; try { f = JSON.parse(line.slice(6)); } catch { continue; }
          if (f.t === "chunk") { full += f.v; setStreaming(full); }
          else if (f.t === "done") { full = f.text || full; }
          else if (f.t === "error") { setErr(f.message || "Something went wrong."); }
        }
      }
      setMsgs((prev) => [...prev, { role: "assistant", content: full }]);
      setStreaming("");
    } catch { setErr("Lost the thread there — try again."); }
    setBusy(false);
  }

  async function begin() { setStage("chat"); await stream([]); }

  async function send() {
    const t = draft.trim(); if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next); setDraft("");
    await stream(next);
  }

  async function finish() {
    setBusy(true); setErr("");
    try {
      const d = await fetch("/api/portrait/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: msgs }) }).then((r) => r.json());
      if (d?.reflection) { setReflection(d.reflection); setStage("done"); }
      else setErr(d?.error || "Couldn't gather that just yet.");
    } catch { setErr("Couldn't gather that just yet."); }
    setBusy(false);
  }

  async function forget() {
    if (!confirm("Delete what you shared? This can't be undone.")) return;
    await fetch("/api/portrait", { method: "DELETE" }).catch(() => {});
    setReflection(null); setMsgs([]); setStage("intro");
  }

  if (stage === "intro") {
    return (
      <div className="rounded-2xl border border-line bg-white p-6">
        <h1 className="font-serif text-3xl leading-tight text-ink">A few minutes, so we actually understand you</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate2">
          Not a form. A short conversation about what you actually do, what you&apos;re trying to build, and where you&apos;re headed. At the end you&apos;ll see what came through. It helps the people who teach you understand you — and it&apos;s yours: you can read or delete it anytime.
        </p>
        <button onClick={begin} disabled={busy} className="btn-primary mt-5 text-sm">{busy ? "…" : "Begin"}</button>
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="rounded-2xl border border-line bg-white p-6">
        <div className="eyebrow text-sage">What came through</div>
        {reflection ? (
          <p className="mt-3 max-w-xl font-serif text-[1.35rem] leading-relaxed text-ink">{reflection}</p>
        ) : (
          <p className="mt-3 text-sm text-slate2">Nothing saved.</p>
        )}
        <p className="mt-5 max-w-xl text-sm text-slate2">This is what the people who teach you will understand about you. It&apos;s yours.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={() => { setMsgs([]); setStage("intro"); }} className="btn-ghost text-sm">Do it again</button>
          <button onClick={forget} className="text-sm font-medium text-red-700 hover:underline">Delete what I shared</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div ref={scroller} className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-mist/60 text-ink")}>{m.content}</div>
          </div>
        ))}
        {streaming && <div className="flex justify-start"><div className="max-w-[85%] rounded-2xl bg-mist/60 px-4 py-2.5 text-[15px] leading-relaxed text-ink">{streaming}</div></div>}
        {busy && !streaming && <div className="text-sm text-slate-400">…</div>}
      </div>

      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}

      <InterviewProgress msgs={msgs} />
      <div className="mt-4 flex items-end gap-2">
        <textarea
          className="field min-h-[52px] flex-1 resize-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Take your time…"
          disabled={busy}
        />
        <button onClick={send} disabled={busy || !draft.trim()} className="btn-dark text-sm">{t("room.send")}</button>
      </div>
      {userTurns >= 4 && (
        <button onClick={finish} disabled={busy} className="mt-3 text-sm font-medium text-sage hover:underline">I&apos;m ready to wrap up →</button>
      )}
    </div>
  );
}
