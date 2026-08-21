"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/Timer";
import RoleplayChat, { type Msg } from "@/components/RoleplayChat";
import { CONVOS, convoByKey, type HardConvo } from "@/lib/hardconvo";

async function hardConvoReply(convoKey: string, history: Msg[]): Promise<string | null> {
  try {
    const res = await fetch("/api/hard-convo/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ convoKey, messages: history }) });
    const d = await res.json();
    return res.ok ? (d.reply as string) : null;
  } catch { return null; }
}

const STEPS = [
  { key: "pick", title: "Pick a conversation", minutes: 2 },
  { key: "brief", title: "Your brief", minutes: 3 },
  { key: "rehearse", title: "Have the conversation", minutes: 15 },
  { key: "debrief", title: "Coach debrief", minutes: 5 },
];

export default function HardConvoRoom({ me, session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = STEPS[phase] ?? STEPS[0];
  const convo = convoByKey(state.convoKey || "");

  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const update = useCallback((patch: Record<string, any>) => {
    setWs((w: any) => ({ ...w, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);
  const setState = (patch: Record<string, any>) => update({ canvas: { ...state, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    const status = clamped >= STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{convo ? convo.name : "Hard conversation"} · Rehearsal</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Step {phase + 1} of {STEPS.length} · {step.minutes} min</div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "pick" && <Pick chosen={state.convoKey} onPick={(k) => { setState({ convoKey: k, chat: [] }); go(1); }} />}
        {step.key === "brief" && convo && <Brief convo={convo} />}
        {step.key === "rehearse" && convo && (
          <RoleplayChat
            chat={state.chat || []}
            setChat={(c) => setState({ chat: c })}
            onCall={(h) => hardConvoReply(convo.key, h)}
            counterpartName={convo.counterpartName}
            aiOpens={false}
            placeholder={(state.chat || []).length === 0 ? convo.opener : `Reply to ${convo.counterpartName}…`}
            emptyHint={<>You&apos;re about to speak with <b>{convo.counterpartName}</b>. Say your opening line to begin — how you start matters.</>}
          />
        )}
        {step.key === "debrief" && convo && <Debrief convo={convo} state={state} setState={setState} />}
        {step.key !== "pick" && !convo && <div className="card p-5 text-slate-600">Pick a conversation first.</div>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={phase === 0 && !convo} className="btn-primary">{step.key === "rehearse" ? "See feedback" : "Next"} →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Pick({ chosen, onPick }: { chosen?: string; onPick: (k: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate2">Choose a conversation to rehearse. An AI plays the person on the other side; you lead. Then a coach walks the tape.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONVOS.map((c) => (
          <button key={c.key} onClick={() => onPick(c.key)} className={"card p-5 text-left transition hover:shadow-lift " + (chosen === c.key ? "ring-2 ring-sage" : "")}>
            <div className="text-2xl" aria-hidden>{c.emoji}</div>
            <div className="mt-2 font-bold text-ink">{c.name}</div>
            <div className="mt-1 text-sm text-slate2">{c.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Brief({ convo }: { convo: HardConvo }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-slate-700">{convo.situation}</div>
      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">What good looks like</div>
        <p className="mt-1.5 text-sm text-slate-700">{convo.yourGoal}</p>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-clay">Watch out for</div>
        <p className="mt-1.5 text-sm text-slate-700">{convo.watchOut}</p>
        <p className="mt-4 text-sm text-slate-500">You&apos;re speaking with <b>{convo.counterpartName}</b> ({convo.counterpartRole}). You open the conversation — say the first line yourself.</p>
      </div>
    </div>
  );
}

function Debrief({ convo, state, setState }: { convo: HardConvo; state: any; setState: (p: Record<string, any>) => void }) {
  const [busy, setBusy] = useState(false);
  const feedback = state.feedback;
  const chat: Msg[] = state.chat || [];

  async function coach() {
    setBusy(true);
    try {
      const transcript = chat.map((m) => `${m.role === "user" ? "You" : convo.counterpartName}: ${m.content}`).join("\n");
      const res = await fetch("/api/hard-convo/debrief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ convoKey: convo.key, transcript }) });
      const d = await res.json();
      if (res.ok && d.feedback) setState({ feedback: d.feedback });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {chat.length === 0 && <div className="card p-5 text-slate-600">You didn&apos;t have the conversation yet. Go back a step and talk it through first.</div>}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">How you handled it</div>
          {!feedback && chat.length > 0 && <button onClick={coach} disabled={busy} className="btn-primary text-sm">{busy ? "Thinking…" : "✨ Get the coach's read"}</button>}
        </div>
        {feedback && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-700">{feedback}</p>}
      </div>
    </div>
  );
}
