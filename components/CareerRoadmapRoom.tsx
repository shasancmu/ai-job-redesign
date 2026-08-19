"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CAREER_ROADMAP_STEPS } from "@/lib/careerRoadmap";
import Timer from "@/components/Timer";
import CareerRoadmapView from "@/components/CareerRoadmapView";
import { useT } from "@/components/I18nProvider";

type Msg = { role: "user" | "assistant"; content: string };

const STEP_KEY: Record<string, string> = {
  input: "roadmap.stepInput",
  interview: "roadmap.stepInterview",
  roadmap: "roadmap.stepRoadmap",
};

export default function CareerRoadmapRoom({
  me,
  session,
  initialWorkspace,
  savedResume,
  savedRole = "",
  savedLevel = "",
}: {
  me: string;
  session: any;
  initialWorkspace: any;
  savedResume?: string;
  savedRole?: string;
  savedLevel?: string;
}) {
  const supabase = createClient();
  const t = useT();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = CAREER_ROADMAP_STEPS[phase] ?? CAREER_ROADMAP_STEPS[0];

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

  // Prefill saved résumé + role/level once, if not already typed here.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    const patch: Record<string, any> = {};
    if (savedResume && !state.text) { patch.text = savedResume; patch.usedSaved = true; }
    if (savedRole && !state.role) patch.role = savedRole;
    if (savedLevel && !state.level) patch.level = savedLevel;
    if (Object.keys(patch).length) setState(patch);
  }, []); // eslint-disable-line

  // Persist role/level back to the profile (debounced) for future runs.
  const profTimer = useRef<any>(null);
  useEffect(() => {
    if (profTimer.current) clearTimeout(profTimer.current);
    profTimer.current = setTimeout(() => {
      const p: Record<string, any> = {};
      if (state.role) p.job_title = state.role;
      if (state.level) p.level = state.level;
      if (Object.keys(p).length) supabase.from("profiles").update(p).eq("id", me);
    }, 900);
  }, [state.role, state.level]); // eslint-disable-line

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(CAREER_ROADMAP_STEPS.length - 1, i));
    const status = clamped >= CAREER_ROADMAP_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{t("roadmap.tag")}</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {CAREER_ROADMAP_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{t("room.step", { n: phase + 1, total: CAREER_ROADMAP_STEPS.length })}</div>
        <h1 className="mt-1 text-2xl font-bold">{t(STEP_KEY[step.key] || "roadmap.stepInput")}</h1>
      </div>

      <div className="pb-24">
        {step.key === "input" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
              {t("roadmap.intro")}
              <div className="mt-1.5 text-xs text-slate-400">{t("career.privateNote")}</div>
            </div>
            <div className="card p-5">
              <label className="lbl">What kind of next move?</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => setState({ intent: "pivot" })} className={"rounded-xl border p-3 text-left transition " + ((state.intent || "pivot") === "pivot" ? "border-ink bg-mist" : "border-line hover:border-slate-300")}>
                  <div className="text-sm font-semibold text-ink">Pivot to a new role</div>
                  <div className="mt-0.5 text-xs text-slate-500">A different title, function, or field, matched to skill-adjacent roles.</div>
                </button>
                <button type="button" onClick={() => setState({ intent: "growth" })} className={"rounded-xl border p-3 text-left transition " + (state.intent === "growth" ? "border-ink bg-mist" : "border-line hover:border-slate-300")}>
                  <div className="text-sm font-semibold text-ink">Grow where you are</div>
                  <div className="mt-0.5 text-xs text-slate-500">Advance in place: more scope, seniority, or leadership, not a new field.</div>
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="lbl">{t("career.currentRole")}</label><input className="field" placeholder={t("solo.jobTitlePh")} value={state.role || ""} onChange={(e) => setState({ role: e.target.value })} /></div>
              <div><label className="lbl">{t("career.levelOptional")}</label><input className="field" placeholder={t("career.levelPh")} value={state.level || ""} onChange={(e) => setState({ level: e.target.value })} /></div>
            </div>
            <div className="card p-5">
              <div className="flex items-baseline justify-between">
                <label className="lbl">{t("career.resumeLabel")}</label>
                {state.usedSaved && <span className="text-xs text-sage">{t("roadmap.loadedSaved")}</span>}
              </div>
              <textarea className="field min-h-[220px]" placeholder={t("career.pasteResume")} value={state.text || ""} onChange={(e) => setState({ text: e.target.value, usedSaved: false })} />
            </div>
          </div>
        )}

        {step.key === "interview" && <Interview state={state} setState={setState} role={state.role} intent={state.intent || "pivot"} onSkip={() => go(2)} />}

        {step.key === "roadmap" && <Roadmap state={state} setState={setState} code={session.code} intent={state.intent || "pivot"} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < CAREER_ROADMAP_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={step.key === "input" && (state.text || "").length < 60} className="btn-primary">
              {step.key === "interview" ? `${t("roadmap.buildNav")} →` : `${t("roadmap.next")} →`}
            </button>
          ) : (
            <Link href="/dashboard" className="btn-primary">{t("room.finish")}</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Interview({ state, setState, role, intent, onSkip }: { state: any; setState: (p: any) => void; role?: string; intent: string; onSkip: () => void }) {
  const t = useT();
  const messages: Msg[] = state.interview_chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(async (history: Msg[]) => {
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/career-roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", messages: history, role, intent }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || t("roadmap.coachUnavailable")); return null; }
      return data.reply as string;
    } catch { setErr(t("roadmap.coachUnavailable")); return null; } finally { setBusy(false); }
  }, [role]);

  useEffect(() => {
    if (started.current || messages.length > 0) { started.current = true; return; }
    started.current = true;
    call([]).then((reply) => { if (reply) setState({ interview_chat: [{ role: "assistant", content: reply }] }); });
  }, []); // eslint-disable-line
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages.length, busy]);

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
      <p className="text-sm text-slate-500">{t("roadmap.interviewIntro")} <button onClick={onSkip} className="text-ink underline">{t("roadmap.skipToRoadmap")}</button></p>
      <div className="card flex flex-col p-5" style={{ height: "52vh", minHeight: 360 }}>
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && busy && <div className="text-slate-400">{t("roadmap.coachOpening")}</div>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>{m.content}</div>
            </div>
          ))}
          {busy && messages.length > 0 && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
        </div>
        {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("room.typeAnswer")} disabled={busy} />
          <button className="btn-primary" disabled={busy || !input.trim()}>{t("room.send")}</button>
        </form>
      </div>
    </div>
  );
}

function Roadmap({ state, setState, code, intent }: { state: any; setState: (p: any) => void; code: string; intent: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const roadmap = state.roadmap;

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/career-roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "analyze", text: state.text || "", role: state.role || "", level: state.level || "", messages: state.interview_chat || [], intent }) });
      const d = await res.json();
      if (res.ok && d.roadmap) setState({ roadmap: d.roadmap });
      else setErr(d.error || t("roadmap.cantBuild"));
    } catch { setErr(t("roadmap.cantBuild")); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{(state.text || "").length < 60 ? t("roadmap.addResume") : t("roadmap.runIntro")}</div>
        <button onClick={run} disabled={busy || (state.text || "").length < 60} className="btn-primary text-sm">{busy ? t("roadmap.building") : roadmap ? t("roadmap.rebuild") : t("roadmap.build")}</button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {roadmap && (
        <>
          <CareerRoadmapView roadmap={roadmap} />
          <Link href={`/roadmap/${code}`} className="btn-primary block text-center">{t("roadmap.viewFull")}</Link>
        </>
      )}
    </div>
  );
}
