"use client";

import { useEffect, useRef, useState } from "react";
import { streamPost } from "@/lib/streamClient";

type Msg = { role: "user" | "assistant"; content: string };
type Cohort = { code: string; name: string; members?: number };

const STARTERS = [
  "What did the room struggle with most?",
  "Summarize how the cohort performed overall.",
  "Which concepts should I reinforce next session?",
  "Who might be falling behind, and on what?",
];

// Chat with everything a cohort has done. Instructor picks a cohort, then asks;
// answers are grounded server-side in that cohort's data.
export default function CohortChat({ initialCohort }: { initialCohort?: string }) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohort, setCohort] = useState(initialCohort || "");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/classes", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const list = (d.classes || []).map((c: any) => ({ code: c.code, name: c.name, members: c.members }));
      setCohorts(list);
      if (!cohort && list[0]) setCohort(list[0].code);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages, streaming, waiting]);
  useEffect(() => { setMessages([]); setErr(""); }, [cohort]); // new cohort, fresh chat

  async function ask(text: string) {
    if (!cohort || waiting) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setWaiting(true); setErr(""); setStreaming("");
    let acc = "";
    try {
      const full = await streamPost("/api/facilitator/cohort-chat", { cohort, messages: next }, (d) => { acc += d; setStreaming(acc); });
      const reply = (full || acc).trim();
      if (reply) setMessages([...next, { role: "assistant", content: reply }]);
      else setErr("No answer came back. Try again.");
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setWaiting(false); setStreaming(""); }
  }

  const activeName = cohorts.find((c) => c.code === cohort)?.name;

  return (
    <div className="mx-auto flex h-[76vh] max-w-2xl flex-col rounded-2xl border border-line bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink">Ask your cohort</span>
        <select className="field w-auto py-1.5 text-sm" value={cohort} onChange={(e) => setCohort(e.target.value)}>
          {cohorts.length === 0 && <option value="">No cohorts yet</option>}
          {cohorts.map((c) => <option key={c.code} value={c.code}>{c.name}{c.members != null ? ` (${c.members})` : ""}</option>)}
        </select>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.length === 0 && !streaming && (
          <div className="mx-auto max-w-md text-center">
            <div className="text-3xl">💬</div>
            <p className="mt-2 text-sm text-slate2">Ask anything about {activeName ? `“${activeName}”` : "this cohort"} and what it has done. Answers come straight from the cohort&apos;s own results.</p>
            <div className="mt-4 flex flex-col gap-2">
              {STARTERS.map((s) => <button key={s} onClick={() => ask(s)} disabled={!cohort} className="rounded-xl border border-line px-3 py-2 text-left text-sm text-slate-700 hover:border-ai hover:bg-mist disabled:opacity-50">{s}</button>)}
            </div>
          </div>
        )}
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
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) ask(input.trim()); } }} rows={1} placeholder={cohort ? "Ask about this cohort…" : "Pick a cohort first"} className="field max-h-32 flex-1 resize-none py-2.5" disabled={waiting || !cohort} />
          <button onClick={() => input.trim() && ask(input.trim())} disabled={waiting || !cohort || !input.trim()} className="btn-primary shrink-0 px-4 py-2.5 disabled:opacity-40">Ask</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">Answers are grounded only in this cohort&apos;s data. It won&apos;t know anything outside it.</p>
      </div>
    </div>
  );
}
