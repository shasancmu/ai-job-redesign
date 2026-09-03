"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import Timer from "@/components/Timer";
import PipelineReport from "@/components/PipelineReport";
import { PIPELINE_STEPS, PIPELINE_STAGES, FUNNEL_NOTE, QUALITY, DEFAULT_INPUTS, simulate, type PipelineInputs } from "@/lib/pipeline";
import StepHeader from "./StepHeader";
import { useT } from "@/components/I18nProvider";

export default function PipelineRoom({ session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = PIPELINE_STEPS[phase] ?? PIPELINE_STEPS[0];
  const inputs: PipelineInputs = { ...DEFAULT_INPUTS, ...(state.inputs || {}) };

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
  const setInput = (k: keyof PipelineInputs, v: any) => setState({ inputs: { ...inputs, [k]: v } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(PIPELINE_STEPS.length - 1, i));
    const status = clamped >= PIPELINE_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Publication Pipeline</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < PIPELINE_STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {PIPELINE_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={PIPELINE_STEPS.length} title={step.title} />

      <div className="pb-24">
        {step.key === "process" && <Process />}
        {step.key === "inputs" && <Inputs inputs={inputs} setInput={setInput} />}
        {step.key === "results" && <Results inputs={inputs} state={state} setState={setState} code={session.code} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < PIPELINE_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">Next →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">{t("room.finish")}</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Process() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        Before the numbers, see how a paper actually gets published. It's not one gate, it's a series of filters, and most papers die at one of
        them. Structure varies by journal, but the shape is the same.
      </div>
      <ol className="space-y-2.5">
        {PIPELINE_STAGES.map((s, i) => (
          <li key={s.role} className="flex gap-3 rounded-2xl border border-line bg-white p-3.5">
            <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-mist text-xs font-bold text-slate-500">{i + 1}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-ink">{s.role}</span>
                <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.filter}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{s.what}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "#CE8F2C55", background: "#FBF3E3" }}>
        <span className="font-semibold text-ink">The funnel: </span>
        <span className="text-slate-700">{FUNNEL_NOTE}</span>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {hint && <div className="mb-1 text-xs text-slate-400">{hint}</div>}
      {children}
    </div>
  );
}

function Num({ value, onChange, min, max, step = 1, suffix }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" className="field w-28" value={value} min={min} max={max} step={step}
        onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))); }} />
      {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
    </div>
  );
}

function Inputs({ inputs, setInput }: { inputs: PipelineInputs; setInput: (k: keyof PipelineInputs, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        Now put your own goal against those odds. Tenure usually needs a <span className="font-medium text-ink">count</span> of papers by a deadline,
        so start there, then be honest about how likely your papers are to win reviewers over.
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Publications you need" hint="tenure is often ~6"><Num value={inputs.target} onChange={(v) => setInput("target", v)} min={1} max={30} /></Field>
        <Field label="By when" hint="tenure clock ~8 yrs"><Num value={inputs.years} onChange={(v) => setInput("years", v)} min={1} max={20} suffix="yrs" /></Field>
        <Field label="New papers you start / year"><Num value={inputs.pace} onChange={(v) => setInput("pace", v)} min={0.5} max={10} step={0.5} /></Field>
      </div>
      <Field label="How likely is a typical paper of yours to win reviewers over?" hint="This is the one lever that moves the numbers.">
        <div className="grid gap-2 sm:grid-cols-2">
          {QUALITY.map((q) => (
            <button key={q.key} onClick={() => setInput("quality", q.key)}
              className={"rounded-xl border-2 p-3 text-left transition " + (inputs.quality === q.key ? "border-ink bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
              <div className="text-sm font-semibold text-ink">{q.label}</div>
              <div className="mt-0.5 text-xs text-slate-500">{q.note}</div>
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function Results({ inputs, state, setState, code }: { inputs: PipelineInputs; state: any; setState: (p: any) => void; code: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const result = state.result;
  const advice = state.advice;
  const gate = usePredictGate({ guideKey: "pipeline", existing: state.prediction, save: (p) => setState({ prediction: p }), run: () => run(), revealLabel: "Show me the math" });

  async function run() {
    setBusy(true); setErr(null);
    const res = simulate(inputs);
    setState({ result: res });
    try {
      const r = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, result: res }),
      });
      const d = await r.json();
      if (r.ok && d.advice) setState({ result: res, advice: d.advice });
      else setErr(d.error || "Simulated the odds; the strategy write-up is unavailable right now.");
    } catch {
      setErr("Simulated the odds; the strategy write-up is unavailable right now.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {gate.modal}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          {result ? "Adjust your inputs and rerun any time." : "First, a guess: how many papers would you have to write to bank your target?"}
        </div>
        <button onClick={result ? run : gate.start} disabled={busy} className="btn-primary text-sm">
          {busy ? "Working…" : result ? "Rerun" : "Show me the math"}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {result && (
        <ReportReveal guideKey="pipeline" prediction={gate.prediction} code={code}>
          <PipelineReport inputs={inputs} result={result} advice={advice} />
        </ReportReveal>
      )}
    </div>
  );
}
