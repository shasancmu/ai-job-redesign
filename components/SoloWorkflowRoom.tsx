"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import { SOLO_WORKFLOW_STEPS, STEP_ROLES } from "@/lib/workflow";
import { moduleBeacon } from "@/lib/clientBeacon";
import Timer from "@/components/Timer";
import WorkflowFlow from "@/components/WorkflowFlow";
import TradeoffPlan from "@/components/TradeoffPlan";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

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
  const t = useT();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [doc, setDoc] = useState<any>({ steps: [], ...initialDoc });
  const [chat, setChat] = useState<Msg[]>([]);
  const step = SOLO_WORKFLOW_STEPS[phase] ?? SOLO_WORKFLOW_STEPS[0];

  // Drop-off funnel: entered the room, and reached the final step (once).
  useEffect(() => { if (session?.exercise) moduleBeacon(session.exercise, "solo", "start"); }, [session?.exercise]);
  const completedBeaconRef = useRef(false);
  useEffect(() => { if (session?.exercise && phase >= SOLO_WORKFLOW_STEPS.length - 1 && !completedBeaconRef.current) { completedBeaconRef.current = true; moduleBeacon(session.exercise, "solo", "complete"); } }, [phase, session?.exercise]);

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
        setTradeoffErr(r.reason === "ai-off" ? t("sworkflow.aiOff") : t("sworkflow.cantSuggest"));
      }
    } catch {
      setTradeoffErr(t("sworkflow.cantSuggest"));
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
            ← {t("room.exit")}
          </Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{t("sworkflow.tag")}</span>
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
          {t("room.step", { n: phase + 1, total: SOLO_WORKFLOW_STEPS.length })} · {t("catalog.min", { n: step.minutes })}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{tf(t, "steps.sworkflow." + step.key + ".title", step.title)}</h1>
        <p className="mt-1 max-w-3xl text-slate-500">{tf(t, "steps.sworkflow." + step.key + ".subtitle", step.subtitle)}</p>
      </div>

      <div className="pb-24">
        {step.key === "name" && (
          <div className="space-y-4">
            <div className="card p-5">
              <label className="lbl">{t("sworkflow.nameLabel")}</label>
              <input className="field" placeholder={t("sworkflow.namePh")} {...bind("name")} />
            </div>
            <div className="card p-5">
              <label className="lbl">{t("sworkflow.describeLabel")}</label>
              <textarea className="field min-h-[120px]" placeholder={t("sworkflow.describePh")} {...bind("why")} />
            </div>
          </div>
        )}

        {step.key === "interview" && (
          <WorkflowInterview name={doc.name} why={doc.why} chat={chat} setChat={setChat} sessionId={session.id} onDone={() => go(phase + 1)} />
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
                {t("sworkflow.tradeoffsIntro")}
              </div>
              <button onClick={suggestTradeoffs} disabled={tradeoffBusy} className="btn-primary text-sm">
                {tradeoffBusy ? t("room.thinking") : analysis.tradeoffs ? <>↻ {t("sworkflow.rebuildPlan")}</> : t("sworkflow.thinkItThrough")}
              </button>
            </div>
            {tradeoffErr && <p className="text-sm text-clay">{tradeoffErr}</p>}
            <TradeoffRow occ={t("sworkflow.row1Occ")} title={t("sworkflow.row1Title")} hint={t("sworkflow.row1Hint")} leftLabel={t("sworkflow.row1Left")} rightLabel={t("sworkflow.row1Right")} left={bind("more")} right={bind("better")} />
            <TradeoffRow occ={t("sworkflow.row2Occ")} title={t("sworkflow.row2Title")} hint={t("sworkflow.row2Hint")} leftLabel={t("sworkflow.row2Left")} rightLabel={t("sworkflow.row2Right")} left={bind("accuracy")} right={bind("generality")} />
            <TradeoffRow occ={t("sworkflow.row3Occ")} title={t("sworkflow.row3Title")} hint={t("sworkflow.row3Hint")} leftLabel={t("sworkflow.row3Left")} rightLabel={t("sworkflow.row3Right")} left={bind("chaos")} right={bind("architect")} />
            <TradeoffPlan plan={analysis.tradeoffs} />
          </div>
        )}

        {step.key === "redesign" && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("sworkflow.aiHumanWorkflow")}</div>
              <div className="mt-1 text-lg font-bold text-ink">{doc.name || "—"}</div>
              {analysis.summary && <p className="mt-1 text-sm text-slate-500">{analysis.summary}</p>}
              <div className="mt-2"><Legend /></div>
              <div className="mt-4"><WorkflowFlow steps={redesignFlow} editable={false} /></div>
            </div>
            {analysis.opportunities?.length > 0 && (
              <div className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber">{t("sworkflow.startThisWeek")}</div>
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
              <label className="lbl">{t("sworkflow.stopStartLabel")}</label>
              <textarea className="field min-h-[110px]" placeholder={t("sworkflow.stopStartPh")} {...bind("stop_start")} />
            </div>
            <Link href={`/workflow-plan/${session.code}`} className="btn-primary block text-center">
              {t("sworkflow.viewFullPlan")} →
            </Link>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">
            {t("room.back")}
          </button>
          {phase < SOLO_WORKFLOW_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">
              {t("room.next")} →
            </button>
          ) : (
            <Link href="/dashboard" className="btn-primary">
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
          {tf(t, "sworkflow.role." + r.key, r.label)}
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
  sessionId,
  onDone,
}: {
  name?: string;
  why?: string;
  chat: Msg[];
  setChat: (m: Msg[]) => void;
  sessionId: string;
  onDone?: () => void;
}) {
  const t = useT();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(
    async (history: Msg[]) => {
      setErr(null);
      setBusy(true);
      // An empty or dropped reply used to leave the chat frozen (people learned
      // to type "continue" to nudge it). Retry once automatically, then surface a
      // clear retry instead of silently hanging.
      for (let attempt = 0; attempt < 2; attempt++) {
        setStreaming("");
        let acc = "";
        try {
          const reply = await streamPost("/api/workflow/interview", { messages: history, name, description: why, sessionId }, (d) => { acc += d; setStreaming(acc); });
          const out = (reply || acc).trim();
          if (out) { setBusy(false); setStreaming(""); return out; }
        } catch (e: any) {
          if (attempt === 1) { setErr(e?.message || t("sworkflow.aiUnavailable")); setBusy(false); setStreaming(""); return null; }
        }
      }
      setBusy(false);
      setStreaming("");
      setErr(t("sworkflow.aiUnavailable"));
      return null;
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
  }, [chat.length, busy, streaming]);

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
          <div className="text-slate-400">{t("sworkflow.openingQ")}</div>
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
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800">{streaming}</div>
          </div>
        )}
        {busy && !streaming && chat.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div>
          </div>
        )}
      </div>
      {err && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{err}</span>
          <button type="button" onClick={() => call(chat).then((r) => r && setChat([...chat, { role: "assistant", content: r }]))} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}
      {onDone && chat.filter((m) => m.role === "user").length >= 3 && (
        <button type="button" onClick={onDone} className="mt-3 w-full rounded-lg bg-sage-soft px-3 py-2 text-sm font-semibold text-ink transition hover:bg-sage/20">
          ✓ You&apos;ve covered the workflow — build my map →
        </button>
      )}
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("room.typeAnswer")} disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>{t("room.send")}</button>
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
  const t = useT();
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
        setErr(r.reason === "ai-off" ? t("sworkflow.aiOff") : t("sworkflow.cantDraftSteps"));
      }
    } catch {
      setErr(t("sworkflow.cantDraftSteps"));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          {t("sworkflow.mapIntro1")} <span className="font-semibold text-ink">{t("sworkflow.mapToday")}</span>{t("sworkflow.mapIntro2")}
        </div>
        <button onClick={draw} disabled={busy} className="btn-primary text-sm">
          {busy ? t("sworkflow.drawing") : steps.length ? <>↻ {t("sworkflow.redraw")}</> : t("sworkflow.drawCurrent")}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      <WorkflowFlow steps={steps} onChange={setSteps} />
    </div>
  );
}

function Field({ label, color, children }: { label: string; color: string; children: any }) {
  const t = useT();
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
  const t = useT();
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
        setErr(r.reason === "ai-off" ? t("sworkflow.aiOff") : t("sworkflow.cantAnalyze"));
      }
    } catch {
      setErr(t("sworkflow.cantAnalyze"));
    }
    setBusy(false);
  }

  const setFlow = (next: any[]) => update({ analysis: { ...analysis, flow: next } });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          {t("sworkflow.analyzeIntro")}
        </div>
        <button onClick={analyze} disabled={busy || !steps.length} className="btn-primary text-sm">
          {busy ? t("sworkflow.analyzing") : opps.length ? <>↻ {t("sworkflow.reAnalyze")}</> : t("sworkflow.analyzeWithAI")}
        </button>
      </div>

      {!steps.length && (
        <p className="text-sm text-clay">{t("sworkflow.drawFirst")}</p>
      )}
      {err && <p className="text-sm text-clay">{err}</p>}

      {analysis.summary && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("sworkflow.whereAiHelps")}</div>
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
                <Field label={t("sworkflow.theOutcome")} color="#CE8F2C">{o.outcome}</Field>
                <Field label={t("sworkflow.howAiDoes")} color="#CE8F2C">{o.how}</Field>
                <Field label={t("sworkflow.prepFast")} color="#CE8F2C">{o.prep}</Field>
              </div>
            </div>
          ))}
        </div>
      )}

      {flow.length > 0 && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("sworkflow.redesignedFlow")}</div>
          <p className="mt-1 text-sm text-slate-500">{t("sworkflow.recolorHint")}</p>
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
