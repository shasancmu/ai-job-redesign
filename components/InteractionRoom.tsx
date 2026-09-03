"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import Timer from "@/components/Timer";
import InteractionPlot from "@/components/InteractionPlot";
import InteractionReport from "@/components/InteractionReport";
import { INTERACTION_STEPS, DEFAULT_IDEA, ideaSentence, ideaComplete, type IdeaInputs, type Direction } from "@/lib/interaction";
import StepHeader from "./StepHeader";
import { useT } from "@/components/I18nProvider";

export default function InteractionRoom({ session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = INTERACTION_STEPS[phase] ?? INTERACTION_STEPS[0];
  const idea: IdeaInputs = { ...DEFAULT_IDEA, ...(state.idea || {}) };

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
  const setIdea = (patch: Partial<IdeaInputs>) => setState({ idea: { ...idea, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(INTERACTION_STEPS.length - 1, i));
    const status = clamped >= INTERACTION_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const canFrame = ideaComplete(idea);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The Anatomy of an Idea</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < INTERACTION_STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {INTERACTION_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={INTERACTION_STEPS.length} title={step.title} />

      <div className="pb-24">
        {step.key === "frame" && <Frame idea={idea} setIdea={setIdea} />}
        {step.key === "reveal" && <Reveal idea={idea} setIdea={setIdea} state={state} setState={setState} code={session.code} canFrame={canFrame} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < INTERACTION_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={!canFrame} className="btn-primary disabled:opacity-40">Next →</button>
          ) : (
            <Link href={`/done/${session.code}`} className="btn-primary">{t("room.finish")}</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function DirToggle({ direction, onChange, z }: { direction: Direction; onChange: (d: Direction) => void; z: string }) {
  const zn = z.trim() || "Z";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button onClick={() => onChange("especially")} className={"rounded-xl border-2 p-3 text-left transition " + (direction === "especially" ? "border-ink bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
        <div className="text-sm font-semibold text-ink">Especially when {zn}</div>
        <div className="mt-0.5 text-xs text-slate-500">The effect is stronger when {zn} (β3 positive).</div>
      </button>
      <button onClick={() => onChange("except")} className={"rounded-xl border-2 p-3 text-left transition " + (direction === "except" ? "border-ink bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
        <div className="text-sm font-semibold text-ink">Except when {zn}</div>
        <div className="mt-0.5 text-xs text-slate-500">The effect weakens or vanishes when {zn} (β3 negative).</div>
      </button>
    </div>
  );
}

function Frame({ idea, setIdea }: { idea: IdeaInputs; setIdea: (p: Partial<IdeaInputs>) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        An idea is a statement: <span className="font-medium text-ink">IF X, then Y, especially or except when Z, because a mechanism.</span> Name
        the pieces, and watch the idea take shape.
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="X — the main cause" hint="the treatment or driver"><input className="field" value={idea.x} onChange={(e) => setIdea({ x: e.target.value })} placeholder="e.g. adopting A/B testing" /></Field>
        <Field label="Y — the outcome" hint="what you're explaining"><input className="field" value={idea.y} onChange={(e) => setIdea({ y: e.target.value })} placeholder="e.g. startup performance" /></Field>
        <Field label="Z — the scope condition" hint="what changes X's effect"><input className="field" value={idea.z} onChange={(e) => setIdea({ z: e.target.value })} placeholder="e.g. managerial experience" /></Field>
      </div>
      <Field label="How does Z change the effect of X?">
        <DirToggle direction={idea.direction} onChange={(d) => setIdea({ direction: d })} z={idea.z} />
      </Field>

      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your idea, so far</div>
        <p className="mt-1 text-base font-semibold text-ink">{ideaSentence(idea)}</p>
        <div className="mt-3"><InteractionPlot xLabel={idea.x || "X"} yLabel={idea.y || "Y"} zLabel={idea.z || "Z"} direction={idea.direction} /></div>
      </div>
    </div>
  );
}

function Reveal({ idea, setIdea, state, setState, code, canFrame }: { idea: IdeaInputs; setIdea: (p: Partial<IdeaInputs>) => void; state: any; setState: (p: any) => void; code: string; canFrame: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const result = state.result;
  const hasMechanism = (idea.mechanism || "").trim().length > 3;
  const gate = usePredictGate({ guideKey: "interaction", existing: state.prediction, save: (p) => setState({ prediction: p }), run: () => run(), revealLabel: "Test my idea" });

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...idea, guess: state.prediction?.text || "" }),
      });
      const d = await res.json();
      if (res.ok && d.idea) setState({ result: d.idea });
      else setErr(d.error || "Couldn't work the idea through.");
    } catch { setErr("Couldn't work the idea through."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {gate.modal}
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        The <span className="font-medium text-ink">because</span> is the idea. A mechanism comes from a model, and a good one predicts which{" "}
        <span className="font-medium text-ink">other</span> outcomes should move if it&apos;s true.
      </div>
      <Field label="R — the mechanism" hint="why does Z change the effect of X?"><textarea className="field min-h-[80px]" value={idea.mechanism || ""} onChange={(e) => setIdea({ mechanism: e.target.value })} placeholder="Because experienced managers can interpret and act on experimental results…" /></Field>
      <Field label="The model it comes from" hint="the logic or theory behind the mechanism (optional)"><textarea className="field min-h-[60px]" value={idea.model || ""} onChange={(e) => setIdea({ model: e.target.value })} placeholder="A learning model: experiments only help if you can update on them." /></Field>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{result ? "Refine and re-test any time." : "Before the reveal, you'll guess what else your mechanism predicts."}</div>
        <button onClick={result ? run : gate.start} disabled={busy || !canFrame || !hasMechanism} className="btn-primary text-sm disabled:opacity-40">
          {busy ? "Working…" : result ? "Re-test" : "Test my idea"}
        </button>
      </div>
      {!hasMechanism && <p className="text-xs text-slate-400">Write the mechanism (the because) to test it.</p>}
      {err && <p className="text-sm text-clay">{err}</p>}
      {result && (
        <ReportReveal guideKey="interaction" prediction={state.prediction} code={code}>
          <InteractionReport inputs={idea} idea={result} />
        </ReportReveal>
      )}
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
