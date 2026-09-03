"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/Timer";
import RoleplayChat, { type Msg } from "@/components/RoleplayChat";
import { streamPost } from "@/lib/streamClient";
import { SURFACE, OPENING_REMARKS } from "@/lib/earnings";
import EarningsReport from "@/components/EarningsReport";
import StepHeader from "./StepHeader";
import { useT } from "@/components/I18nProvider";

const BUDGET = 7;

type Call = "stuffing" | "clean" | "cant_tell";
type Verdict = { call: Call | ""; confidence: number; flip: string };

const CALL_OPTS: { key: Call; label: string; sub: string }[] = [
  { key: "stuffing", label: "Channel stuffing", sub: "The quarter was pumped with sales that will reverse." },
  { key: "clean", label: "Clean quarter", sub: "The scary surface has an innocent explanation." },
  { key: "cant_tell", label: "Can't tell yet", sub: "The evidence available does not settle it." },
];

async function earningsReply(code: string, history: Msg[], onChunk?: (d: string) => void): Promise<string | null> {
  return streamPost("/api/earnings/reply", { code, messages: history }, onChunk || (() => {}));
}

export default function EarningsRoom({ me, session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const code = String(session.code || "").toUpperCase();
  const STEPS = [
    { key: "brief", title: "The assignment", minutes: 4 },
    { key: "call", title: "Question the CEO", minutes: 12 },
    { key: "verdict", title: "Your verdict", minutes: 3 },
    { key: "report", title: "How you did", minutes: 3 },
  ];

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
  const update = useCallback((patch: Record<string, any>) => {
    setWs((w: any) => ({ ...w, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);
  const setState = (patch: Record<string, any>) => update({ canvas: { ...state, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    const status = clamped >= STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const chat: Msg[] = state.chat || [];
  const asked = chat.filter((m) => m.role === "user").length;
  const left = Math.max(0, BUDGET - asked);
  const verdict: Verdict = state.verdict || { call: "", confidence: 60, flip: "" };
  const setVerdict = (p: Partial<Verdict>) => setState({ verdict: { ...verdict, ...p } });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The Earnings Call · Verita Ingredients</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={STEPS.length} minutes={step.minutes} title={step.title} />

      <div className="pb-24">
        {step.key === "brief" && <Brief />}

        {step.key === "call" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist px-4 py-2.5 text-sm">
              <span className="text-slate-600">You don't know if Verita is manipulating. Ask what reveals the most.</span>
              <span className={"rounded-full px-3 py-1 font-semibold " + (left === 0 ? "bg-clay text-white" : left <= 2 ? "bg-amber text-white" : "bg-white text-ink")}>{left} question{left === 1 ? "" : "s"} left</span>
            </div>
            <RoleplayChat
              chat={chat}
              setChat={(c) => setState({ chat: c })}
              onCall={(h, onChunk) => earningsReply(code, h, onChunk)}
              counterpartName="Daniel Voss"
              placeholder={left === 0 ? "You've used all your questions" : "Ask Voss a question..."}
              disabled={left === 0}
              disabledHint={<>You've used all {BUDGET} questions. Move on to your verdict, on the right below.</>}
              emptyHint={<>Voss just gave his opening remarks. You have {BUDGET} questions. Spend them on the cut that would actually separate an honest quarter from a manipulated one.</>}
            />
          </div>
        )}

        {step.key === "verdict" && <VerdictForm verdict={verdict} setVerdict={setVerdict} />}

        {step.key === "report" && (
          <ReportStep code={code} chat={chat} verdict={verdict} report={state.report} onReport={(r) => setState({ report: r })} />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={step.key === "verdict" && !verdict.call} className="btn-primary">
              {step.key === "call" ? "Commit a verdict" : step.key === "verdict" ? "Grade my call" : "Next"} →
            </button>
          ) : (
            <Link href={`/done/${session.code}`} className="btn-primary">{t("room.finish")}</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Brief() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-slate-700">
        You are the one analyst on this earnings call who has done the homework. A short-seller note is claiming the company stuffed its distribution channel to fake a blow-out quarter. Your job: interrogate the CEO and reach your own verdict.
      </div>

      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">The company, before the call</div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{SURFACE}</p>
      </div>

      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daniel Voss opens the call</div>
        <p className="mt-2 border-l-2 border-sage pl-3 text-sm italic leading-relaxed text-slate-600">{OPENING_REMARKS}</p>
      </div>

      <div className="rounded-2xl bg-amber-soft p-5 text-sm leading-relaxed text-ink">
        <div className="font-semibold">How this is scored</div>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>• You get <b>7 questions</b>. The company may or may not be manipulating, and you do not know which.</li>
          <li>• Voss <b>will not say anything false</b>, he is under oath. But he will not confess either. He affirms what helps him and hedges what doesn't, so <b>read what he will and won't stand behind</b>.</li>
          <li>• You are graded on <b>how much your questions reveal</b>, not on guessing the answer. A vague question wastes a turn.</li>
          <li>• At the end you commit a verdict, a confidence, and the one fact that would flip you.</li>
        </ul>
      </div>
    </div>
  );
}

function VerdictForm({ verdict, setVerdict }: { verdict: Verdict; setVerdict: (p: Partial<Verdict>) => void }) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">Your call</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {CALL_OPTS.map((o) => {
            const on = verdict.call === o.key;
            return (
              <button key={o.key} onClick={() => setVerdict({ call: o.key })} className={"rounded-xl border p-3 text-left transition " + (on ? "border-ink bg-ink/5 ring-1 ring-ink" : "border-line bg-white hover:border-slate-300")}>
                <div className="text-sm font-bold text-ink">{o.label}</div>
                <div className="mt-0.5 text-xs leading-snug text-slate-500">{o.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">How confident are you?</div>
          <div className="text-lg font-bold text-ink tabular-nums">{verdict.confidence}%</div>
        </div>
        <input type="range" min={0} max={100} step={5} value={verdict.confidence} onChange={(e) => setVerdict({ confidence: Number(e.target.value) })} className="mt-3 w-full accent-[color:var(--ink)]" />
        <div className="mt-1 flex justify-between text-xs text-slate-400"><span>a coin flip</span><span>near certain</span></div>
      </div>

      <div className="card p-5">
        <label className="text-sm font-semibold text-ink" htmlFor="flip">The one fact that would flip your call</label>
        <p className="mt-0.5 text-xs text-slate-500">What single piece of evidence, if you had it, would move you the most?</p>
        <textarea id="flip" className="field mt-2" rows={2} value={verdict.flip} onChange={(e) => setVerdict({ flip: e.target.value })} placeholder="e.g. the return terms on the quarter-end distributor sales" />
      </div>
    </div>
  );
}

function ReportStep({ code, chat, verdict, report, onReport }: { code: string; chat: Msg[]; verdict: Verdict; report: any; onReport: (r: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function grade() {
    setBusy(true); setErr("");
    try {
      const transcript = chat.map((m) => `${m.role === "user" ? "ANALYST" : "VOSS"}: ${m.content}`).join("\n");
      const res = await fetch("/api/earnings/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, transcript, verdict }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.report) throw new Error(d.error || "Couldn't grade the call.");
      onReport(d.report);
    } catch (e: any) {
      setErr(e?.message || "Couldn't grade the call. Try again.");
    } finally { setBusy(false); }
  }

  if (report) return <EarningsReport report={report} />;

  return (
    <div className="card p-8 text-center">
      <p className="text-slate-600">Grade your interrogation: the diagnostic value of every question you asked, the highest-value question you missed, and how your call compares to a naive AI's.</p>
      <button onClick={grade} disabled={busy} className="btn-primary mt-4 inline-block text-sm">{busy ? "Reading the call..." : "✨ Grade my call"}</button>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
    </div>
  );
}
