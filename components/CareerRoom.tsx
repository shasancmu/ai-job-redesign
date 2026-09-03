"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CAREER_STEPS, hasXray } from "@/lib/careerXray";
import Timer from "@/components/Timer";
import CareerXrayView from "@/components/CareerXrayView";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";
import StepHeader from "./StepHeader";

function tf(t: T, key: string, fallback: string) { const v = t(key); return v === key ? fallback : v; }

export default function CareerRoom({ me, session, mode, initialWorkspace, savedRole = "", savedLevel = "" }: { me: string; session: any; mode: "resume" | "jd"; initialWorkspace: any; savedRole?: string; savedLevel?: string }) {
  const supabase = createClient();
  const t = useT();
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

  // Prefill role/level from the saved profile once (résumé mode only — for a JD
  // X-ray the role belongs to the job posting, not the user).
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || mode !== "resume") return;
    prefilled.current = true;
    const patch: Record<string, any> = {};
    if (!state.role && savedRole) patch.role = savedRole;
    if (!state.level && savedLevel) patch.level = savedLevel;
    if (Object.keys(patch).length) setState(patch);
  }, []); // eslint-disable-line

  // Persist role/level back to the profile (debounced) for future runs.
  const profTimer = useRef<any>(null);
  useEffect(() => {
    if (mode !== "resume") return;
    if (profTimer.current) clearTimeout(profTimer.current);
    profTimer.current = setTimeout(() => {
      const p: Record<string, any> = {};
      if (state.role) p.job_title = state.role;
      if (state.level) p.level = state.level;
      if (Object.keys(p).length) supabase.from("profiles").update(p).eq("id", me);
    }, 900);
  }, [state.role, state.level]); // eslint-disable-line

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(CAREER_STEPS.length - 1, i));
    const status = clamped >= CAREER_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const isJD = mode === "jd";
  const label = isJD ? t("career.jdLabel") : t("career.resumeLabel");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{isJD ? t("career.roleTag") : t("career.careerTag")}</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < CAREER_STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {CAREER_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={CAREER_STEPS.length} minutes={step.minutes} title={tf(t, "steps.career." + step.key + ".title", step.title)} />

      <div className="pb-24">
        {step.key === "input" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
              {isJD
                ? t("career.introJd")
                : t("career.introResume")}
              <div className="mt-1.5 text-xs text-slate-400">{t("career.privateNote")}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="lbl">{isJD ? t("career.roleTitle") : t("career.currentRole")}</label><input className="field" placeholder={t("solo.jobTitlePh")} value={state.role || ""} onChange={(e) => setState({ role: e.target.value })} /></div>
              <div><label className="lbl">{t("career.levelOptional")}</label><input className="field" placeholder={t("career.levelPh")} value={state.level || ""} onChange={(e) => setState({ level: e.target.value })} /></div>
            </div>
            <div className="card p-5">
              <label className="lbl">{label}</label>
              <textarea className="field min-h-[220px]" placeholder={isJD ? t("career.pasteJd") : t("career.pasteResume")} value={state.text || ""} onChange={(e) => setState({ text: e.target.value })} />
            </div>
          </div>
        )}

        {step.key === "xray" && <Xray mode={mode} state={state} setState={setState} code={session.code} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < CAREER_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">{t("career.runXray")} →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">{t("room.finish")}</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Xray({ mode, state, setState, code }: { mode: "resume" | "jd"; state: any; setState: (p: Record<string, any>) => void; code: string }) {
  const t = useT();
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
      else setErr(d.error || t("career.cantAnalyze"));
    } catch {
      setErr(t("career.cantAnalyze"));
    }
    setBusy(false);
  }

  // The previous step's button already says "Run the X-ray", so run it. Without
  // this the analysis waited on a second, identically-labelled click.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    if (hasXray(xray) || (state.text || "").length < 60) return;
    started.current = true;
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{(state.text || "").length < 60 ? t("career.addTextFirst") : t("career.runGrounded")}</div>
        <button onClick={run} disabled={busy || (state.text || "").length < 60} className="btn-primary text-sm">{busy ? t("career.analyzing") : hasXray(xray) ? <>↻ {t("career.reRun")}</> : <>✨ {t("career.runXray")}</>}</button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {hasXray(xray) && (
        <>
          <CareerXrayView xray={xray} mode={mode} embedded />
          <Link href={`/career/${code}`} className="btn-primary block text-center">{t("career.viewFull")} →</Link>
        </>
      )}
    </div>
  );
}
