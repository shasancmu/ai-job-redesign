"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WORKFLOW_STEPS, STEP_ROLES } from "@/lib/workflow";
import Timer from "@/components/Timer";
import PairWaiting from "@/components/PairWaiting";
import WorkflowFlow from "@/components/WorkflowFlow";

type Doc = any;

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
  const [session, setSession] = useState<any>(initialSession);
  const [doc, setDoc] = useState<Doc>({
    steps: [],
    ...initialDoc,
  });
  const [profiles, setProfiles] = useState<any[]>(initialProfiles);

  const partnerId = session.host_id === me ? session.guest_id : session.host_id;
  const partnerProfile = profiles.find((p) => p.id === partnerId);
  const step = WORKFLOW_STEPS[session.phase] ?? WORKFLOW_STEPS[0];

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
        setGenErr(r.reason === "ai-off" ? "AI isn't set up for this session." : "Couldn't draft it — add steps by hand.");
      }
    } catch {
      setGenErr("Couldn't draft it — add steps by hand.");
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
        setAnalyzeErr(r.reason === "ai-off" ? "AI isn't set up for this session." : "Couldn't analyze — try again.");
      }
    } catch {
      setAnalyzeErr("Couldn't analyze — try again.");
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
      if (r.fields) {
        const patch: Record<string, string> = {};
        for (const k of ["more", "better", "accuracy", "generality", "chaos", "architect"]) {
          if (!doc[k] && r.fields[k]) patch[k] = r.fields[k];
        }
        if (Object.keys(patch).length) update(patch);
        else setTradeoffErr("Your answers are already filled in — edit them freely.");
      } else {
        setTradeoffErr(r.reason === "ai-off" ? "AI isn't set up for this session." : "Couldn't get suggestions — try again.");
      }
    } catch {
      setTradeoffErr("Couldn't get suggestions — try again.");
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
  }
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const startedMs = session.phase_started_at ? new Date(session.phase_started_at).getTime() : nowTick;
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
            ← Exit
          </Link>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
            {session.code}
          </span>
          <span className="hidden text-sm text-slate-500 sm:inline">
            with{" "}
            <span className="font-medium text-slate-700">
              {partnerProfile?.display_name || "your partner"}
            </span>
          </span>
        </div>
        <Timer startedAt={session.phase_started_at} minutes={step.minutes} onReset={resetTimer} />
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
              title={past ? `Review: ${p.title}` : p.title}
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
          Step {session.phase + 1} of {WORKFLOW_STEPS.length} · {step.minutes} min ·
          shared canvas
        </div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
        <p className="mt-1 max-w-3xl text-slate-500">{step.subtitle}</p>
      </div>

      {!partnerHere && (
        <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Waiting for your partner to join{" "}
          <span className="font-mono font-semibold">{session.code}</span>…
        </div>
      )}

      <div className="pb-24">
        {step.key === "name" && (
          <div className="space-y-4">
            <div className="card p-5">
              <label className="lbl">In one line, what is the workflow?</label>
              <input className="field" placeholder="e.g. Monthly board reporting" {...bind("name")} />
            </div>
            <div className="card p-5">
              <label className="lbl">
                Describe it — how does it work today, and what breaks if you don&apos;t redesign it?
              </label>
              <textarea
                className="field min-h-[120px]"
                placeholder="Walk through what happens, start to finish. The more you say, the better AI can draw it next."
                {...bind("why")}
              />
            </div>
          </div>
        )}

        {step.key === "map" && (
          <div className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-slate-500">
                The workflow exactly as it runs <span className="font-semibold text-ink">today</span> — every step a human does now. You&apos;ll add AI next.
              </div>
              <button onClick={generate} disabled={generating} className="btn-primary text-sm">
                {generating ? "Drawing…" : steps.length ? "↻ Redraw" : "✨ Draw the current workflow"}
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
                AI reads your real workflow and finds where it genuinely helps — the outcome you want, how AI gets there, and how to prep fast.
              </div>
              <button onClick={analyze} disabled={analyzing || !steps.length} className="btn-primary text-sm">
                {analyzing ? "Analyzing…" : analysis.opportunities?.length ? "↻ Re-analyze" : "✨ Analyze with AI"}
              </button>
            </div>
            {!steps.length && <p className="text-sm text-clay">Draw the current workflow first (previous step).</p>}
            {analyzeErr && <p className="text-sm text-clay">{analyzeErr}</p>}

            {analysis.summary && (
              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-sage">Where AI helps</div>
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
                      <OppField label="The outcome">{o.outcome}</OppField>
                      <OppField label="How AI does it">{o.how}</OppField>
                      <OppField label="Prep fast">{o.prep}</OppField>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {analysis.flow?.length > 0 && (
              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-sage">Redesigned flow — AI + human</div>
                <p className="mt-1 text-sm text-slate-500">Green stays human; gold is AI. Recolor together — disagreements are the most interesting part.</p>
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
                Not sure how to fill these in? Let AI draft a first pass for this workflow — then make it yours.
              </div>
              <button onClick={suggestTradeoffs} disabled={tradeoffBusy} className="btn-primary text-sm">
                {tradeoffBusy ? "Thinking…" : "✨ Help me think this through"}
              </button>
            </div>
            {tradeoffErr && <p className="text-sm text-clay">{tradeoffErr}</p>}
            <TradeoffRow
              occ="Outcomes"
              title="More vs. Better"
              hint="AI pulls toward more. Is that where you want to land?"
              leftLabel="More (faster, cheaper, more volume)"
              rightLabel="Better (slower, deeper, stronger)"
              left={bind("more")}
              right={bind("better")}
            />
            <TradeoffRow
              occ="Capabilities"
              title="Accuracy vs. Generality"
              hint="AI pulls toward generality. What must stay precise?"
              leftLabel="Must stay exactly right"
              rightLabel="Roughly right is fine"
              left={bind("accuracy")}
              right={bind("generality")}
            />
            <TradeoffRow
              occ="Control"
              title="Structure vs. Autonomy"
              hint="AI pulls toward autonomy — without structure, that's chaos."
              leftLabel="What chaos looks like here"
              rightLabel="The structure that makes autonomy safe (Architect)"
              left={bind("chaos")}
              right={bind("architect")}
            />
          </div>
        )}

        {step.key === "redesign" && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">
                Your AI + Human workflow
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
                <div className="text-xs font-semibold uppercase tracking-wide text-amber">What to start this week</div>
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
              <label className="lbl">If we actually redesigned this, we&apos;d stop ___ and start ___.</label>
              <textarea
                className="field min-h-[110px]"
                placeholder="We would stop… and start…"
                {...bind("stop_start")}
              />
            </div>
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
            Back
          </button>
          <div className="hidden text-sm text-slate-400 sm:block">
            {timerDone ? "Time's up — move the room on." : "Next unlocks when the timer ends."}
          </div>
          {session.phase < WORKFLOW_STEPS.length - 1 ? (
            <button
              onClick={() => goToPhase(session.phase + 1, true)}
              disabled={!timerDone}
              className="btn-primary"
            >
              Next step →
            </button>
          ) : (
            <Link href="/dashboard" className="btn-primary">
              Finish
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Legend() {
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
