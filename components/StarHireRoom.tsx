"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";
import RoleplayChat, { type Msg } from "@/components/RoleplayChat";
import { streamPost } from "@/lib/streamClient";
import type { ObservableScenario } from "@/lib/starhire/types";
import StarHireResult from "@/components/StarHireResult";

const CONTEXTS = ["Equity research", "Software engineering", "Sales", "Management consulting", "Marketing", "Design", "Finance", "Healthcare"];

export default function StarHireRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};

  const scenario: ObservableScenario | null = state.scenario || null;
  const sealed: string | null = state.sealed || null;
  const chats: Record<string, Msg[]> = state.chats || {};
  const result = state.result || null;

  const [context, setContext] = useState<string>(state.input?.context || CONTEXTS[0]);
  const [difficulty, setDifficulty] = useState<"easy" | "hard">(state.input?.difficulty || "easy");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string>(state.activeId || "");
  const [deciding, setDeciding] = useState(false);
  const [pickId, setPickId] = useState<string>(state.decision?.id || "");
  const [confidence, setConfidence] = useState<number>(state.decision?.confidence ?? 60);
  const [flip, setFlip] = useState<string>(state.decision?.flip || "");

  const QUESTION_BUDGET = difficulty === "hard" ? 14 : 10;
  const used = useMemo(() => Object.values(chats).reduce((n, arr) => n + (arr || []).filter((m) => m.role === "user").length, 0), [chats]);
  const remaining = Math.max(0, QUESTION_BUDGET - used);

  // debounced persistence
  const pending = useRef<any>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const setCanvas = useCallback((patch: any) => {
    setWs((w: any) => {
      const canvas = { ...(w.canvas || {}), ...patch };
      pending.current = { canvas };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
      return { ...w, canvas };
    });
  }, [flush]);

  async function generate() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/starhire/new", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, difficulty }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't generate a scenario."); setBusy(false); return; }
      const firstId = j.scenario.candidates[0]?.id || "";
      setActiveId(firstId); setPickId(""); setConfidence(60); setFlip(""); setDeciding(false);
      setCanvas({ input: { context, difficulty }, scenario: j.scenario, sealed: j.sealed, chats: {}, activeId: firstId, decision: null, result: null });
    } catch { setErr("Couldn't reach the scenario service."); }
    setBusy(false);
  }

  const setChatFor = useCallback((id: string, msgs: Msg[]) => {
    setCanvas({ chats: { ...(ws.canvas?.chats || {}), [id]: msgs } });
  }, [setCanvas, ws.canvas]);

  const onCall = useCallback((id: string) => (history: Msg[], onChunk?: (d: string) => void) => {
    return streamPost("/api/starhire/reply", { sealed, candidateId: id, messages: history }, onChunk || (() => {}));
  }, [sealed]);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/starhire/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sealed, pick: { id: pickId, confidence, flip }, chats }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't grade the hire."); setBusy(false); return; }
      setCanvas({ decision: { id: pickId, confidence, flip }, result: j });
      await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
    } catch { setErr("Couldn't reach the grader."); }
    setBusy(false);
  }

  function newChallenge() {
    setCanvas({ scenario: null, sealed: null, chats: {}, decision: null, result: null });
    setDeciding(false); setPickId(""); setFlip(""); setConfidence(60);
  }

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Star Hire</span>
        {scenario && <span className="text-xs uppercase tracking-wide text-slate-400">{scenario.firm.name} · {scenario.difficulty}</span>}
      </div>
      {scenario && !result && (deciding
        ? <button onClick={() => setDeciding(false)} className="btn-ghost text-sm">← Back to interviews</button>
        : <button onClick={() => setDeciding(true)} className="btn-primary text-sm">Make the call →</button>)}
      {result && <button onClick={newChallenge} className="btn-primary text-sm">New challenge →</button>}
    </div>
  );

  // ---- setup ----
  if (!scenario) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {header}
        <h1 className="text-2xl font-bold">Make the hire</h1>
        <p className="mt-1 text-sm text-slate2">Four candidates, all impressive on paper. Interview them, then hire the one who will actually create the most value in this role. You&apos;re graded on how much of each candidate&apos;s success is <span className="font-medium text-ink">portable</span> vs. borrowed from their old firm, and on the fit with what this role really needs.</p>
        <div className="card mt-5 space-y-5 p-5">
          <div>
            <div className="lbl mb-1">Context</div>
            <div className="flex flex-wrap gap-1.5">
              {CONTEXTS.map((c) => <button key={c} onClick={() => setContext(c)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (context === c ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{c}</button>)}
            </div>
            <input className="field mt-2" value={context} onChange={(e) => setContext(e.target.value)} placeholder="…or type your own field / kind of role" />
          </div>
          <div>
            <div className="lbl mb-1">Difficulty</div>
            <div className="flex gap-1.5">
              {(["easy", "hard"] as const).map((d) => <button key={d} onClick={() => setDifficulty(d)} className={"rounded-full px-4 py-1.5 text-sm font-medium capitalize transition " + (difficulty === d ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{d}</button>)}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">{difficulty === "easy" ? "The star trap is easier to spot; the best fit is clearly ahead." : "A very seductive star, a subtle best fit, and a specialist whose strength isn't quite what the role needs."}</p>
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button onClick={generate} disabled={busy || !context.trim()} className="btn-primary w-full">{busy ? "Building the slate… (~15s)" : "Generate candidates"}</button>
        </div>
      </main>
    );
  }

  // ---- result ----
  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {header}
        <StarHireResult result={result} scenario={scenario} />
      </main>
    );
  }

  const active = scenario.candidates.find((c) => c.id === activeId) || scenario.candidates[0];

  // ---- decide ----
  if (deciding) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {header}
        <div className="card space-y-4 p-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The role</div>
            <p className="mt-1 text-sm text-ink"><span className="font-semibold">{scenario.role.title}</span> — {scenario.role.brief}</p>
          </div>
          <div>
            <div className="lbl mb-1">Who do you hire?</div>
            <div className="space-y-1.5">
              {scenario.candidates.map((c) => {
                const q = (chats[c.id] || []).filter((m) => m.role === "user").length;
                return (
                  <label key={c.id} className={"flex cursor-pointer items-start gap-2 rounded-xl border p-3 " + (pickId === c.id ? "border-ink bg-mist" : "border-line hover:bg-mist")}>
                    <input type="radio" name="pick" checked={pickId === c.id} onChange={() => setPickId(c.id)} className="mt-1 h-4 w-4 accent-[color:var(--ink)]" />
                    <div>
                      <div className="text-sm font-semibold text-ink">{c.name}</div>
                      <div className="text-xs text-slate2">{c.headline}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{q} question{q === 1 ? "" : "s"} asked</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <div className="lbl mb-1">Confidence: <span className="font-mono">{confidence}%</span></div>
            <input type="range" min={0} max={100} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-full accent-[color:var(--ink)]" />
          </div>
          <div>
            <label className="lbl">The one fact that would change your mind</label>
            <textarea className="field min-h-[80px]" value={flip} onChange={(e) => setFlip(e.target.value)} placeholder="What would you most need to learn to flip your decision?" />
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button onClick={submit} disabled={busy || !pickId} className="btn-primary w-full">{busy ? "Grading…" : "Submit the hire & reveal"}</button>
        </div>
      </main>
    );
  }

  // ---- interview ----
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {header}
      <div className="mb-3 rounded-xl bg-mist px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{scenario.role.title} · {scenario.firm.name}</div>
        <p className="mt-1 text-sm text-ink">{scenario.role.brief}</p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {scenario.candidates.map((c) => {
          const q = (chats[c.id] || []).filter((m) => m.role === "user").length;
          return (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (active.id === c.id ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>
              {c.name}{q > 0 && <span className={"ml-1.5 text-xs " + (active.id === c.id ? "text-white/70" : "text-slate-400")}>· {q}</span>}
            </button>
          );
        })}
        <span className={"ml-auto rounded-full px-3 py-1.5 text-xs font-semibold " + (remaining <= 3 ? "bg-amber/20 text-amber-700" : "bg-mist text-slate2")}>{remaining} question{remaining === 1 ? "" : "s"} left</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="card h-fit p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{active.name}</div>
          <div className="mt-1 text-sm font-medium text-ink">{active.headline}</div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-slate2">{active.resume.map((b, i) => <li key={i}>{b}</li>)}</ul>
          {active.ask && <div className="mt-2 text-[13px] text-slate-500">Ask: <span className="text-ink">{active.ask}</span></div>}
          <p className="mt-3 border-t border-line pt-2 text-[11px] leading-snug text-slate-400">Probe what&apos;s really theirs vs. their old firm&apos;s platform, their fit with this role&apos;s strategy, and their downside risk. Vague questions get spin.</p>
        </aside>

        <RoleplayChat
          key={active.id}
          chat={chats[active.id] || []}
          setChat={(m) => setChatFor(active.id, m)}
          onCall={onCall(active.id)}
          counterpartName={active.name}
          placeholder={remaining > 0 ? `Ask ${active.name.split(" ")[0]} a question…` : "Question budget spent"}
          emptyHint={<>You&apos;re interviewing <span className="font-semibold">{active.name}</span>. Ask sharp, specific questions. You have <span className="font-semibold">{remaining}</span> questions across all four candidates.</>}
          disabled={remaining <= 0}
          disabledHint={<>You&apos;ve used all {QUESTION_BUDGET} questions. <button onClick={() => setDeciding(true)} className="font-semibold text-ink underline">Make the call →</button></>}
        />
      </div>
    </main>
  );
}
