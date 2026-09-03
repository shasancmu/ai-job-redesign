"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import InterviewHelper from "@/components/InterviewHelper";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import Timer from "@/components/Timer";
import VisionReport from "@/components/VisionReport";
import StepHeader from "./StepHeader";
import InterviewProgress from "@/components/InterviewProgress";
import { useT } from "@/components/I18nProvider";

type Msg = { role: "user" | "assistant"; content: string };

const STEPS = [
  { key: "intake", title: "Your organization", minutes: 2 },
  { key: "interview", title: "Talk it through", minutes: 20 },
  { key: "report", title: "Your vision", minutes: 5 },
];

export default function VisionRoom({ me, session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = STEPS[phase] ?? STEPS[0];
  const intake = state.intake || {};

  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current; pending.current = {};
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
    setPhase(clamped); setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const canAdvance = phase !== 0 || !!intake.name?.trim();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Shape your vision</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={STEPS.length} title={step.title} />

      <div className="pb-24">
        {step.key === "intake" && <Intake intake={intake} setIntake={(p) => setState({ intake: { ...intake, ...p } })} />}
        {step.key === "interview" && <Interview state={state} setState={setState} ctx={{ name: intake.name, does: intake.does }} />}
        {step.key === "report" && <ReportStep state={state} setState={setState} ctx={{ name: intake.name, does: intake.does }} code={session.code} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={!canAdvance} className="btn-primary">Next →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">{t("room.finish")}</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Intake({ intake, setIntake }: { intake: any; setIntake: (p: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        A quick grounding, then a real conversation to draw out what your organization stands for, why it exists, and where it&apos;s headed — the vision framework of Collins and Porras.
      </div>
      <div>
        <label className="lbl">Organization name</label>
        <input className="field" value={intake.name || ""} onChange={(e) => setIntake({ name: e.target.value })} placeholder="e.g. Northwind Labs" />
      </div>
      <div>
        <label className="lbl">What does it do?</label>
        <div className="mb-1 text-xs text-slate-400">A line or two — enough to ground the conversation.</div>
        <textarea className="field min-h-[70px]" value={intake.does || ""} onChange={(e) => setIntake({ does: e.target.value })} placeholder="Who you serve and what you make or provide." />
      </div>
    </div>
  );
}

function Interview({ state, setState, ctx }: { state: any; setState: (p: any) => void; ctx: any }) {
  const t = useT();
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
      const reply = await streamPost("/api/vision", { mode: "chat", messages: history, ctx }, (d) => { acc += d; setStreaming(acc); });
      return (reply || acc).trim() || null;
    } catch (e: any) { setErr(e?.message || "The facilitator is unavailable."); return null; }
    finally { setBusy(false); setStreaming(""); }
  }, [ctx]);

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
      <p className="text-sm text-slate-500">Answer in your own words. There are no wrong answers — the point is to think out loud.</p>
      <div className="card flex flex-col p-5" style={{ height: "56vh", minHeight: 380 }}>
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && busy && <div className="text-slate-400">The facilitator is thinking of an opening question…</div>}
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
        <InterviewHelper module="vision" answered={messages.filter((m) => m.role === "user").length} hasDraft={!!input.trim()} onInsert={setInput} />
        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("room.typeAnswer")} disabled={busy} />
          <button className="btn-primary" disabled={busy || !input.trim()}>{t("room.send")}</button>
        </form>
      </div>
    </div>
  );
}

function ReportStep({ state, setState, ctx, code }: { state: any; setState: (p: any) => void; ctx: any; code: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const report = state.report;
  const gate = usePredictGate({ guideKey: "vision", existing: state.prediction, save: (p) => setState({ prediction: p }), run: () => run(), revealLabel: "Build my vision" });

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "report", interview: state.interview_chat || [], ctx }) });
      const d = await res.json();
      if (res.ok && d.report) setState({ report: d.report });
      else setErr(d.error || "Couldn't build the vision.");
    } catch { setErr("Couldn't build the vision."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {gate.modal}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{report ? "Your vision is ready. Rebuild any time." : "Pull the conversation together into your vision."}</div>
        <button onClick={report ? run : gate.start} disabled={busy} className="btn-primary text-sm">{busy ? "Shaping…" : report ? "Rebuild" : "Build my vision"}</button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {report && (
        <>
          <ReportReveal guideKey="vision" prediction={gate.prediction} code={code}>
            <VisionReport report={report} org={ctx?.name} />
          </ReportReveal>
          <Link href={`/vision/${code}`} className="btn-primary block text-center no-print">View the full vision →</Link>
        </>
      )}
    </div>
  );
}
