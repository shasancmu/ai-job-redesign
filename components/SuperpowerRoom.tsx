"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import InterviewHelper from "@/components/InterviewHelper";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import { SUPERPOWER_STEPS } from "@/lib/superpower";
import Timer from "@/components/Timer";
import SuperpowerReport from "@/components/SuperpowerReport";
import StepHeader from "./StepHeader";
import InterviewProgress from "@/components/InterviewProgress";

type Msg = { role: "user" | "assistant"; content: string };

export default function SuperpowerRoom({
  me,
  session,
  initialWorkspace,
}: {
  me: string;
  session: any;
  initialWorkspace: any;
}) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = SUPERPOWER_STEPS[phase] ?? SUPERPOWER_STEPS[0];

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
    const clamped = Math.max(0, Math.min(SUPERPOWER_STEPS.length - 1, i));
    const status = clamped >= SUPERPOWER_STEPS.length - 1 ? "done" : "active";
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
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Find Your Superpower</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < SUPERPOWER_STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {SUPERPOWER_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={SUPERPOWER_STEPS.length} title={step.title} />

      <div className="pb-24">
        {step.key === "prime" && <Prime seeds={state.seeds || ""} setSeeds={(v) => setState({ seeds: v })} />}
        {step.key === "interview" && <Interview state={state} setState={setState} seeds={state.seeds} sessionId={session.id} onSkip={() => go(2)} />}
        {step.key === "report" && <ReportStep state={state} setState={setState} code={session.code} sessionId={session.id} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < SUPERPOWER_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">Next →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Prime({ seeds, setSeeds }: { seeds: string; setSeeds: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        Your superpower is usually invisible to you, because it feels effortless. So we won&apos;t ask what you&apos;re good at. We&apos;ll dig into <span className="font-medium text-ink">stories</span>. To prime the pump, jot a few moments if any come to mind. Totally optional, the interview will draw them out either way.
      </div>
      <div>
        <label className="lbl">A few moments you were at your best</label>
        <div className="mb-1 text-xs text-slate-400">Times you lost track of time, solved what others couldn&apos;t, or people kept coming to you. A phrase each is fine.</div>
        <textarea className="field min-h-[160px]" value={seeds} onChange={(e) => setSeeds(e.target.value)} placeholder={"e.g. The time I turned a messy dataset into a story the board actually understood.\nWhen colleagues keep asking me to explain the hard thing.\nThat project where I just… saw the pattern."} />
      </div>
    </div>
  );
}

function Interview({ state, setState, seeds, sessionId, onSkip }: { state: any; setState: (p: any) => void; seeds?: string; sessionId: string; onSkip: () => void }) {
  const messages: Msg[] = state.interview_chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(async (history: Msg[]) => {
    setErr(null); setBusy(true); setStreaming("");
    let acc = "";
    try {
      const reply = await streamPost("/api/superpower", { mode: "chat", messages: history, seeds, sessionId }, (d) => { acc += d; setStreaming(acc); });
      return (reply || acc).trim() || null;
    } catch (e: any) { setErr(e?.message || "The interviewer is unavailable."); return null; }
    finally { setBusy(false); setStreaming(""); }
  }, [seeds]);

  useEffect(() => {
    if (started.current || messages.length > 0) { started.current = true; return; }
    started.current = true;
    call([]).then((reply) => { if (reply) setState({ interview_chat: [{ role: "assistant", content: reply }] }); });
  }, []); // eslint-disable-line
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages.length, busy, streaming]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setState({ interview_chat: next });
    setInput("");
    const reply = await call(next);
    if (reply) setState({ interview_chat: [...next, { role: "assistant", content: reply }] });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Tell the interviewer the stories behind your best moments. <button onClick={onSkip} className="text-ink underline">Skip to the result</button></p>
      <div className="card flex flex-col p-5" style={{ height: "56vh", minHeight: 380 }}>
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && busy && <div className="text-slate-400">Thinking of an opening question…</div>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>{m.content}</div>
            </div>
          ))}
          {streaming && <div className="flex justify-start"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800">{streaming}</div></div>}
          {busy && !streaming && messages.length > 0 && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
        </div>
        {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <InterviewProgress msgs={messages} />
        <InterviewHelper module="superpower" answered={messages.filter((m) => m.role === "user").length} hasDraft={!!input.trim()} onInsert={setInput} />
        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tell the story…" disabled={busy} />
          <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}

function ReportStep({ state, setState, code, sessionId }: { state: any; setState: (p: any) => void; code: string; sessionId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const report = state.report;
  const enough = (state.interview_chat || []).filter((m: Msg) => m.role === "user").length >= 2 || (state.seeds || "").length > 40;
  const gate = usePredictGate({ guideKey: "superpower", existing: state.prediction, save: (p) => setState({ prediction: p }), run: () => run(), revealLabel: "Reveal my superpower" });

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/superpower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "report", seeds: state.seeds || "", interview: state.interview_chat || [], sessionId }),
      });
      const d = await res.json();
      if (res.ok && d.report) setState({ report: d.report });
      else setErr(d.error || "Couldn't read your superpower.");
    } catch { setErr("Couldn't read your superpower."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {gate.modal}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{!enough ? "Share a couple of stories first, then reveal your superpower." : report ? "Your superpower is named. Regenerate any time." : "Ready. Let's find the thread across your stories."}</div>
        <button onClick={report ? run : gate.start} disabled={busy || !enough} className="btn-primary text-sm">{busy ? "Reading the thread…" : report ? "Rebuild" : "Reveal my superpower"}</button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {report && (
        <>
          <ReportReveal guideKey="superpower" prediction={gate.prediction} code={code}>
            <SuperpowerReport report={report} />
          </ReportReveal>
          <Link href={`/superpower/${code}`} className="btn-primary block text-center no-print">View the full write-up →</Link>
        </>
      )}
    </div>
  );
}
