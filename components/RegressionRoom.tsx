"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";
import { runCommand, type ConsoleResult } from "@/lib/regsim/console";
import type { Challenge } from "@/lib/regsim/types";
import type { GradeBreakdown } from "@/lib/regsim/grade";
import ResultView from "@/components/regsim/ResultView";
import RegressionResult from "@/components/RegressionResult";

const CONTEXTS = ["Sports analytics", "People / HR analytics", "Customer analytics", "Healthcare analytics", "Real estate", "Education outcomes", "Marketing & advertising", "Operations & logistics"];

type Result = { grade: GradeBreakdown; feedback: any };

export default function RegressionRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};

  const challenge: Challenge | null = state.challenge || null;
  const sealed: string | null = state.sealed || null;
  const genCols: { name: string; values: number[] }[] = state.genCols || [];
  const result: Result | null = state.result || null;

  const [context, setContext] = useState<string>(state.input?.context || CONTEXTS[0]);
  const [difficulty, setDifficulty] = useState<"easy" | "hard">(state.input?.difficulty || "easy");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [cmd, setCmd] = useState("");
  const [log, setLog] = useState<{ cmd: string; result: ConsoleResult }[]>([]);
  const [formula, setFormula] = useState("");
  const [writeup, setWriteup] = useState("");
  const [confirming, setConfirming] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);

  // debounced persistence into workspaces.canvas
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
      pending.current = { ...pending.current, canvas };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
      return { ...w, canvas };
    });
  }, [flush]);

  const columns = useMemo(() => {
    const base: Record<string, number[]> = { ...(challenge?.columns || {}) };
    for (const g of genCols) base[g.name] = g.values;
    return base;
  }, [challenge, genCols]);

  const outcomeName = challenge?.outcome.name || "y";
  const allVars = useMemo(() => (challenge ? [...challenge.variables.map((v) => v.name), outcomeName, ...genCols.map((g) => g.name)] : []), [challenge, genCols, outcomeName]);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/regression/new", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, difficulty }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't generate a challenge."); setBusy(false); return; }
      setLog([]);
      setFormula(`${j.challenge.outcome.name} ~ `);
      setWriteup("");
      setConfirming(false);
      setCanvas({ input: { context, difficulty }, challenge: j.challenge, sealed: j.sealed, genCols: [], submission: null, result: null });
    } catch { setErr("Couldn't reach the challenge service."); }
    setBusy(false);
  }

  function run(raw: string) {
    const c = raw.trim();
    if (!c) return;
    const { result: r, newColumn } = runCommand(c, columns, outcomeName);
    if (newColumn) setCanvas({ genCols: [...genCols, { name: newColumn.name, values: newColumn.values }] });
    setLog((l) => [...l.slice(-40), { cmd: c, result: r }]);
    setCmd("");
    setTimeout(() => logEnd.current?.scrollIntoView({ behavior: "smooth" }), 30);
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/regression/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: session.code, sealed, formula, writeup }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't grade the submission."); setBusy(false); return; }
      setCanvas({ submission: { formula, writeup }, result: { grade: j.grade, feedback: j.feedback } });
      await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
      setConfirming(false);
    } catch { setErr("Couldn't reach the grader."); }
    setBusy(false);
  }

  function newChallenge() {
    setCanvas({ challenge: null, sealed: null, genCols: [], submission: null, result: null });
    setLog([]);
  }

  // ---- setup screen ----
  if (!challenge) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Regression Detective</span>
        </div>
        <h1 className="text-2xl font-bold">Find the true model</h1>
        <p className="mt-1 text-sm text-slate2">Pick a context and a difficulty. You&apos;ll get a fresh dataset with a hidden data-generating process. Use the console to explore, then submit the model you think generated the data. You&apos;re graded against the truth.</p>

        <div className="card mt-5 space-y-5 p-5">
          <div>
            <div className="lbl mb-1">Context</div>
            <div className="flex flex-wrap gap-1.5">
              {CONTEXTS.map((c) => (
                <button key={c} onClick={() => setContext(c)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (context === c ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{c}</button>
              ))}
            </div>
            <input className="field mt-2" value={context} onChange={(e) => setContext(e.target.value)} placeholder="…or type your own context" />
          </div>
          <div>
            <div className="lbl mb-1">Difficulty</div>
            <div className="flex gap-1.5">
              {(["easy", "hard"] as const).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className={"rounded-full px-4 py-1.5 text-sm font-medium capitalize transition " + (difficulty === d ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{d}</button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">{difficulty === "easy" ? "Strong signals, few variables, no hidden nonlinearity — discoverable with correlations and one regression." : "Weaker signals, correlated distractors, at least one nonlinear term and one interaction. Rewards careful work."}</p>
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button onClick={generate} disabled={busy || !context.trim()} className="btn-primary w-full">{busy ? "Designing your dataset… (~15s)" : "Generate challenge"}</button>
        </div>
      </main>
    );
  }

  // ---- result screen ----
  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
            <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Regression Detective</span>
          </div>
          <button onClick={newChallenge} className="btn-primary text-sm">New challenge →</button>
        </div>
        <RegressionResult grade={result.grade} feedback={result.feedback} context={challenge.context} />
      </main>
    );
  }

  // ---- work screen ----
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Regression Detective</span>
          <span className="text-xs uppercase tracking-wide text-slate-400">{challenge.context} · {challenge.difficulty} · n={challenge.n}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* left: scenario + data dictionary */}
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The brief</div>
            <p className="mt-1 text-sm text-ink">{challenge.scenario}</p>
            <p className="mt-2 text-sm"><span className="text-slate2">Explain:</span> <span className="font-semibold text-ink">{challenge.outcome.label}</span> <span className="font-mono text-xs text-slate-400">({challenge.outcome.name})</span></p>
          </div>
          <div className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Variables (click to insert)</div>
            <div className="mt-2 space-y-1">
              {challenge.variables.map((v) => (
                <button key={v.name} onClick={() => setCmd((s) => s + v.name)} className="block w-full rounded-lg px-2 py-1 text-left hover:bg-mist">
                  <span className="font-mono text-[13px] text-ink">{v.name}</span>
                  <span className="ml-1 text-xs text-slate-400">{v.label}</span>
                </button>
              ))}
              {genCols.length > 0 && <div className="mt-2 border-t border-line pt-2 text-[11px] uppercase tracking-wide text-slate-400">Your variables</div>}
              {genCols.map((g) => (
                <button key={g.name} onClick={() => setCmd((s) => s + g.name)} className="block w-full rounded-lg px-2 py-1 text-left hover:bg-mist">
                  <span className="font-mono text-[13px] text-sage">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* right: console + submit */}
        <section className="space-y-4">
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Console</div>
              <div className="flex gap-1.5">
                {["describe()", "cor()", `hist(${outcomeName})`, "help"].map((q) => (
                  <button key={q} onClick={() => run(q)} className="rounded-full bg-mist px-2.5 py-1 font-mono text-[11px] text-slate2 hover:bg-slate-200">{q}</button>
                ))}
                <button onClick={() => setLog([])} className="rounded-full px-2.5 py-1 text-[11px] text-slate-400 hover:text-ink">clear</button>
              </div>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg bg-paper/40 p-1">
              {log.length === 0 && <div className="px-2 py-6 text-center text-sm text-slate-400">Try <span className="font-mono">describe()</span>, then <span className="font-mono">cor()</span>, then a regression. Type <span className="font-mono">help</span> for all commands.</div>}
              {log.map((e, i) => (
                <div key={i} className="rounded-lg border border-line/70 bg-white p-2.5">
                  <div className="mb-1 font-mono text-[12px] text-slate2">&gt; {e.cmd}</div>
                  <ResultView r={e.result} />
                </div>
              ))}
              <div ref={logEnd} />
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="field flex-1 font-mono text-[13px]"
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") run(cmd); }}
                placeholder={`e.g. reg(${outcomeName} ~ ${challenge.variables[0]?.name} + ${challenge.variables[1]?.name})`}
                spellCheck={false}
              />
              <button onClick={() => run(cmd)} className="btn-ghost">Run</button>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Submit your model</div>
            <p className="mt-1 text-xs text-slate-400">When you think you&apos;ve found the true model, write it as a formula and explain your reasoning. This ends the challenge and reveals the answer.</p>
            <label className="lbl mt-3">Final model</label>
            <input className="field font-mono text-[13px]" value={formula} onChange={(e) => setFormula(e.target.value)} placeholder={`${outcomeName} ~ x1 + log(x2) + x1:x3`} spellCheck={false} />
            <label className="lbl mt-3">Your reasoning</label>
            <textarea className="field min-h-[110px]" value={writeup} onChange={(e) => setWriteup(e.target.value)} placeholder="Which variables matter, in what functional form, and how you ruled the others out." />
            {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            {!confirming ? (
              <button onClick={() => setConfirming(true)} disabled={!formula.includes("~")} className="btn-primary mt-3 w-full">Submit for grading</button>
            ) : (
              <div className="mt-3 flex gap-2">
                <button onClick={submit} disabled={busy} className="btn-primary flex-1">{busy ? "Grading…" : "Yes, submit & reveal"}</button>
                <button onClick={() => setConfirming(false)} disabled={busy} className="btn-ghost">Keep working</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
