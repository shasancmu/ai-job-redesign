"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import Timer from "@/components/Timer";
import PipelineReport from "@/components/PipelineReport";
import { PIPELINE_STEPS, QUALITY, DEFAULT_INPUTS, simulate, type PipelineInputs } from "@/lib/pipeline";

export default function PipelineRoom({ session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
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
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Publication Pipeline</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {PIPELINE_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Step {phase + 1} of {PIPELINE_STEPS.length}</div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "inputs" && <Inputs inputs={inputs} setInput={setInput} />}
        {step.key === "results" && <Results inputs={inputs} state={state} setState={setState} code={session.code} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < PIPELINE_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">See the odds →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
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
        Peer review is a lottery: a handful of reviewers, a variable editor, and a paper that cycles through journals until it lands or you kill
        it. Set your situation honestly, then we&apos;ll simulate what it takes to hit your target.
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Publications you want" hint="e.g. tenure often needs 5 to 6 strong papers"><Num value={inputs.target} onChange={(v) => setInput("target", v)} min={1} max={30} /></Field>
        <Field label="Over how many years"><Num value={inputs.years} onChange={(v) => setInput("years", v)} min={1} max={20} suffix="years" /></Field>
        <Field label="Papers you start per year" hint="realistically, how many new projects you begin"><Num value={inputs.pace} onChange={(v) => setInput("pace", v)} min={0.5} max={10} step={0.5} /></Field>
        <Field label="Journals before you kill a paper" hint="how many rejections you'll shop through"><Num value={inputs.maxJournals} onChange={(v) => setInput("maxJournals", v)} min={1} max={10} /></Field>
        <Field label="Reviewers per submission"><Num value={inputs.reviewers} onChange={(v) => setInput("reviewers", v)} min={1} max={6} /></Field>
        <Field label="Months per review cycle"><Num value={inputs.cycleMonths} onChange={(v) => setInput("cycleMonths", v)} min={1} max={24} suffix="months" /></Field>
      </div>
      <Field label="How strong is a typical paper of yours, honestly?" hint="This sets each reviewer's odds of saying yes.">
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
  const gate = usePredictGate({ guideKey: "pipeline", existing: state.prediction, save: (p) => setState({ prediction: p }), run: () => run(), revealLabel: "Run the simulation" });

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
          {result ? "Adjust your inputs and rerun any time." : "Guess how many papers you'll need to write, then see the model."}
        </div>
        <button onClick={result ? run : gate.start} disabled={busy} className="btn-primary text-sm">
          {busy ? "Simulating…" : result ? "Rerun" : "Run the simulation"}
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
