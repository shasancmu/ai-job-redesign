"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WORKFLOW_STEPS, STEP_ROLES } from "@/lib/workflow";
import Timer from "@/components/Timer";
import PairWaiting from "@/components/PairWaiting";

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
                Why is it worth redesigning? What breaks if you don&apos;t?
              </label>
              <textarea
                className="field"
                placeholder="What would your director notice if this kept drifting?"
                {...bind("why")}
              />
            </div>
          </div>
        )}

        {step.key === "map" && (
          <div className="card p-5">
            <label className="lbl">The workflow today — one step per line</label>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-6 text-right text-sm font-semibold text-slate-400">
                    {i + 1}
                  </span>
                  <input
                    className="field flex-1"
                    value={s.text}
                    onFocus={() => (activeField.current = "steps")}
                    onBlur={() => {
                      if (activeField.current === "steps") activeField.current = null;
                    }}
                    onChange={(e) => editStep(s.id, e.target.value)}
                  />
                  <button
                    onClick={() => removeStep(s.id)}
                    className="text-slate-300 hover:text-red-500"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <AddStep onAdd={addStep} />
          </div>
        )}

        {step.key === "outcome" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <label className="lbl text-green-700">
                Success — what it produces when it goes right
              </label>
              <textarea className="field min-h-[160px]" placeholder="Who benefits, and how would you know?" {...bind("success")} />
            </div>
            <div className="card p-5">
              <label className="lbl text-red-700">
                Failure no one would notice for six months
              </label>
              <textarea className="field min-h-[160px]" placeholder="The quiet failure mode." {...bind("failure")} />
            </div>
          </div>
        )}

        {step.key === "tradeoffs" && (
          <div className="space-y-4">
            <TradeoffRow
              title="More vs. Better"
              hint="AI pulls toward more. Is that where you want to land?"
              leftLabel="More (faster, cheaper, more volume)"
              rightLabel="Better (slower, deeper, stronger)"
              left={bind("more")}
              right={bind("better")}
            />
            <TradeoffRow
              title="Accuracy vs. Generality"
              hint="AI pulls toward generality. What must stay precise?"
              leftLabel="Must stay exactly right"
              rightLabel="Roughly right is fine"
              left={bind("accuracy")}
              right={bind("generality")}
            />
            <TradeoffRow
              title="Chaos vs. Architect"
              hint="AI pulls toward autonomy. Without structure, that's chaos."
              leftLabel="What chaos looks like here"
              rightLabel="The structure that makes autonomy safe"
              left={bind("chaos")}
              right={bind("architect")}
            />
          </div>
        )}

        {step.key === "assign" && (
          <div className="card p-5">
            <div className="mb-3 text-sm text-slate-500">
              Sort each step: who should own it in the redesign?
            </div>
            {steps.length === 0 ? (
              <div className="text-slate-400">
                No steps yet — go back to “Map it” and list the workflow first.
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3"
                  >
                    <span className="w-6 text-right text-sm font-semibold text-slate-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">{s.text || <em className="text-slate-300">empty</em>}</span>
                    <div className="flex gap-1">
                      {STEP_ROLES.filter((r) => r.key).map((r) => (
                        <button
                          key={r.key}
                          onClick={() => setStepRole(s.id, r.key)}
                          className={
                            "rounded-lg px-2.5 py-1 text-xs font-semibold transition " +
                            (s.role === r.key ? "text-white" : "text-slate-500 hover:bg-slate-100")
                          }
                          style={s.role === r.key ? { backgroundColor: r.color } : {}}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step.key === "redesign" && (
          <div className="space-y-4">
            <div className="card p-5">
              <label className="lbl">
                Complete the sentence
              </label>
              <p className="mb-2 text-sm text-slate-500">
                If we actually redesigned this workflow, we would stop ___ and
                start ___.
              </p>
              <textarea
                className="field min-h-[110px]"
                placeholder="We would stop… and start…"
                {...bind("stop_start")}
              />
            </div>
            <div className="card bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Your redesigned workflow
              </div>
              <div className="mt-1 text-lg font-semibold">{doc.name || "—"}</div>
              <div className="mt-3 space-y-1">
                {steps.map((s, i) => {
                  const role = STEP_ROLES.find((r) => r.key === s.role);
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-right text-slate-400">{i + 1}</span>
                      <span className="flex-1">{s.text}</span>
                      {role && role.key && (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          {role.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
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

function AddStep({ onAdd }: { onAdd: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(text);
        setText("");
      }}
      className="mt-3 flex items-center gap-2"
    >
      <span className="w-6" />
      <input
        className="field flex-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a step and press Enter…"
      />
      <button className="btn-ghost" disabled={!text.trim()}>
        Add
      </button>
    </form>
  );
}

function TradeoffRow({
  title,
  hint,
  leftLabel,
  rightLabel,
  left,
  right,
}: {
  title: string;
  hint: string;
  leftLabel: string;
  rightLabel: string;
  left: any;
  right: any;
}) {
  return (
    <div className="card p-5">
      <div className="mb-1 font-semibold">{title}</div>
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
