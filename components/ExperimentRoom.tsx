"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/Timer";
import ExperimentReport from "@/components/ExperimentReport";
import {
  EXPERIMENT_STEPS, CANVAS_PARTS, DEFAULT_CANVAS, canvasComplete, canvasFilledCount,
  simulate, dgpFromAI, seedFromCode, type ExperimentCanvas,
} from "@/lib/experiment";
import StepHeader from "./StepHeader";

const num = (v: any, d: number) => { const n = Number(v); return isFinite(n) ? n : d; };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function ExperimentRoom({ session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = EXPERIMENT_STEPS[phase] ?? EXPERIMENT_STEPS[0];
  const canvas: ExperimentCanvas = { ...DEFAULT_CANVAS, ...(state.exp || {}) };

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
  const setCanvas = (patch: Partial<ExperimentCanvas>) => setState({ exp: { ...canvas, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(EXPERIMENT_STEPS.length - 1, i));
    const status = clamped >= EXPERIMENT_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped); setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const ready = canvasComplete(canvas);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The Strategy Experiment</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < EXPERIMENT_STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {EXPERIMENT_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={EXPERIMENT_STEPS.length} title={step.title} />

      <div className="pb-24">
        {step.key === "canvas" && <CanvasStep canvas={canvas} setCanvas={setCanvas} />}
        {step.key === "simulate" && <SimulateStep canvas={canvas} state={state} setState={setState} code={session.code} ready={ready} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < EXPERIMENT_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={!ready} className="btn-primary disabled:opacity-40">Run it in silico →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function CanvasStep({ canvas, setCanvas }: { canvas: ExperimentCanvas; setCanvas: (p: Partial<ExperimentCanvas>) => void }) {
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const filled = canvasFilledCount(canvas);

  async function draft() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/experiment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "draft", idea: seed }) });
      const d = await res.json();
      if (res.ok && d.canvas) setCanvas(d.canvas);
      else setErr(d.error || "Couldn't draft it.");
    } catch { setErr("Couldn't draft it."); }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        A strategy experiment changes <span className="font-medium text-ink">one thing</span> and measures how firms, teams, or people react. Fill the eight parts of the canvas (Hasan, Kim &amp; Koning). Then we&apos;ll run it in silico.
      </div>

      <div className="card p-4">
        <label className="lbl">Have a rough idea? Let AI draft the canvas</label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input className="field flex-1" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. Teach founders a model of idea quality and see if their ideas get better" />
          <button onClick={draft} disabled={busy || seed.trim().length < 8} className="btn-primary text-sm disabled:opacity-40">{busy ? "Drafting…" : "Draft it"}</button>
        </div>
        {err && <p className="mt-2 text-sm text-clay">{err}</p>}
        <p className="mt-2 text-xs text-slate-400">A starting point to edit, not a final answer. {filled}/8 parts filled.</p>
      </div>

      <div className="grid gap-4">
        {CANVAS_PARTS.map((p) => (
          <div key={p.key}>
            <label className="lbl">{p.label}</label>
            <div className="mb-1 text-xs text-slate-400">{p.prompt}</div>
            <textarea className="field min-h-[64px]" value={canvas[p.key]} onChange={(e) => setCanvas({ [p.key]: e.target.value } as any)} placeholder={p.placeholder} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulateStep({ canvas, state, setState, code, ready }: { canvas: ExperimentCanvas; state: any; setState: (p: any) => void; code: string; ready: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const design = state.design; // { pattern, patternWhy, iia, warnings, dgp }
  const baseN = design ? Math.round(clamp(num(design?.dgp?.n, 300), 20, 20000)) : 300;

  const [nPer, setNPer] = useState<number>(baseN);
  const [effMult, setEffMult] = useState<number>(1);
  const [reshuffle, setReshuffle] = useState<number>(0);
  const seed = useMemo(() => (seedFromCode(code) + reshuffle * 7919) >>> 0, [code, reshuffle]);

  const dgp = useMemo(() => (design ? dgpFromAI(design.dgp, nPer, effMult) : null), [design, nPer, effMult]);
  const result = useMemo(() => (dgp ? simulate(dgp, seed) : null), [dgp, seed]);

  async function runDesign() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/experiment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "design", canvas }) });
      const d = await res.json();
      if (res.ok && d.design) { setState({ design: d.design }); setNPer(Math.round(clamp(num(d.design?.dgp?.n, 300), 20, 20000))); }
      else setErr(d.error || "Couldn't work the design through.");
    } catch { setErr("Couldn't work the design through."); }
    setBusy(false);
  }

  if (!design) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          AI reads your canvas, classifies the intervention, judges the idea, and proposes a realistic data-generating process. Then we <span className="font-medium text-ink">actually simulate</span> the experiment, many times, and fit the regression. Nothing is hand-waved, the power and p-values are honest.
        </div>
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm text-slate-500">{ready ? "Ready to simulate your experiment." : "Fill all eight canvas parts first."}</div>
          <button onClick={runDesign} disabled={busy || !ready} className="btn-primary text-sm disabled:opacity-40">{busy ? "Simulating…" : "Run it in silico →"}</button>
        </div>
        {err && <p className="text-sm text-clay">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Power playground */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Power playground</div>
          <button onClick={() => setReshuffle((r) => r + 1)} className="text-xs font-semibold text-ai hover:underline">↻ New random draw</button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Drag the sample size and the true effect, and watch significance and power move.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Sample size (total)</span><span className="font-semibold tabular-nums text-ink">{nPer}</span></div>
            <input type="range" min={40} max={2000} step={20} value={Math.min(2000, nPer)} onChange={(e) => setNPer(Number(e.target.value))} className="mt-1 w-full accent-[#3F7A52]" />
          </div>
          <div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">True effect size</span><span className="font-semibold tabular-nums text-ink">{effMult.toFixed(2)}×</span></div>
            <input type="range" min={0} max={2} step={0.05} value={effMult} onChange={(e) => setEffMult(Number(e.target.value))} className="mt-1 w-full accent-[#3F7A52]" />
          </div>
        </div>
        <button onClick={() => { setNPer(baseN); setEffMult(1); }} className="mt-3 text-xs text-slate-400 hover:text-ink">Reset to AI&apos;s estimate</button>
      </div>

      {result && dgp && <ExperimentReport canvas={canvas} design={design} dgp={dgp} result={result} />}
      <div className="text-center">
        <button onClick={() => setState({ design: null })} className="text-xs text-slate-400 hover:text-ink">Re-run the AI design from the canvas</button>
      </div>
    </div>
  );
}
