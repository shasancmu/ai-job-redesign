"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import Timer from "@/components/Timer";
import PaperStudyReport from "@/components/PaperStudyReport";
import { PAPER_STUDY_STEPS, EXAMPLE_PAPER } from "@/lib/paperstudy";
import StepHeader from "./StepHeader";

export default function PaperStudyRoom({ session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = PAPER_STUDY_STEPS[phase] ?? PAPER_STUDY_STEPS[0];

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
    const clamped = Math.max(0, Math.min(PAPER_STUDY_STEPS.length - 1, i));
    const status = clamped >= PAPER_STUDY_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const canStudy = (state.paper || "").trim().length >= 120;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Understand a Paper</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < PAPER_STUDY_STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {PAPER_STUDY_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={PAPER_STUDY_STEPS.length} title={step.title} />

      <div className="pb-24">
        {step.key === "setup" && <Setup paper={state.paper || ""} setPaper={(v) => setState({ paper: v })} />}
        {step.key === "study" && <Study state={state} setState={setState} code={session.code} canStudy={canStudy} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < PAPER_STUDY_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={!canStudy} className="btn-primary disabled:opacity-40">Deconstruct it →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Setup({ paper, setPaper }: { paper: string; setPaper: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        Paste a paper you want to understand. The abstract and introduction are enough. We&apos;ll read it back to you through four lenses:
        the idea it makes visible, its hourglass structure, its five points, and its key interaction.
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="lbl">The paper</label>
          <button onClick={() => setPaper(EXAMPLE_PAPER.text)} className="text-xs font-semibold text-sage hover:underline">
            Use the example ({EXAMPLE_PAPER.cite}) →
          </button>
        </div>
        <textarea className="field min-h-[220px]" value={paper} onChange={(e) => setPaper(e.target.value)}
          placeholder="Paste the title, abstract, and introduction here…" />
        <div className="mt-1 text-xs text-slate-400">{paper.trim().length} characters. Abstract + intro is plenty.</div>
      </div>
    </div>
  );
}

function Study({ state, setState, code, canStudy }: { state: any; setState: (p: any) => void; code: string; canStudy: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const study = state.study;
  const gate = usePredictGate({ guideKey: "paper-study", existing: state.prediction, save: (p) => setState({ prediction: p }), run: () => run(), revealLabel: "Deconstruct the paper" });

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/paper-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper: state.paper || "" }),
      });
      const d = await res.json();
      if (res.ok && d.study) setState({ study: d.study });
      else setErr(d.error || "Couldn't read the paper.");
    } catch { setErr("Couldn't read the paper."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {gate.modal}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          {!canStudy ? "Paste a paper first (go back a step)." : study ? "Read the deconstruction, then walk through how it was built." : "Guess the paper's core idea, then see it broken down."}
        </div>
        <button onClick={study ? run : gate.start} disabled={busy || !canStudy} className="btn-primary text-sm">
          {busy ? "Reading…" : study ? "Rebuild" : "Deconstruct the paper"}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {study && (
        <ReportReveal guideKey="paper-study" prediction={gate.prediction} code={code}>
          <PaperStudyReport study={study} />
        </ReportReveal>
      )}
    </div>
  );
}
