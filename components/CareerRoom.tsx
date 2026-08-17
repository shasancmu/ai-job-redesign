"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CAREER_STEPS, hasXray } from "@/lib/careerXray";
import Timer from "@/components/Timer";
import CareerXrayView from "@/components/CareerXrayView";

export default function CareerRoom({ me, session, mode, initialWorkspace }: { me: string; session: any; mode: "resume" | "jd"; initialWorkspace: any }) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = CAREER_STEPS[phase] ?? CAREER_STEPS[0];

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
    const clamped = Math.max(0, Math.min(CAREER_STEPS.length - 1, i));
    const status = clamped >= CAREER_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const isJD = mode === "jd";
  const label = isJD ? "Job description" : "Resume";

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{isJD ? "Role X-ray" : "Career X-ray"}</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {CAREER_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Step {phase + 1} of {CAREER_STEPS.length} · {step.minutes} min</div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "input" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
              {isJD
                ? "Paste a job description. AI decomposes it into tasks, scores each for AI exposure, benchmarks it against the occupation, and shows how to find the person for it."
                : "Paste your resume (or the key parts). AI decomposes it into tasks, scores each for AI exposure, benchmarks you against your occupation, and maps where to lean in and where to go next."}
              <div className="mt-1.5 text-xs text-slate-400">Private to you — nothing is shown to other participants.</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="lbl">{isJD ? "Role title" : "Your current role"}</label><input className="field" placeholder="e.g. Senior Marketing Manager" value={state.role || ""} onChange={(e) => setState({ role: e.target.value })} /></div>
              <div><label className="lbl">Level (optional)</label><input className="field" placeholder="e.g. Manager, VP, IC5" value={state.level || ""} onChange={(e) => setState({ level: e.target.value })} /></div>
            </div>
            <div className="card p-5">
              <label className="lbl">{label}</label>
              <textarea className="field min-h-[220px]" placeholder={isJD ? "Paste the job description…" : "Paste your resume, or your key experience and responsibilities…"} value={state.text || ""} onChange={(e) => setState({ text: e.target.value })} />
            </div>
          </div>
        )}

        {step.key === "xray" && <Xray mode={mode} state={state} setState={setState} code={session.code} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < CAREER_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">Run the X-ray →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Xray({ mode, state, setState, code }: { mode: "resume" | "jd"; state: any; setState: (p: Record<string, any>) => void; code: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const xray = state.xray;

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/career", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, text: state.text || "", role: state.role || "", level: state.level || "" }) });
      const d = await res.json();
      if (res.ok && d.xray) setState({ xray: d.xray, mode });
      else setErr(d.error || "Couldn't run the analysis.");
    } catch {
      setErr("Couldn't run the analysis.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{(state.text || "").length < 60 ? "Add your text on the previous step first." : "Run the research-grounded exposure analysis."}</div>
        <button onClick={run} disabled={busy || (state.text || "").length < 60} className="btn-primary text-sm">{busy ? "Analyzing…" : hasXray(xray) ? "↻ Re-run" : "✨ Run the X-ray"}</button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {hasXray(xray) && (
        <>
          <CareerXrayView xray={xray} mode={mode} embedded />
          <Link href={`/career/${code}`} className="btn-primary block text-center">View the full X-ray →</Link>
        </>
      )}
    </div>
  );
}
