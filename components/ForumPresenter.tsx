"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: string; name: string; text: string; created_at: string };
type Item = { title: string; detail: string };
type Verdict = { headline: string; positions: Item[]; tensions: Item[]; verdict: string } | null;

const FEED_MS = 3000;
const ADJ_MS = 14000;

// The shared screen: the room's live chat on one side, the AI's live adjudication
// on the other. Join by QR/code, no accounts.
export default function ForumPresenter({
  code,
  topic,
  initialStatus,
  initialVerdict,
  joinHost,
  qrSvg,
}: {
  code: string;
  topic: string;
  initialStatus: string;
  initialVerdict: Verdict;
  joinHost: string;
  qrSvg: string;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [verdict, setVerdict] = useState<Verdict>(initialVerdict);
  const [adjudicating, setAdjudicating] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const closed = status === "closed";

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json().catch(() => ({}));
      if (d.messages) setMessages(d.messages);
      if (typeof d.total === "number") setTotal(d.total);
      if (d.status) setStatus(d.status);
    } catch { /* keep last */ }
  }, [code]);

  const adjudicate = useCallback(async () => {
    setAdjudicating(true);
    try {
      const res = await fetch("/api/forum/adjudicate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json().catch(() => ({}));
      if (d.verdict) setVerdict(d.verdict);
    } catch { /* keep last */ } finally {
      setAdjudicating(false);
    }
  }, [code]);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, FEED_MS);
    return () => clearInterval(id);
  }, [fetchFeed]);

  useEffect(() => {
    adjudicate();
    const id = setInterval(() => { if (!closed) adjudicate(); }, ADJ_MS);
    return () => clearInterval(id);
  }, [adjudicate]); // eslint-disable-line

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function close() {
    if (!window.confirm("Close the chat? No new messages will be accepted.")) return;
    setStatus("closed");
    await supabase.from("forum_sessions").update({ status: "closed", updated_at: new Date().toISOString() }).eq("code", code);
  }

  const joinPill = (
    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2 shadow-soft">
      {qrSvg ? <div className="h-14 w-14 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
      <div className="leading-tight">
        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{joinHost}</div>
        <div className="font-mono text-xl font-bold tracking-widest text-ink">{code}</div>
      </div>
    </div>
  );

  // Empty splash: big join panel.
  if (total === 0) {
    return (
      <div ref={stageRef} className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Join the conversation</div>
        <h1 className="max-w-3xl text-2xl font-bold leading-tight text-ink sm:text-4xl">{topic || "Open floor"}</h1>
        {qrSvg ? <div className="h-56 w-56 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
        <div>
          <div className="text-sm text-slate-400">{joinHost}</div>
          <div className="font-mono text-4xl font-bold tracking-[0.2em] text-ink">{code}</div>
        </div>
        <div className="text-sm text-slate-400">Scan to join. The AI reads the whole room as you talk.</div>
      </div>
    );
  }

  return (
    <div ref={stageRef} className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">The question</div>
          <h1 className="max-w-3xl text-lg font-bold leading-snug text-ink sm:text-2xl">{topic || "Open floor"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {joinPill}
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-slate-500"><b className="font-semibold text-ink">{total}</b> message{total === 1 ? "" : "s"}{closed && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">closed</span>}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())} className="btn-ghost text-sm">{isFull ? "Exit" : "⤢ Full"}</button>
              {!isFull && <Link href="/facilitator/forum" className="btn-ghost text-sm">Done</Link>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-4 px-6 pb-6 lg:grid-cols-[1.3fr_1fr]">
        {/* AI adjudication */}
        <div className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="mb-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sage" /></span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">The AI, reading the room</span>
            {adjudicating && <span className="text-[11px] text-slate-400">updating…</span>}
          </div>
          <h2 className="text-xl font-bold leading-snug text-ink sm:text-2xl">{verdict?.headline || "Reading the conversation…"}</h2>

          <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-2">
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><span className="h-2.5 w-2.5 rounded-full bg-sage" /> Where the room lands</div>
              <ul className="space-y-2.5">
                {(verdict?.positions || []).map((it, i) => (
                  <li key={i} className="border-l-2 border-sage pl-3"><div className="text-sm font-semibold text-ink">{it.title}</div>{it.detail && <div className="text-xs leading-snug text-slate-600">{it.detail}</div>}</li>
                ))}
                {!(verdict?.positions || []).length && <li className="text-sm text-slate-400">Forming…</li>}
              </ul>
            </section>
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><span className="h-2.5 w-2.5 rounded-full bg-clay" /> Where it splits</div>
              <ul className="space-y-2.5">
                {(verdict?.tensions || []).map((it, i) => (
                  <li key={i} className="border-l-2 border-clay pl-3"><div className="text-sm font-semibold text-ink">{it.title}</div>{it.detail && <div className="text-xs leading-snug text-slate-600">{it.detail}</div>}</li>
                ))}
                {!(verdict?.tensions || []).length && <li className="text-sm text-slate-400">No clear split.</li>}
              </ul>
            </section>
          </div>

          {verdict?.verdict && (
            <div className="mt-4 rounded-xl bg-mist/50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The verdict</div>
              <p className="mt-1 text-[15px] leading-relaxed text-ink">{verdict.verdict}</p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button onClick={adjudicate} disabled={adjudicating} className="btn-dark text-sm disabled:opacity-50">{adjudicating ? "Reading…" : "Re-read the room →"}</button>
            {!closed && <button onClick={close} className="text-sm text-slate-400 hover:text-ink">Close chat</button>}
          </div>
        </div>

        {/* Live feed */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-line bg-white p-4 shadow-soft">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Live chat</div>
          <div ref={feedRef} className="flex-1 space-y-2 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl bg-mist/60 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-400">{m.name || "Anonymous"}</div>
                <div className="whitespace-pre-wrap text-sm text-slate-700">{m.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
