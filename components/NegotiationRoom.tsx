"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/Timer";
import {
  ISSUES,
  SCENARIO,
  COUNTERPART_NAME,
  YOUR_BATNA,
  YOUR_MAX,
  analyze,
  issueTag,
} from "@/lib/negotiation";

type Msg = { role: "user" | "assistant"; content: string };

const STEPS = [
  { key: "brief", title: "Your brief", minutes: 5 },
  { key: "negotiate", title: `Negotiate with ${COUNTERPART_NAME}`, minutes: 20 },
  { key: "deal", title: "Lock the deal", minutes: 3 },
  { key: "debrief", title: "Debrief", minutes: 6 },
];

const TAG_META: Record<string, { label: string; color: string }> = {
  compatible: { label: "Compatible", color: "#3F7A52" },
  distributive: { label: "Distributive", color: "#B4532E" },
  integrative: { label: "Trade / logroll", color: "#CE8F2C" },
};

export default function NegotiationRoom({ me, session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = STEPS[phase] ?? STEPS[0];

  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const update = useCallback(
    (patch: Record<string, any>) => {
      setWs((w: any) => ({ ...w, ...patch }));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush]
  );
  const setState = (patch: Record<string, any>) => update({ canvas: { ...state, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    const status = clamped >= STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const terms: Record<string, number> = state.terms || {};

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Close the Offer · negotiation</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Step {phase + 1} of {STEPS.length} · {step.minutes} min</div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "brief" && <Brief />}
        {step.key === "negotiate" && <Negotiate chat={state.chat || []} setChat={(c) => setState({ chat: c })} />}
        {step.key === "deal" && <Deal terms={terms} noDeal={!!state.noDeal} onTerms={(t) => setState({ terms: t })} onNoDeal={(v) => setState({ noDeal: v })} />}
        {step.key === "debrief" && <Debrief state={state} setState={setState} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">{step.key === "deal" ? "See my score →" : "Next →"}</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Brief() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-slate-700">{SCENARIO}</div>
      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">Your private priorities</div>
        <p className="mt-1 text-sm text-slate-500">Higher points = better for you. You can score up to <b>{YOUR_MAX}</b>; your walk-away (another offer) is worth <b>{YOUR_BATNA}</b> — don't accept a package worth less than that.</p>
        <div className="mt-4 space-y-4">
          {ISSUES.map((iss) => (
            <div key={iss.key}>
              <div className="text-sm font-semibold text-ink">{iss.label}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {iss.options.map((o) => (
                  <span key={o.label} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-slate-600">
                    {o.label} <span className="font-semibold text-sage">+{o.you}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">The other side has their own priorities — some of these issues they care about far more than you do, and some far less. The best deals trade across them.</p>
      </div>
    </div>
  );
}

function Negotiate({ chat, setChat }: { chat: Msg[]; setChat: (m: Msg[]) => void }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(async (history: Msg[]) => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/negotiation/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "The counterpart is unavailable."); return null; }
      return d.reply as string;
    } catch { setErr("The counterpart is unavailable."); return null; } finally { setBusy(false); }
  }, []);

  useEffect(() => {
    if (started.current || chat.length > 0) { started.current = true; return; }
    started.current = true;
    call([]).then((reply) => { if (reply) setChat([{ role: "assistant", content: reply }]); });
  }, []); // eslint-disable-line
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [chat.length, busy]);

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
    <div className="card flex flex-col p-5" style={{ height: "60vh", minHeight: 420 }}>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chat.length === 0 && busy && <div className="text-slate-400">{COUNTERPART_NAME} is opening the negotiation…</div>}
        {chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>{m.content}</div>
          </div>
        ))}
        {busy && chat.length > 0 && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
      </div>
      {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Reply to ${COUNTERPART_NAME}…`} disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

function Deal({ terms, noDeal, onTerms, onNoDeal }: { terms: Record<string, number>; noDeal: boolean; onTerms: (t: Record<string, number>) => void; onNoDeal: (v: boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="text-sm text-slate-500">Record the deal you reached — pick the agreed option for each issue.</div>
        <div className="mt-4 space-y-3">
          {ISSUES.map((iss) => (
            <div key={iss.key} className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-ink">{iss.label}</label>
              <select
                className="field"
                style={{ maxWidth: 220 }}
                value={terms[iss.key] ?? ""}
                disabled={noDeal}
                onChange={(e) => onTerms({ ...terms, [iss.key]: Number(e.target.value) })}
              >
                <option value="">Choose…</option>
                {iss.options.map((o, i) => (
                  <option key={o.label} value={i}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={noDeal} onChange={(e) => onNoDeal(e.target.checked)} />
        We couldn&apos;t agree — no deal (we both walk to our other options).
      </label>
    </div>
  );
}

function Debrief({ state, setState }: { state: any; setState: (p: Record<string, any>) => void }) {
  const a = analyze(state.terms || {}, !!state.noDeal);
  const [busy, setBusy] = useState(false);
  const feedback = state.feedback;

  async function coach() {
    setBusy(true);
    try {
      const transcript = (state.chat || []).map((m: Msg) => `${m.role === "user" ? "You" : COUNTERPART_NAME}: ${m.content}`).join("\n");
      const res = await fetch("/api/negotiation/debrief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ terms: state.terms || {}, noDeal: !!state.noDeal, transcript }) });
      const d = await res.json();
      if (res.ok && d.feedback) setState({ feedback: d.feedback });
    } finally { setBusy(false); }
  }

  const effColor = a.efficiency >= 85 ? "#3F7A52" : a.efficiency >= 65 ? "#CE8F2C" : "#B4532E";

  return (
    <div className="space-y-4">
      {a.noDeal ? (
        <div className="card p-5 text-slate-700">No deal — you both walked to your other options. You each take your walk-away ({a.you} pts). Sometimes that's right; often a deal was there to be found. Compare notes below.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Your score" value={`${a.you}`} sub={`of ${YOUR_MAX} · walk-away ${a.yourBATNA}`} color={a.beatBATNA ? "#3F7A52" : "#B4532E"} />
          <Stat label={`${COUNTERPART_NAME}'s score`} value={`${a.them}`} />
          <Stat label="Joint value created" value={`${a.efficiency}%`} sub={`${a.joint} of ${a.maxJoint} possible`} color={effColor} />
        </div>
      )}

      {!a.noDeal && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Issue by issue</div>
          <div className="mt-3 space-y-2">
            {a.issues.map((it) => {
              const t = TAG_META[it.tag];
              return (
                <div key={it.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{it.label}</span>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: t.color }}>{t.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <span>{it.chosen}</span>
                    <span className="text-xs">you <b className="text-sage">+{it.you}</b> · them +{it.them}</span>
                    {it.atOptimal ? (
                      <span className="text-xs font-semibold text-sage">✓ joint-best</span>
                    ) : (
                      <span className="text-xs text-slate-400" title={`Joint-best: ${it.optimal}`}>↑ {it.optimal}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">Green = both sides wanted the same option (don&apos;t fight over it). Amber = trade it against another. Clay = zero-sum, pure claiming.</p>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">Coach&apos;s debrief</div>
          {!feedback && <button onClick={coach} disabled={busy} className="btn-primary text-sm">{busy ? "Thinking…" : "✨ Get feedback"}</button>}
        </div>
        {feedback && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-700">{feedback}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-mist p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-2xl font-bold" style={{ color: color || "#14283A" }}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
