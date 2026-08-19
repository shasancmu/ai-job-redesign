"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { boardMember, BOARD_MEMBERS, type BoardEntry } from "@/lib/board";
import BoardVerdict from "@/components/BoardVerdict";
import BoardMaterials, { type Material } from "@/components/BoardMaterials";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BoardRoom({
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
  const [materials, setMaterials] = useState<Material[]>(ws.canvas?.materials || []);
  const [verdict, setVerdict] = useState<any>(ws.canvas?.verdict || null);
  const [started, setStarted] = useState<boolean>(!!ws.canvas?.decision);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // transcript with a ref mirror so async reveal reads the latest.
  const [transcript, _setT] = useState<BoardEntry[]>(ws.canvas?.transcript || []);
  const tref = useRef<BoardEntry[]>(transcript);
  const setT = (u: BoardEntry[] | ((p: BoardEntry[]) => BoardEntry[])) =>
    _setT((prev) => {
      const next = typeof u === "function" ? (u as any)(prev) : u;
      tref.current = next;
      return next;
    });

  async function saveCanvas(patch: Record<string, any> = {}) {
    const canvas = { ...(ws.canvas || {}), decision, context, materials, verdict, transcript: tref.current, ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [transcript.length, typing, verdict, busy]);

  // Only member/you lines go to the model (attachments are UI-only).
  const aiTranscript = () => tref.current.filter((e) => e.who === "you" || boardMember(e.who));
  const mats = () => materials.map((m) => ({ label: m.label, text: m.text }));

  async function fetchRound(): Promise<{ member: string; text: string }[]> {
    const res = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "round", decision, context, materials: mats(), transcript: aiTranscript() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "The board is unavailable.");
    return data.round || [];
  }

  async function playRound(round: { member: string; text: string }[]) {
    for (const r of round) {
      setTyping(r.member);
      await sleep(650 + Math.round(Math.random() * 500));
      setTyping(null);
      setT((t) => [...t, { who: r.member, text: r.text }]);
      await sleep(240);
    }
  }

  async function runRound() {
    setBusy(true);
    setErr(null);
    try {
      const round = await fetchRound();
      if (!round.length) { setErr("The board went quiet. Try again."); return; }
      await playRound(round);
      await saveCanvas();
    } catch (e: any) {
      setErr(e?.message || "The board is unavailable.");
    } finally {
      setTyping(null);
      setBusy(false);
    }
  }

  async function convene() {
    if (!decision.trim() || busy) return;
    setStarted(true);
    setT([]);
    await saveCanvas({ decision, context, transcript: [] });
    await runRound();
  }

  function mention(name: string) {
    setInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@${name} `);
    inputRef.current?.focus();
  }

  async function interject(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setT((t) => [...t, { who: "you", text }]);
    await saveCanvas();
    await runRound();
  }

  function updateMaterials(next: Material[]) {
    // Post an attachment bubble for anything newly added (UI-only line).
    const known = new Set(materials.map((m) => m.id));
    const added = next.filter((m) => !known.has(m.id));
    setMaterials(next);
    if (added.length && started) {
      setT((t) => [...t, ...added.map((m) => ({ who: "attach", text: m.label }))]);
    }
    saveCanvas({ materials: next });
  }

  async function callVote() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "verdict", decision, context, materials: mats(), transcript: aiTranscript() }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Couldn't reach a verdict."); return; }
      setVerdict(data.verdict);
      setVerdictOpen(true);
      await saveCanvas({ verdict: data.verdict });
      await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
    } catch {
      setErr("Couldn't reach a verdict.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Setup ---------------------------------------------------------------
  if (!started) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Your AI Board</span>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex -space-x-2">
            {BOARD_MEMBERS.map((m) => (
              <span key={m.key} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-soft" style={{ background: m.dot }}>{m.name[0]}</span>
            ))}
          </div>
          <div className="text-sm text-slate2">Mara, Dev, Priya & Sam are ready to weigh in.</div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="lbl">What decision are you weighing?</label>
            <textarea autoFocus className="field mt-1 min-h-[90px]" value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="e.g. Should we drop our cheapest plan and move upmarket?" />
          </div>
          <div>
            <label className="lbl">Any context? (optional)</label>
            <textarea className="field mt-1 min-h-[64px]" value={context} onChange={(e) => setContext(e.target.value)} placeholder="What matters, constraints, what you're worried about." />
          </div>
          <div>
            <label className="lbl">Give the board materials (optional)</label>
            <div className="mb-1 text-xs text-slate-400">Paste notes, drop a link, or upload a doc or photo of a page. The board reads it all.</div>
            <BoardMaterials materials={materials} onChange={updateMaterials} />
          </div>
          <button onClick={convene} disabled={!decision.trim() || busy} className="btn-primary w-full">{busy ? "Convening the board…" : "Convene the board →"}</button>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        </div>
      </main>
    );
  }

  // ---- Chat ----------------------------------------------------------------
  return (
    <div className="flex h-screen flex-col bg-mist/40">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur">
        <Link href="/dashboard" className="text-slate-400 hover:text-ink">←</Link>
        <div className="flex -space-x-2">
          {BOARD_MEMBERS.map((m) => (
            <button key={m.key} onClick={() => mention(m.name)} title={`Ask ${m.name}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white transition hover:-translate-y-0.5" style={{ background: m.dot }}>{m.name[0]}</button>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink">Your Board</div>
          <div className="truncate text-xs text-slate-400">{decision}</div>
        </div>
        <button onClick={callVote} disabled={busy} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Call the vote</button>
      </header>

      {/* Pinned verdict */}
      {verdict && (
        <div className="border-b border-line bg-white">
          <button onClick={() => setVerdictOpen((o) => !o)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left">
            <span className="text-base">📌</span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The board&apos;s verdict</div>
              <div className="truncate text-sm font-medium text-ink">{verdict.verdict}</div>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{verdictOpen ? "Hide ▲" : "Open ▼"}</span>
          </button>
          {verdictOpen && (
            <div className="max-h-[52vh] overflow-y-auto border-t border-line px-4 py-4">
              <div className="mx-auto max-w-2xl">
                <BoardVerdict verdict={verdict} />
                <Link href={`/board/${session.code}`} className="mt-3 block text-center text-sm font-medium text-ink hover:underline">Open the full write-up →</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {transcript.map((e, i) => {
            if (e.who === "you") return <Bubble key={i} mine>{highlightNames(e.text)}</Bubble>;
            if (e.who === "attach") return <Attach key={i} label={e.text} />;
            const m = boardMember(e.who);
            if (!m) return null;
            return <MemberBubble key={i} member={m} text={e.text} onMention={mention} />;
          })}

          {typing && <TypingBubble memberKey={typing} />}
          {busy && !typing && <div className="pl-11 text-xs text-slate-400">the board is thinking…</div>}
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        </div>
      </div>

      {/* Attach panel */}
      {showAttach && (
        <div className="border-t border-line bg-white px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <BoardMaterials materials={materials} onChange={updateMaterials} />
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-line bg-white px-4 py-2.5">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button onClick={() => setShowAttach((s) => !s)} className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg " + (showAttach ? "bg-ink text-white" : "text-slate-400 hover:bg-mist")} title="Share materials">📎</button>
          <form onSubmit={interject} className="flex flex-1 items-center gap-2">
            <input ref={inputRef} className="h-10 flex-1 rounded-full border border-line bg-mist px-4 text-sm outline-none focus:border-slate-300" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message the board…" disabled={busy} />
            {input.trim() ? (
              <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white" disabled={busy}>➤</button>
            ) : (
              <button type="button" onClick={runRound} disabled={busy} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-sage-soft px-3.5 text-sm font-semibold text-sage disabled:opacity-50" title="Let them keep debating">⚡ Debate</button>
            )}
          </form>
        </div>
      </div>

      <FX />
    </div>
  );
}

// Highlight advisor names (and @mentions) in their own color.
const NAMES = BOARD_MEMBERS.map((m) => m.name).join("|");
function highlightNames(text: string) {
  const re = new RegExp(`(@?(?:${NAMES}))\\b`, "g");
  const out: any[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const name = m[1].replace("@", "");
    const mem = BOARD_MEMBERS.find((x) => x.name === name);
    out.push(<span key={m.index} style={{ color: mem?.dot, fontWeight: 600 }}>{m[1]}</span>);
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Avatar({ memberKey, onMention }: { memberKey: string; onMention?: (name: string) => void }) {
  const m = boardMember(memberKey);
  if (!m) return null;
  const cls = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white";
  if (onMention) return <button onClick={() => onMention(m.name)} title={`Ask ${m.name}`} className={cls + " transition hover:-translate-y-0.5"} style={{ background: m.dot }}>{m.name[0]}</button>;
  return <span className={cls} style={{ background: m.dot }}>{m.name[0]}</span>;
}

function MemberBubble({ member, text, onMention }: { member: any; text: string; onMention?: (name: string) => void }) {
  return (
    <div className="flex items-end gap-2">
      <Avatar memberKey={member.key} onMention={onMention} />
      <div className="min-w-0">
        <div className="mb-0.5 ml-1 text-[11px] font-semibold" style={{ color: member.dot }}>{member.name} · {member.role}</div>
        <div className="bub-in max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-soft">{highlightNames(text)}</div>
      </div>
    </div>
  );
}

function Bubble({ children, mine }: { children: any; mine?: boolean }) {
  return (
    <div className={mine ? "flex justify-end" : "flex"}>
      <div className={"bub-in max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed " + (mine ? "rounded-br-md bg-ink text-white" : "bg-white text-slate-800")}>{children}</div>
    </div>
  );
}

function Attach({ label }: { label: string }) {
  return (
    <div className="flex justify-end">
      <div className="bub-in inline-flex max-w-[85%] items-center gap-1.5 rounded-2xl rounded-br-md bg-sage-soft px-3.5 py-2 text-sm text-sage">
        📎 <span className="truncate">Shared: {label}</span>
      </div>
    </div>
  );
}

function TypingBubble({ memberKey }: { memberKey: string }) {
  return (
    <div className="flex items-end gap-2">
      <Avatar memberKey={memberKey} />
      <div className="rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3 shadow-soft">
        <span className="typing inline-flex items-center"><i /><i /><i /></span>
      </div>
    </div>
  );
}

function FX() {
  return (
    <style>{`
      @keyframes bub-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
      .bub-in { animation: bub-in .28s cubic-bezier(.2,.7,.25,1) both; }
      .typing i { display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: #c3ccd6; margin: 0 2px; animation: typing 1.2s infinite ease-in-out; }
      .typing i:nth-child(2) { animation-delay: .18s; }
      .typing i:nth-child(3) { animation-delay: .36s; }
      @keyframes typing { 0%,60%,100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-4px); opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .bub-in { animation: none; } .typing i { animation: none; } }
    `}</style>
  );
}
