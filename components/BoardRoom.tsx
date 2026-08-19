"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { boardMember, type BoardEntry } from "@/lib/board";
import BoardVerdict from "@/components/BoardVerdict";

export default function BoardRoom({
  me,
  session,
  initialWorkspace,
}: {
  me: string;
  session: any;
  initialWorkspace: any;
}) {
  const supabase = createClient();
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const [decision, setDecision] = useState<string>(ws.canvas?.decision || "");
  const [context, setContext] = useState<string>(ws.canvas?.context || "");
  const [transcript, setTranscript] = useState<BoardEntry[]>(ws.canvas?.transcript || []);
  const [verdict, setVerdict] = useState<any>(ws.canvas?.verdict || null);
  const convened = !!ws.canvas?.decision;
  const [started, setStarted] = useState<boolean>(convened);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), decision, context, transcript, verdict, ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  async function markDone() {
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [transcript.length, busy]);

  async function runRound(t: BoardEntry[]) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "round", decision, context, transcript: t }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "The board is unavailable."); return; }
      const additions: BoardEntry[] = (data.round || []).map((r: any) => ({ who: r.member, text: r.text }));
      const next = [...t, ...additions];
      setTranscript(next);
      await saveCanvas({ transcript: next });
    } catch {
      setErr("The board is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function convene() {
    if (!decision.trim() || busy) return;
    setStarted(true);
    await saveCanvas({ decision, context, transcript: [] });
    await runRound([]);
  }

  async function interject(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const t = [...transcript, { who: "you", text }];
    setTranscript(t);
    setInput("");
    await runRound(t);
  }

  async function callVote() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "verdict", decision, context, transcript }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Couldn't reach a verdict."); return; }
      setVerdict(data.verdict);
      await saveCanvas({ verdict: data.verdict });
      await markDone();
    } catch {
      setErr("Couldn't reach a verdict.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Your AI Board</span>
      </div>

      {!started ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
            Bring a decision you&apos;re weighing. Four advisors debate it live, a growth optimist, a skeptic, your customer, and your operator/CFO. You moderate, interject, then call the vote.
          </div>
          <div>
            <label className="lbl">What decision are you weighing?</label>
            <textarea className="field mt-1 min-h-[90px]" value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="e.g. Should we drop our cheapest plan and move upmarket?" />
          </div>
          <div>
            <label className="lbl">Any context? (optional)</label>
            <textarea className="field mt-1 min-h-[70px]" value={context} onChange={(e) => setContext(e.target.value)} placeholder="What matters, constraints, what you're worried about." />
          </div>
          <button onClick={convene} disabled={!decision.trim() || busy} className="btn-primary w-full">{busy ? "Convening the board…" : "Convene the board →"}</button>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        </div>
      ) : (
        <div className="pb-40">
          <div className="mb-4 rounded-2xl border border-line bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">On the table</div>
            <div className="mt-0.5 font-medium text-ink">{decision}</div>
          </div>

          <div ref={scroller} className="space-y-4">
            {transcript.map((e, i) => (e.who === "you" ? <YouMsg key={i} text={e.text} /> : <MemberMsg key={i} entry={e} />))}
            {busy && <div className="text-sm text-slate-400">The board is deliberating…</div>}
          </div>

          {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

          {verdict && (
            <div className="mt-6">
              <BoardVerdict verdict={verdict} />
              <Link href={`/board/${session.code}`} className="btn-primary mt-4 block text-center">View the full write-up →</Link>
            </div>
          )}

          {/* Sticky controls */}
          <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
              <form onSubmit={interject} className="flex items-center gap-2">
                <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say something to the board…" disabled={busy} />
                <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
              </form>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button onClick={() => runRound(transcript)} disabled={busy} className="btn-ghost text-sm">Let them debate →</button>
                <button onClick={callVote} disabled={busy} className="text-sm font-medium text-ink hover:underline">Call the vote</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MemberMsg({ entry }: { entry: BoardEntry }) {
  const m = boardMember(entry.who);
  if (!m) return null;
  return (
    <div className="rounded-2xl border border-line bg-white p-4" style={{ borderLeftWidth: 3, borderLeftColor: m.dot }}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: m.dot }} />
        <span className="text-sm font-bold text-ink">{m.name}</span>
        <span className="text-xs text-slate-400">{m.role}</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{entry.text}</p>
    </div>
  );
}

function YouMsg({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-sm leading-relaxed text-white">{text}</div>
    </div>
  );
}
