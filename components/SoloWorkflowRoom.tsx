"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SOLO_WORKFLOW_STEPS, STEP_ROLES } from "@/lib/workflow";
import Timer from "@/components/Timer";
import WorkflowFlow from "@/components/WorkflowFlow";
import TradeoffPlan from "@/components/TradeoffPlan";

type Msg = { role: "user" | "assistant"; content: string };

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export default function SoloWorkflowRoom({
  me,
  session,
  initialDoc,
}: {
  me: string;
  session: any;
  initialDoc: any;
}) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [doc, setDoc] = useState<any>({ steps: [], ...initialDoc });
  const [chat, setChat] = useState<Msg[]>([]);
  const step = SOLO_WORKFLOW_STEPS[phase] ?? SOLO_WORKFLOW_STEPS[0];

  // autosave doc
  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workflow_docs").update(patch).eq("session_id", session.id);
  }, [supabase, session.id]);
  const update = useCallback(
    (patch: Record<string, any>) => {
      setDoc((d: any) => ({ ...d, ...patch }));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush]
  );

  const steps: any[] = doc.steps || [];
  const setSteps = (next: any[]) => update({ steps: next });
  const analysis: any = doc.analysis || {};
  const redesignFlow: any[] = analysis.flow?.length ? analysis.flow : steps;

  // AI help for the three trade-offs — fills any blanks with a specific first draft.
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
        setTradeoffErr(r.reason === "ai-off" ? "AI isn't set up for this session." : "Couldn't get suggestions — try again.");
      }
    } catch {
      setTradeoffErr("Couldn't get suggestions — try again.");
    }
    setTradeoffBusy(false);
  }

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(SOLO_WORKFLOW_STEPS.length - 1, i));
    const status = clamped >= SOLO_WORKFLOW_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase
      .from("sessions")
      .update({ phase: clamped, phase_started_at: now, status })
      .eq("id", session.id);
  }

  const bind = (field: string) => ({
    value: doc[field] || "",
    onChange: (e: any) => update({ [field]: e.target.value }),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
            ← Exit
          </Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Workflow · AI partner</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {SOLO_WORKFLOW_STEPS.map((p) => (
          <button
            key={p.key}
            onClick={() => go(p.index)}
            className={
              "h-1.5 flex-1 rounded-full transition " +
              (p.index < phase ? "bg-ink" : p.index === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")
            }
          />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Step {phase + 1} of {SOLO_WORKFLOW_STEPS.length} · {step.minutes} min
        </div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
        <p className="mt-1 max-w-3xl text-slate-500">{step.subtitle}</p>
      </div>

      <div className="pb-24">
        {step.key === "name" && (
          <div className="space-y-4">
            <div className="card p-5">
              <label className="lbl">In one line, what is the workflow?</label>
              <input className="field" placeholder="e.g. Monthly board reporting" {...bind("name")} />
            </div>
            <div className="card p-5">
              <label className="lbl">Describe it — how does it work today, and what breaks if you don&apos;t redesign it?</label>
              <textarea className="field min-h-[120px]" placeholder="Walk through what happens, start to finish." {...bind("why")} />
            </div>
          </div>
        )}

        {step.key === "interview" && (
          <WorkflowInterview name={doc.name} why={doc.why} chat={chat} setChat={setChat} />
        )}

        {step.key === "map" && (
          <MapStep doc={doc} chat={chat} setSteps={setSteps} steps={steps} />
        )}

        {step.key === "analyze" && (
          <AnalyzeStep doc={doc} chat={chat} steps={steps} analysis={analysis} update={update} />
        )}

        {step.key === "tradeoffs" && (
          <div className="space-y-5">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-slate-500">
                Decide where each has to hold the line — then let AI build the plan for how you actually get to better, accuracy, and safe autonomy.
              </div>
              <button onClick={suggestTradeoffs} disabled={tradeoffBusy} className="btn-primary text-sm">
                {tradeoffBusy ? "Thinking…" : analysis.tradeoffs ? "↻ Rebuild the plan" : "✨ Think it through & plan"}
              </button>
            </div>
            {tradeoffErr && <p className="text-sm text-clay">{tradeoffErr}</p>}
            <TradeoffRow occ="Outcomes" title="More vs. Better" hint="AI pulls toward more. Is that where you want to land?" leftLabel="More (faster, cheaper, more volume)" rightLabel="Better (slower, deeper, stronger)" left={bind("more")} right={bind("better")} />
            <TradeoffRow occ="Capabilities" title="Accuracy vs. Generality" hint="AI pulls toward generality. What must stay precise?" leftLabel="Must stay exactly right" rightLabel="Roughly right is fine" left={bind("accuracy")} right={bind("generality")} />
            <TradeoffRow occ="Control" title="Structure vs. Autonomy" hint="AI pulls toward autonomy — without structure, that's chaos." leftLabel="What chaos looks like here" rightLabel="The structure that makes autonomy safe (Architect)" left={bind("chaos")} right={bind("architect")} />
            <TradeoffPlan plan={analysis.tradeoffs} />
          </div>
        )}

        {step.key === "redesign" && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">Your AI + Human workflow</div>
              <div className="mt-1 text-lg font-bold text-ink">{doc.name || "—"}</div>
              {analysis.summary && <p className="mt-1 text-sm text-slate-500">{analysis.summary}</p>}
              <div className="mt-2"><Legend /></div>
              <div className="mt-4"><WorkflowFlow steps={redesignFlow} editable={false} /></div>
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
              <textarea className="field min-h-[110px]" placeholder="We would stop… and start…" {...bind("stop_start")} />
            </div>
            <Link href={`/workflow-plan/${session.code}`} className="btn-primary block text-center">
              View the full plan →
            </Link>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">
            Back
          </button>
          {phase < SOLO_WORKFLOW_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">
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

function WorkflowInterview({
  name,
  why,
  chat,
  setChat,
}: {
  name?: string;
  why?: string;
  chat: Msg[];
  setChat: (m: Msg[]) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(
    async (history: Msg[]) => {
      setErr(null);
      setBusy(true);
      try {
        const res = await fetch("/api/workflow/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, name, description: why }),
        });
        const d = await res.json();
        if (!res.ok) {
          setErr(d.error || "The AI is unavailable.");
          return null;
        }
        return d.reply as string;
      } catch {
        setErr("The AI is unavailable.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [name, why]
  );

  useEffect(() => {
    if (started.current || chat.length > 0) {
      started.current = true;
      return;
    }
    started.current = true;
    call([]).then((reply) => {
      if (reply) setChat([{ role: "assistant", content: reply }]);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...chat, { role: "user", content: text }];
    setChat(next);
    setInput("");
    const reply = await call(next);
    if (reply) setChat([...next, { role: "assistant", content: reply }]);
  }

  return (
    <div className="card flex flex-col p-5" style={{ height: "58vh", minHeight: 400 }}>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chat.length === 0 && busy && (
          <div className="text-slate-400">The AI is thinking of an opening question…</div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && chat.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div>
          </div>
        )}
      </div>
      {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

function MapStep({
  doc,
  chat,
  steps,
  setSteps,
}: {
  doc: any;
  chat: Msg[];
  steps: any[];
  setSteps: (s: any[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function draw() {
    setBusy(true);
    setErr(null);
    const transcript = chat.map((m) => `${m.role === "user" ? "Them" : "Interviewer"}: ${m.content}`).join("\n");
    const description = `${doc.why || ""}${transcript ? `\n\nInterview:\n${transcript}` : ""}`;
    try {
      const r = await fetch("/api/workflow/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, description }),
      }).then((x) => x.json());
      if (r.steps && r.steps.length) {
        setSteps(r.steps.map((s: any) => ({ id: newId(), text: s.text, role: s.role || "human" })));
      } else {
        setErr(r.reason === "ai-off" ? "AI isn't set up for this session." : "Couldn't draft it — add steps by hand.");
      }
    } catch {
      setErr("Couldn't draft it — add steps by hand.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          The workflow exactly as it runs <span className="font-semibold text-ink">today</span> — every step a human does now. You&apos;ll add AI in the next step.
        </div>
        <button onClick={draw} disabled={busy} className="btn-primary text-sm">
          {busy ? "Drawing…" : steps.length ? "↻ Redraw" : "✨ Draw the current workflow"}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      <WorkflowFlow steps={steps} onChange={setSteps} />
    </div>
  );
}

function Field({ label, color, children }: { label: string; color: string; children: any }) {
  if (!children) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function AnalyzeStep({
  doc,
  chat,
  steps,
  analysis,
  update,
}: {
  doc: any;
  chat: Msg[];
  steps: any[];
  analysis: any;
  update: (p: any) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const opps: any[] = analysis.opportunities || [];
  const flow: any[] = analysis.flow || [];

  async function analyze() {
    setBusy(true);
    setErr(null);
    const transcript = chat.map((m) => `${m.role === "user" ? "Them" : "Interviewer"}: ${m.content}`).join("\n");
    const description = `${doc.why || ""}${transcript ? `\n\nInterview:\n${transcript}` : ""}`;
    try {
      const r = await fetch("/api/workflow/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, description, steps }),
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
        setErr(r.reason === "ai-off" ? "AI isn't set up for this session." : "Couldn't analyze — try again.");
      }
    } catch {
      setErr("Couldn't analyze — try again.");
    }
    setBusy(false);
  }

  const setFlow = (next: any[]) => update({ analysis: { ...analysis, flow: next } });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          AI reads your real workflow and finds where it genuinely helps — the outcome you want, how AI gets there, and how to prep fast.
        </div>
        <button onClick={analyze} disabled={busy || !steps.length} className="btn-primary text-sm">
          {busy ? "Analyzing…" : opps.length ? "↻ Re-analyze" : "✨ Analyze with AI"}
        </button>
      </div>

      {!steps.length && (
        <p className="text-sm text-clay">Draw the current workflow first (the previous step), then analyze it.</p>
      )}
      {err && <p className="text-sm text-clay">{err}</p>}

      {analysis.summary && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Where AI helps</div>
          <p className="mt-1 leading-relaxed text-slate-700">{analysis.summary}</p>
        </div>
      )}

      {opps.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {opps.map((o, i) => (
            <div key={i} className="card overflow-hidden p-0">
              <div className="h-1.5" style={{ background: "#CE8F2C" }} />
              <div className="p-5">
                <div className="text-base font-bold text-ink">{o.title}</div>
                <Field label="The outcome" color="#CE8F2C">{o.outcome}</Field>
                <Field label="How AI does it" color="#CE8F2C">{o.how}</Field>
                <Field label="Prep fast" color="#CE8F2C">{o.prep}</Field>
              </div>
            </div>
          ))}
        </div>
      )}

      {flow.length > 0 && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Redesigned flow — AI + human</div>
          <p className="mt-1 text-sm text-slate-500">Green stays human; gold is AI. Recolor or edit anything that isn&apos;t right.</p>
          <div className="mt-3"><Legend /></div>
          <div className="mt-4"><WorkflowFlow steps={flow} onChange={setFlow} /></div>
        </div>
      )}
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
