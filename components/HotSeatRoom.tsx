"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/Timer";
import RoleplayChat, { type Msg } from "@/components/RoleplayChat";
import { streamPost } from "@/lib/streamClient";
import { SURFACE, ceoBriefing, scenarioForCode } from "@/lib/earnings";
import HotSeatReport from "@/components/HotSeatReport";
import StepHeader from "./StepHeader";

const BUDGET = 7; // answers you give before the call wraps

async function hotseatReply(history: Msg[], onChunk?: (d: string) => void): Promise<string | null> {
  return streamPost("/api/hotseat/reply", { messages: history }, onChunk || (() => {}));
}

export default function HotSeatRoom({ me, session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const code = String(session.code || "").toUpperCase();
  const brief = ceoBriefing(scenarioForCode(code)); // the student plays the CEO, so they know the truth
  const STEPS = [
    { key: "brief", title: "Your briefing", minutes: 4 },
    { key: "call", title: "Take the call", minutes: 12 },
    { key: "report", title: "The verdict", minutes: 3 },
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
  const answered = chat.filter((m) => m.role === "user").length;
  const left = Math.max(0, BUDGET - answered);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The Hot Seat · You are the CEO</span>
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
        {step.key === "brief" && <Brief brief={brief} />}

        {step.key === "call" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist px-4 py-2.5 text-sm">
              <span className="text-slate-600">You are Daniel Voss. Answer truthfully, never say anything false, hedge where you should.</span>
              <span className={"rounded-full px-3 py-1 font-semibold " + (left === 0 ? "bg-clay text-white" : left <= 2 ? "bg-amber text-white" : "bg-white text-ink")}>{left} answer{left === 1 ? "" : "s"} left</span>
            </div>
            <RoleplayChat
              chat={chat}
              setChat={(c) => setState({ chat: c })}
              onCall={(h, onChunk) => hotseatReply(h, onChunk)}
              counterpartName="Maya Chen (analyst)"
              aiOpens
              placeholder={left === 0 ? "The call is over" : "Answer as the CEO..."}
              disabled={left === 0}
              disabledHint={<>You've fielded all {BUDGET} questions. Move on to the verdict, below.</>}
            />
          </div>
        )}

        {step.key === "report" && (
          <ReportStep code={code} chat={chat} report={state.report} onReport={(r) => setState({ report: r })} />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">{step.key === "call" ? "End the call" : "Next"} →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Brief({ brief }: { brief: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-slate-700">
        You are Daniel Voss, CEO of Verita Ingredients, about to take a hostile earnings call. A skeptical analyst thinks you faked the quarter. You have to answer her, on the record, without saying a single thing that is false.
      </div>

      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">What the market sees</div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{SURFACE}</p>
      </div>

      <div className="rounded-2xl border border-clay/30 bg-clay-soft p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-clay">Your private briefing (only you know this)</div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{brief || "(Your briefing failed to load. Reload the page.)"}</p>
      </div>

      <div className="rounded-2xl bg-amber-soft p-5 text-sm leading-relaxed text-ink">
        <div className="font-semibold">How this is scored</div>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>• You are graded on staying <b>truthful and not misleading</b>. One false statement, or a half-truth built to mislead, is securities fraud and tanks your score.</li>
          <li>• But you are <b>not required to volunteer</b> everything. Hedging and declining to quantify are legitimate. Stonewalling the whole call is not.</li>
          <li>• The report flags any risky statement, names your best and worst moment, and tells you how the analyst left the call.</li>
        </ul>
      </div>
    </div>
  );
}

function ReportStep({ code, chat, report, onReport }: { code: string; chat: Msg[]; report: any; onReport: (r: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function grade() {
    setBusy(true); setErr("");
    try {
      const transcript = chat.map((m) => `${m.role === "user" ? "CEO (you)" : "ANALYST"}: ${m.content}`).join("\n");
      const res = await fetch("/api/hotseat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, transcript }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.report) throw new Error(d.error || "Couldn't grade the call.");
      onReport(d.report);
    } catch (e: any) {
      setErr(e?.message || "Couldn't grade the call. Try again.");
    } finally { setBusy(false); }
  }

  if (report) return <HotSeatReport report={report} />;

  return (
    <div className="card p-8 text-center">
      <p className="text-slate-600">See how you did: your legal exposure, your composure, every risky thing you said, and how the analyst left the call.</p>
      <button onClick={grade} disabled={busy} className="btn-primary mt-4 inline-block text-sm">{busy ? "Reviewing the tape..." : "✨ Face the verdict"}</button>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
    </div>
  );
}
