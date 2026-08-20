"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/Timer";
import PersonalNetworkReport from "@/components/PersonalNetworkReport";
import { DOMAINS, STRENGTHS, ENERGY, domainMeta, tieKey, hasTie, computeEgoMetrics, type Contact, type Domain, type Energy, type Strength, type Ties } from "@/lib/egonet";

type Msg = { role: "user" | "assistant"; content: string };

const STEPS = [
  { key: "intro", title: "Your network", minutes: 3 },
  { key: "contacts", title: "Your key contacts", minutes: 8 },
  { key: "connections", title: "Who knows whom", minutes: 5 },
  { key: "interview", title: "A few questions", minutes: 6 },
  { key: "report", title: "Your network read", minutes: 4 },
] as const;

let idSeq = 0;
function newId() {
  idSeq += 1;
  return `c${Date.now().toString(36)}${idSeq}`;
}

export default function PersonalNetworkRoom({
  me,
  session,
  initialWorkspace,
}: {
  me: string;
  session: any;
  initialWorkspace: any;
}) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};

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
  const setState = (patch: Record<string, any>) => update({ canvas: { ...(ws.canvas || {}), ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    const status = clamped >= STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const step = STEPS[phase] ?? STEPS[0];
  const contacts: Contact[] = state.contacts || [];
  const ties: Ties = state.ties || {};

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Map Your Personal Network</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Step {phase + 1} of {STEPS.length}</div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "intro" && <Intro goal={state.goal || ""} setGoal={(v) => setState({ goal: v })} />}
        {step.key === "contacts" && <Contacts contacts={contacts} setContacts={(c) => setState({ contacts: c })} />}
        {step.key === "connections" && <Connections contacts={contacts} ties={ties} setTies={(t) => setState({ ties: t })} />}
        {step.key === "interview" && <Interview state={state} setState={setState} contacts={contacts} sessionId={session.id} onSkip={() => go(4)} />}
        {step.key === "report" && <ReportStep state={state} setState={setState} code={session.code} sessionId={session.id} contacts={contacts} ties={ties} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">Next →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Intro({ goal, setGoal }: { goal: string; setGoal: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm leading-relaxed text-slate-600">
        Your network, the people you rely on for work and life, is one of your most valuable and least examined assets. In the next few minutes you&apos;ll map it: list your key contacts, note a few things about each, and mark who among them knows whom. Then you&apos;ll get an honest, research-based read on its real shape and the specific moves that would strengthen it.
        <br /><br />
        For the read to be worth anything, answer as things <span className="font-medium text-ink">really are</span>, not as you think they should look. There are no right answers, and no shape is &quot;better&quot; in the abstract; the useful findings come from your real network, not a tidied-up one.
      </div>
      <div>
        <label className="lbl">What do you want most from your network right now? <span className="font-normal text-slate-400">(optional)</span></label>
        <div className="mb-1 text-xs text-slate-400">A job or promotion, new ideas, customers, a big decision, support, visibility. It tunes the read.</div>
        <textarea className="field min-h-[90px]" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. I'm exploring a move into product leadership and want to hear about roles before they're posted." />
      </div>
    </div>
  );
}

function Contacts({ contacts, setContacts }: { contacts: Contact[]; setContacts: (c: Contact[]) => void }) {
  const add = () => setContacts([...contacts, { id: newId(), name: "", domain: "inside", strength: 2, energy: "neutral" }]);
  const patch = (id: string, p: Partial<Contact>) => setContacts(contacts.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const remove = (id: string) => setContacts(contacts.filter((c) => c.id !== id));
  const named = contacts.filter((c) => c.name.trim()).length;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        List the people who matter to your work and life right now, aim for <span className="font-medium text-ink">8 to 12</span>. The four worlds below are just a memory jog so you don&apos;t forget anyone; include whoever genuinely belongs, and leave a world empty if that&apos;s the truth. For each, mark how you&apos;d honestly describe the tie.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DOMAINS.map((d) => (
          <div key={d.key} className="rounded-lg border border-line bg-white px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.label}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-slate2">{d.blurb}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {contacts.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: domainMeta(c.domain).color }} />
              <input
                className="field flex-1"
                value={c.name}
                onChange={(e) => patch(c.id, { name: e.target.value })}
                placeholder="Name or initials"
              />
              <button onClick={() => remove(c.id)} className="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-mist hover:text-clay" aria-label="Remove">✕</button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Seg label="World" options={DOMAINS.map((d) => ({ value: d.key, label: d.label }))} value={c.domain} onChange={(v) => patch(c.id, { domain: v as Domain })} />
              <Seg label="Tie" options={STRENGTHS.map((s) => ({ value: String(s.key), label: s.label }))} value={String(c.strength)} onChange={(v) => patch(c.id, { strength: Number(v) as Strength })} />
              <Seg label="Energy" options={ENERGY.map((e) => ({ value: e.key, label: e.emoji + " " + e.label.replace(" me", "") }))} value={c.energy} onChange={(v) => patch(c.id, { energy: v as Energy })} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={add} className="btn-ghost text-sm">+ Add a contact</button>
        <span className="text-sm text-slate2">{named} named{named < 3 ? " · add at least 3" : ""}</span>
      </div>
    </div>
  );
}

function Seg({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={"rounded-full px-2.5 py-1 text-xs font-medium transition " + (value === o.value ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Connections({ contacts, ties, setTies }: { contacts: Contact[]; ties: Ties; setTies: (t: Ties) => void }) {
  const named = contacts.filter((c) => c.name.trim());
  const toggle = (a: string, b: string) => {
    const k = tieKey(a, b);
    const next = { ...ties };
    if (next[k]) delete next[k];
    else next[k] = true;
    setTies(next);
  };

  if (named.length < 2) {
    return <div className="rounded-xl border border-line bg-mist p-6 text-center text-sm text-slate2">Add at least two named contacts first, then come back to mark who knows whom.</div>;
  }

  const count = Object.values(ties).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        For each person, tap everyone else who <span className="font-medium text-ink">knows them</span>, would recognize the name, have met, or deal with each other directly. Go by what you actually know; don&apos;t guess generously either way, and it&apos;s fine to be unsure. This is what lets us map the real structure.
      </p>

      <div className="space-y-2">
        {named.map((c) => {
          const others = named.filter((o) => o.id !== c.id);
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: domainMeta(c.domain).color }} />
                <span className="text-sm font-semibold text-ink">{c.name}</span>
                <span className="text-xs text-slate-400">knows…</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {others.map((o) => {
                  const on = hasTie(ties, c.id, o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggle(c.id, o.id)}
                      className={"rounded-full px-2.5 py-1 text-xs font-medium transition " + (on ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}
                    >
                      {o.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-sm text-slate2">{count} connection{count === 1 ? "" : "s"} marked. Leave any pair unmarked if they don&apos;t really know each other.</div>
    </div>
  );
}

function Interview({ state, setState, contacts, sessionId, onSkip }: { state: any; setState: (p: any) => void; contacts: Contact[]; sessionId: string; onSkip: () => void }) {
  const messages: Msg[] = state.interview_chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const roster = contacts.filter((c) => c.name.trim()).map((c) => `${c.name} (${c.domain}, ${["", "weak", "medium", "strong"][c.strength]}, ${c.energy})`).join("; ");

  const call = useCallback(async (history: Msg[]) => {
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/personal-network", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", messages: history, roster, goal: state.goal || "", sessionId }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "The interviewer is unavailable."); return null; }
      return data.reply as string;
    } catch { setErr("The interviewer is unavailable."); return null; } finally { setBusy(false); }
  }, [roster, state.goal, sessionId]);

  useEffect(() => {
    if (started.current || messages.length > 0) { started.current = true; return; }
    started.current = true;
    call([]).then((reply) => { if (reply) setState({ interview_chat: [{ role: "assistant", content: reply }] }); });
  }, []); // eslint-disable-line
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages.length, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setState({ interview_chat: next });
    setInput("");
    const reply = await call(next);
    if (reply) setState({ interview_chat: [...next, { role: "assistant", content: reply }] });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">A short interview adds texture the roster can&apos;t, so the read is sharper. <button onClick={onSkip} className="text-ink underline">Skip to the result</button></p>
      <div className="card flex flex-col p-5" style={{ height: "54vh", minHeight: 360 }}>
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && busy && <div className="text-slate-400">Thinking of an opening question…</div>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>{m.content}</div>
            </div>
          ))}
          {busy && messages.length > 0 && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
        </div>
        {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} />
          <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}

function ReportStep({ state, setState, code, sessionId, contacts, ties }: { state: any; setState: (p: any) => void; code: string; sessionId: string; contacts: Contact[]; ties: Ties }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const report = state.report;
  const metrics = state.metrics;
  const named = contacts.filter((c) => c.name.trim());
  const enough = named.length >= 3;
  const preview = enough ? computeEgoMetrics(contacts, ties) : null;

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/personal-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "report", contacts, ties, interview: state.interview_chat || [], goal: state.goal || "", sessionId }),
      });
      const d = await res.json();
      if (res.ok && d.report) setState({ report: d.report, metrics: d.metrics });
      else setErr(d.error || "Couldn't read your network.");
    } catch { setErr("Couldn't read your network."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          {!enough ? "Add at least 3 contacts to see your network read." : report ? "Your network is mapped. Regenerate any time you update it." : `Ready: ${preview?.size} contacts across ${preview?.domainsPresent} of 4 worlds.`}
        </div>
        <button onClick={run} disabled={busy || !enough} className="btn-primary text-sm">{busy ? "Reading your network…" : report ? "Rebuild" : "Map my network"}</button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {report && (
        <>
          <PersonalNetworkReport report={report} metrics={metrics} contacts={contacts} ties={ties} />
          <Link href={`/network-map/${code}`} className="btn-primary block text-center">View the full write-up →</Link>
        </>
      )}
    </div>
  );
}
