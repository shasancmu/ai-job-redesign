"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCohortPing } from "@/components/useCohortLive";
import { WORKFLOW_STEPS, STEP_ROLES } from "@/lib/workflow";
import { moduleBeacon } from "@/lib/clientBeacon";
import Timer from "@/components/Timer";
import PairWaiting from "@/components/PairWaiting";
import WorkflowFlow from "@/components/WorkflowFlow";
import TradeoffPlan from "@/components/TradeoffPlan";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";

type Doc = any;

// Translate with a fallback to the passed-in English (for step titles that live
// in lib/workflow.ts): if the key is missing, show the original rather than a key.
function tf(t: T, key: string, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export default function WorkflowRoom({
  me,
  initialSession,
  initialDoc,
  initialProfiles,
}: {
  me: string;
  initialSession: any;
  initialDoc: Doc;
  initialProfiles: any[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const pingCohort = useCohortPing(initialSession.cohort);
  const t = useT();
  const [session, setSession] = useState<any>(initialSession);
  const [doc, setDoc] = useState<Doc>({
    steps: [],
    ...initialDoc,
  });
  const [profiles, setProfiles] = useState<any[]>(initialProfiles);

  const partnerId = session.host_id === me ? session.guest_id : session.host_id;
  const partnerProfile = profiles.find((p) => p.id === partnerId);
  const step = WORKFLOW_STEPS[session.phase] ?? WORKFLOW_STEPS[0];

  // Drop-off funnel: entered the room, and reached the final step (once).
  useEffect(() => { if (session?.exercise) moduleBeacon(session.exercise, "paired", "start"); }, [session?.exercise]);
  const completedBeaconRef = useRef(false);
  useEffect(() => { if (session?.exercise && (session.phase ?? 0) >= WORKFLOW_STEPS.length - 1 && !completedBeaconRef.current) { completedBeaconRef.current = true; moduleBeacon(session.exercise, "paired", "complete"); } }, [session?.phase, session?.exercise]);

  const activeField = useRef<string | null>(null);

  // ---- Realtime: session + shared doc --------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`wf-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          if (payload.new) setSession((s: any) => ({ ...s, ...payload.new }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_docs",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const row = payload.new as Doc;
          if (!row) return;
          setDoc((d: Doc) => {
            const merged: Doc = { ...d };
            for (const k of Object.keys(row)) {
              if (k === activeField.current) continue; // don't clobber my edit
              merged[k] = (row as any)[k];
            }
            return merged;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, session.id]);

  useEffect(() => {
    if (partnerId && !partnerProfile) {
      supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", partnerId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfiles((p) => [...p.filter((x) => x.id !== data.id), data]);
        });
    }
  }, [partnerId, partnerProfile, supabase]);

  // ---- Autosave the shared doc ---------------------------------------------
  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase
      .from("workflow_docs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("session_id", session.id);
  }, [supabase, session.id]);

  const update = useCallback(
    (patch: Record<string, any>) => {
      setDoc((d: Doc) => ({ ...d, ...patch }));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush]
  );

  // steps helpers
  const steps: any[] = doc.steps || [];
  const setSteps = (next: any[]) => update({ steps: next });
  const addStep = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setSteps([...steps, { id: newId(), text: t, role: "" }]);
  };
  const editStep = (id: string, text: string) =>
    setSteps(steps.map((s) => (s.id === id ? { ...s, text } : s)));
  const setStepRole = (id: string, role: string) =>
    setSteps(steps.map((s) => (s.id === id ? { ...s, role } : s)));
  const removeStep = (id: string) => setSteps(steps.filter((s) => s.id !== id));

  // AI drafts the flow from the name + why.
  const [generating, setGenerating] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  async function generate() {
    setGenerating(true);
    setGenErr(null);
    try {
      const r = await fetch("/api/workflow/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, description: doc.why }),
      }).then((x) => x.json());
      if (r.steps && r.steps.length) {
        setSteps(r.steps.map((s: any) => ({ id: newId(), text: s.text, role: s.role || "human" })));
      } else {
        setGenErr(r.reason === "ai-off" ? t("workflow.aiOff") : t("workflow.cantDraft"));
      }
    } catch {
      setGenErr(t("workflow.cantDraft"));
    }
    setGenerating(false);
  }

  // ---- Analyze: where AI genuinely helps + a redesigned split --------------
  const analysis: any = doc.analysis || {};
  const redesignFlow: any[] = analysis.flow?.length ? analysis.flow : steps;
  const setFlow = (next: any[]) => update({ analysis: { ...analysis, flow: next } });
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null);
  async function analyze() {
    setAnalyzing(true);
    setAnalyzeErr(null);
    try {
      const r = await fetch("/api/workflow/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, description: doc.why, steps }),
      }).then((x) => x.json());
      if (r.analysis) {
        const withIds = (r.analysis.flow || []).map((s: any) => ({
          id: newId(),
          text: s.text,
          role: s.role || "human",
        }));
        update({
          analysis: {
            summary: r.analysis.summary || "",
            opportunities: r.analysis.opportunities || [],
            flow: withIds,
          },
        });
      } else {
        setAnalyzeErr(r.reason === "ai-off" ? t("workflow.aiOff") : t("workflow.cantAnalyze"));
      }
    } catch {
      setAnalyzeErr(t("workflow.cantAnalyze"));
    }
    setAnalyzing(false);
  }

  // ---- AI help for the three trade-offs ------------------------------------
  const [tradeoffBusy, setTradeoffBusy] = useState(false);
  const [tradeoffErr, setTradeoffErr] = useState<string | null>(null);
  async function suggestTradeoffs() {
    setTradeoffBusy(true);
    setTradeoffErr(null);
    try {
      const r = await fetch("/api/workflow/tradeoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, description: doc.why || "", summary: analysis.summary || "" }),
      }).then((x) => x.json());
      if (r.fields || r.plan) {
        const patch: Record<string, any> = {};
        for (const k of ["more", "better", "accuracy", "generality", "chaos", "architect"]) {
          if (!doc[k] && r.fields?.[k]) patch[k] = r.fields[k];
        }
        if (r.plan) patch.analysis = { ...analysis, tradeoffs: r.plan };
        if (Object.keys(patch).length) update(patch);
      } else {
        setTradeoffErr(r.reason === "ai-off" ? t("workflow.aiOff") : t("workflow.cantSuggest"));
      }
    } catch {
      setTradeoffErr(t("workflow.cantSuggest"));
    }
    setTradeoffBusy(false);
  }

  // ---- Broadcast nudge -----------------------------------------------------
  const [nudge, setNudge] = useState<string | null>(null);
  const lastBroadcast = useRef<string | null>(initialSession.broadcast_at || null);
  useEffect(() => {
    if (session.broadcast_at && session.broadcast_at !== lastBroadcast.current) {
      lastBroadcast.current = session.broadcast_at;
      if (session.broadcast_msg) {
        setNudge(session.broadcast_msg);
        const t = setTimeout(() => setNudge(null), 8000);
        return () => clearTimeout(t);
      }
    }
  }, [session.broadcast_at, session.broadcast_msg]);

  // ---- Phase control -------------------------------------------------------
  async function goToPhase(index: number, fresh = true) {
    const clamped = Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, index));
    const status = clamped >= WORKFLOW_STEPS.length - 1 ? "done" : "active";
    const startedAt = fresh
      ? new Date().toISOString()
      : new Date(Date.now() - (WORKFLOW_STEPS[clamped].minutes * 60 + 1) * 1000).toISOString();
    setSession((s: any) => ({ ...s, phase: clamped, phase_started_at: startedAt, status }));
    await supabase
      .from("sessions")
      .update({ phase: clamped, phase_started_at: startedAt, status })
      .eq("id", session.id);
    pingCohort(); // let the facilitator cockpit refetch instantly
  }
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  // Stable local fallback start time (reset per phase) so the timer runs and the
  // forward gate unlocks even when the DB's phase_started_at never lands.
  const [localStart, setLocalStart] = useState(() => Date.now());
  useEffect(() => { setLocalStart(Date.now()); }, [session.phase]);
  const startedMs = session.phase_started_at ? new Date(session.phase_started_at).getTime() : localStart;
  const timerDone = Math.max(0, step.minutes * 60 - Math.floor((nowTick - startedMs) / 1000)) === 0;
  async function resetTimer() {
    const now = new Date().toISOString();
    setSession((s: any) => ({ ...s, phase_started_at: now }));
    await supabase.from("sessions").update({ phase_started_at: now }).eq("id", session.id);
  }

  // bind helpers for text fields (track focus so remote merges don't clobber)
  const bind = (field: string) => ({
    value: doc[field] || "",
    onFocus: () => (activeField.current = field),
    onBlur: () => {
      if (activeField.current === field) activeField.current = null;
    },
    onChange: (e: any) => update({ [field]: e.target.value }),
  });

  const partnerHere = !!partnerId;

  // Start the opening phase's timer when the partner arrives (phase 0 never gets
  // a start time otherwise, freezing the timer). Host sets it; realtime syncs.
  useEffect(() => {
    if (partnerHere && !session.phase_started_at) {
      goToPhase(session.phase ?? 0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerHere, session.phase_started_at]);

  if (!partnerHere && session.host_id === me) {
    return <PairWaiting code={session.code} />;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {nudge && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
          <div className="flex items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            <span className="text-base">📣</span>
            {nudge}
            <button onClick={() => setNudge(null)} className="ml-2 text-white/50 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">
            ← {t("room.exit")}
          </Link>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
            {session.code}
          </span>
          <span className="hidden text-sm text-slate-500 sm:inline">
            {t("workflow.with")}{" "}
            <span className="font-medium text-slate-700">
              {partnerProfile?.display_name || t("room.yourPartner")}
            </span>
          </span>
        </div>
        <Timer startedAt={session.phase_started_at || new Date(localStart).toISOString()} minutes={step.minutes} onReset={resetTimer} onAdvance={session.phase < WORKFLOW_STEPS.length - 1 ? () => goToPhase(session.phase + 1, true) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {WORKFLOW_STEPS.map((p) => {
          const past = p.index < session.phase;
          const current = p.index === session.phase;
          return (
            <button
              key={p.key}
              onClick={() => past && goToPhase(p.index, false)}
              disabled={!past}
              title={
                past
                  ? t("room.reviewStep", { title: tf(t, "steps.workflow." + p.key + ".title", p.title) })
                  : tf(t, "steps.workflow." + p.key + ".title", p.title)
              }
              className={
                "h-1.5 flex-1 rounded-full transition " +
                (past ? "bg-ink hover:opacity-70" : current ? "bg-ai" : "bg-slate-200")
              }
            />
          );
        })}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t("room.step", { n: session.phase + 1, total: WORKFLOW_STEPS.length })} ·{" "}
          {t("catalog.min", { n: step.minutes })} · {t("workflow.sharedCanvas")}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{tf(t, "steps.workflow." + step.key + ".title", step.title)}</h1>
        <p className="mt-1 max-w-3xl text-slate-500">{tf(t, "steps.workflow." + step.key + ".subtitle", step.subtitle)}</p>
      </div>

      {!partnerHere && (
        <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("workflow.waitingJoin")}{" "}
          <span className="font-mono font-semibold">{session.code}</span>…
        </div>
      )}

      <div className="pb-24">
        {step.key === "name" && (
          <div className="space-y-4">
            <div className="card p-5">
              <label className="lbl">{t("workflow.nameLabel")}</label>
              <input className="field" placeholder={t("workflow.namePh")} {...bind("name")} />
            </div>
            <div className="card p-5">
              <label className="lbl">
                {t("workflow.describeLabel")}
              </label>
              <textarea
                className="field min-h-[120px]"
                placeholder={t("workflow.describePh")}
                {...bind("why")}
              />
            </div>
          </div>
        )}

        {step.key === "map" && (
          <div className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-slate-500">
                {t("workflow.mapIntroPre")}{" "}<span className="font-semibold text-ink">{t("workflow.mapIntroToday")}</span>{t("workflow.mapIntroPost")}
              </div>
              <button onClick={generate} disabled={generating} className="btn-primary text-sm">
                {generating ? t("workflow.drawing") : steps.length ? "↻ " + t("workflow.redraw") : t("workflow.drawCurrent")}
              </button>
            </div>
            {genErr && <p className="text-sm text-clay">{genErr}</p>}
            <WorkflowFlow
              steps={steps}
              onChange={setSteps}
              onActive={(a) => (activeField.current = a ? "steps" : null)}
            />
          </div>
        )}

        {step.key === "analyze" && (
          <div className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-slate-500">
                {t("workflow.analyzeIntro")}
              </div>
              <button onClick={analyze} disabled={analyzing || !steps.length} className="btn-primary text-sm">
                {analyzing ? t("workflow.analyzing") : analysis.opportunities?.length ? "↻ " + t("workflow.reanalyze") : t("workflow.analyzeWithAI")}
              </button>
            </div>
            {!steps.length && <p className="text-sm text-clay">{t("workflow.drawFirst")}</p>}
            {analyzeErr && <p className="text-sm text-clay">{analyzeErr}</p>}

            {analysis.summary && (
              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("workflow.whereAiHelps")}</div>
                <p className="mt-1 leading-relaxed text-slate-700">{analysis.summary}</p>
              </div>
            )}

            {analysis.opportunities?.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {analysis.opportunities.map((o: any, i: number) => (
                  <div key={i} className="card overflow-hidden p-0">
                    <div className="h-1.5" style={{ background: "#CE8F2C" }} />
                    <div className="p-5">
                      <div className="text-base font-bold text-ink">{o.title}</div>
                      <OppField label={t("workflow.oppOutcome")}>{o.outcome}</OppField>
                      <OppField label={t("workflow.oppHow")}>{o.how}</OppField>
                      <OppField label={t("workflow.oppPrep")}>{o.prep}</OppField>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {analysis.flow?.length > 0 && (
              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("workflow.redesignedFlow")}</div>
                <p className="mt-1 text-sm text-slate-500">{t("workflow.recolorHint")}</p>
                <div className="mt-3"><Legend /></div>
                <div className="mt-4">
                  <WorkflowFlow
                    steps={analysis.flow}
                    onChange={setFlow}
                    onActive={(a) => (activeField.current = a ? "analysis" : null)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step.key === "tradeoffs" && (
          <div className="space-y-5">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-slate-500">
                {t("workflow.tradeoffsIntro")}
              </div>
              <button onClick={suggestTradeoffs} disabled={tradeoffBusy} className="btn-primary text-sm">
                {tradeoffBusy ? t("room.thinking") : analysis.tradeoffs ? "↻ " + t("workflow.rebuildPlan") : t("workflow.thinkThroughPlan")}
              </button>
            </div>
            {tradeoffErr && <p className="text-sm text-clay">{tradeoffErr}</p>}
            <TradeoffRow
              occ={t("workflow.occOutcomes")}
              title={t("workflow.moreVsBetter")}
              hint={t("workflow.moreHint")}
              leftLabel={t("workflow.moreLabel")}
              rightLabel={t("workflow.betterLabel")}
              left={bind("more")}
              right={bind("better")}
            />
            <TradeoffRow
              occ={t("workflow.occCapabilities")}
              title={t("workflow.accuracyVsGenerality")}
              hint={t("workflow.accuracyHint")}
              leftLabel={t("workflow.accuracyLabel")}
              rightLabel={t("workflow.generalityLabel")}
              left={bind("accuracy")}
              right={bind("generality")}
            />
            <TradeoffRow
              occ={t("workflow.occControl")}
              title={t("workflow.structureVsAutonomy")}
              hint={t("workflow.controlHint")}
              leftLabel={t("workflow.chaosLabel")}
              rightLabel={t("workflow.architectLabel")}
              left={bind("chaos")}
              right={bind("architect")}
            />
            <TradeoffPlan plan={analysis.tradeoffs} />
          </div>
        )}

        {step.key === "redesign" && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">
                {t("workflow.yourAiHumanWorkflow")}
              </div>
              <div className="mt-1 text-lg font-bold text-ink">{doc.name || "—"}</div>
              {analysis.summary && <p className="mt-1 text-sm text-slate-500">{analysis.summary}</p>}
              <div className="mt-2">
                <Legend />
              </div>
              <div className="mt-4">
                <WorkflowFlow steps={redesignFlow} editable={false} />
              </div>
            </div>
            {analysis.opportunities?.length > 0 && (
              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber">{t("workflow.startThisWeek")}</div>
                <ul className="mt-2 space-y-2">
                  {analysis.opportunities.map((o: any, i: number) => (
                    <li key={i} className="text-sm text-slate-700">
                      <span className="font-semibold text-ink">{o.title}:</span> {o.outcome}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="card p-5">
              <label className="lbl">{t("workflow.stopStartLabel")}</label>
              <textarea
                className="field min-h-[110px]"
                placeholder={t("workflow.stopStartPh")}
                {...bind("stop_start")}
              />
            </div>
            <Link href={`/workflow-plan/${session.code}`} className="btn-primary block text-center">
              {t("workflow.viewFullPlan")} →
            </Link>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => goToPhase(session.phase - 1, false)}
            disabled={session.phase === 0}
            className="btn-ghost"
          >
            {t("room.back")}
          </button>
          <div className="hidden text-sm text-slate-400 sm:block">
            {timerDone ? t("workflow.timeUp") : t("room.timerWait")}
          </div>
          {session.phase < WORKFLOW_STEPS.length - 1 ? (
            <button
              onClick={() => goToPhase(session.phase + 1, true)}
              disabled={!timerDone}
              className="btn-primary"
            >
              {t("room.next")} →
            </button>
          ) : (
            <Link href="/dashboard?done=1" className="btn-primary">
              {t("room.finish")}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Legend() {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate2">
      {STEP_ROLES.map((r) => (
        <span key={r.key} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
          {r.label}
        </span>
      ))}
    </div>
  );
}

function OppField({ label, children }: { label: string; children: any }) {
  const t = useT();
  if (!children) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#CE8F2C" }}>
        {label}
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function TradeoffRow({
  occ,
  title,
  hint,
  leftLabel,
  rightLabel,
  left,
  right,
}: {
  occ: string;
  title: string;
  hint: string;
  leftLabel: string;
  rightLabel: string;
  left: any;
  right: any;
}) {
  const t = useT();
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-sage">{occ}</div>
      <div className="mt-0.5 font-bold text-ink">{title}</div>
      <div className="mb-3 text-sm text-slate-500">{hint}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="lbl">{leftLabel}</label>
          <textarea className="field" {...left} />
        </div>
        <div>
          <label className="lbl">{rightLabel}</label>
          <textarea className="field" {...right} />
        </div>
      </div>
    </div>
  );
}
