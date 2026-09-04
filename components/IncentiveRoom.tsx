"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";
import type { ObservableScenario } from "@/lib/incentive/types";
import IncentiveResult from "@/components/IncentiveResult";

const CONTEXTS = ["Call center", "Sales team", "Hospital / ER", "Content moderation", "Warehouse / fulfillment", "Ride-share platform", "Software team", "Teaching / school"];

export default function IncentiveRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};

  const scenario: ObservableScenario | null = state.scenario || null;
  const sealed: string | null = state.sealed || null;
  const par = state.par || null;
  const result = state.result || null;
  const bestPct: number = state.bestPct ?? 0;
  const runs: number = state.runs ?? 0;

  const [context, setContext] = useState<string>(state.input?.context || CONTEXTS[0]);
  const [difficulty, setDifficulty] = useState<"easy" | "hard">(state.input?.difficulty || "easy");
  const [weights, setWeights] = useState<Record<string, number>>(state.design?.weights || {});
  const [floors, setFloors] = useState<Record<string, string>>(state.design?.floors ? Object.fromEntries(Object.entries(state.design.floors).map(([k, v]) => [k, String(v)])) : {});
  const [caps, setCaps] = useState<Record<string, string>>(state.design?.caps ? Object.fromEntries(Object.entries(state.design.caps).map(([k, v]) => [k, String(v)])) : {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pending = useRef<any>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current; pending.current = {};
    if (!Object.keys(patch).length) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const setCanvas = useCallback((patch: any) => {
    setWs((w: any) => { const canvas = { ...(w.canvas || {}), ...patch }; pending.current = { canvas }; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(flush, 500); return { ...w, canvas }; });
  }, [flush]);

  const wsum = useMemo(() => (scenario ? scenario.metrics.reduce((s, m) => s + (Math.max(0, weights[m.key] || 0)), 0) : 0), [scenario, weights]);

  async function generate() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/incentive/new", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, difficulty }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't generate a scenario."); setBusy(false); return; }
      const w0: Record<string, number> = {}; for (const m of j.scenario.metrics) w0[m.key] = 0;
      setWeights(w0); setFloors({}); setCaps({});
      setCanvas({ input: { context, difficulty }, scenario: j.scenario, sealed: j.sealed, par: j.par, design: { weights: w0 }, result: null, bestPct: 0, runs: 0 });
    } catch { setErr("Couldn't reach the scenario service."); }
    setBusy(false);
  }

  function numRec(rec: Record<string, string>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(rec)) { const n = Number(v); if (v !== "" && isFinite(n)) out[k] = Math.max(0, Math.min(100, n)); }
    return out;
  }

  async function run() {
    if (wsum <= 0) { setErr("Put some reward weight on at least one metric."); return; }
    setBusy(true); setErr(null);
    const design = { weights, floors: numRec(floors), caps: numRec(caps) };
    try {
      const res = await fetch("/api/incentive/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sealed, design, notFirstRun: runs > 0 }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "The tournament failed."); setBusy(false); return; }
      const newBest = Math.max(bestPct, j.pctOfOptimum || 0);
      setCanvas({ design, result: j, bestPct: newBest, runs: runs + 1 });
      if (j.pctOfOptimum >= 80) await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
      setTimeout(() => window.scrollTo({ top: 9999, behavior: "smooth" }), 60);
    } catch { setErr("Couldn't reach the tournament."); }
    setBusy(false);
  }

  function newChallenge() {
    setCanvas({ scenario: null, sealed: null, par: null, result: null, design: null, bestPct: 0, runs: 0 });
    setWeights({}); setFloors({}); setCaps({});
  }

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The Incentive Lab</span>
        {scenario && <span className="text-xs uppercase tracking-wide text-slate-400">{scenario.firm.name} · {scenario.difficulty}</span>}
      </div>
      {scenario && <button onClick={newChallenge} className="btn-ghost text-sm">New challenge →</button>}
    </div>
  );

  if (!scenario) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {header}
        <h1 className="text-2xl font-bold">Design an incentive. Watch it get gamed.</h1>
        <p className="mt-1 text-sm text-slate2">Pick a context and the app invents a firm, its real goal, the metrics you can reward, and the things workers can actually do. You set the incentives. Then AI worker-agents play against your design to find every way to hit the numbers while the real goal quietly rots. Redesign until they can&apos;t.</p>
        <div className="card mt-5 space-y-5 p-5">
          <div>
            <div className="lbl mb-1">Context</div>
            <div className="flex flex-wrap gap-1.5">{CONTEXTS.map((c) => <button key={c} onClick={() => setContext(c)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (context === c ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{c}</button>)}</div>
            <input className="field mt-2" value={context} onChange={(e) => setContext(e.target.value)} placeholder="…or type your own kind of workplace" />
          </div>
          <div>
            <div className="lbl mb-1">Difficulty</div>
            <div className="flex gap-1.5">{(["easy", "hard"] as const).map((d) => <button key={d} onClick={() => setDifficulty(d)} className={"rounded-full px-4 py-1.5 text-sm font-medium capitalize transition " + (difficulty === d ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{d}</button>)}</div>
            <p className="mt-1.5 text-xs text-slate-400">{difficulty === "easy" ? "One clear anti-gaming lever to find." : "Multiple tempting exploits and a valuable goal no single metric captures."}</p>
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button onClick={generate} disabled={busy || !context.trim()} className="btn-primary w-full">{busy ? "Building the workplace… (~15s)" : "Generate scenario"}</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {header}

      <div className="mb-3 rounded-xl bg-mist px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{scenario.role.title} · {scenario.firm.name}</div>
        <p className="mt-1 text-sm text-ink"><span className="font-semibold">What {scenario.firm.name} actually wants:</span> {scenario.trueObjective}</p>
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your incentive design</div>
          {bestPct > 0 && <div className="text-xs text-slate2">Best so far: <span className="font-semibold text-sage">{bestPct}%</span> · run {runs}</div>}
        </div>
        <p className="text-xs text-slate-400">Split the bonus across the metrics (weights are relative). Floors require a minimum to pay out; caps stop rewarding past a point. These are your only levers against gaming.</p>
        <div className="space-y-3">
          {scenario.metrics.map((m) => {
            const p = wsum > 0 ? Math.round(((weights[m.key] || 0) / wsum) * 100) : 0;
            return (
              <div key={m.key} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-ink">{m.label}{m.unit ? <span className="text-slate-400"> ({m.unit})</span> : null}</div>
                  <div className="text-xs font-semibold tabular-nums text-slate2">{p}% of bonus</div>
                </div>
                <input type="range" min={0} max={100} value={weights[m.key] || 0} onChange={(e) => setWeights((w) => ({ ...w, [m.key]: Number(e.target.value) }))} className="mt-1.5 w-full accent-[color:var(--ink)]" />
                <div className="mt-1 flex gap-4 text-[11px] text-slate-400">
                  <label className="flex items-center gap-1">floor <input className="w-14 rounded border border-line px-1 py-0.5 text-ink" value={floors[m.key] || ""} onChange={(e) => setFloors((f) => ({ ...f, [m.key]: e.target.value }))} placeholder="—" /></label>
                  <label className="flex items-center gap-1">cap <input className="w-14 rounded border border-line px-1 py-0.5 text-ink" value={caps[m.key] || ""} onChange={(e) => setCaps((c) => ({ ...c, [m.key]: e.target.value }))} placeholder="—" /></label>
                </div>
              </div>
            );
          })}
        </div>
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer">What can the workers actually do?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">{scenario.actions.map((a) => <li key={a.key}><span className="font-medium text-slate2">{a.label}</span> — {a.description}</li>)}</ul>
        </details>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy || wsum <= 0} className="btn-primary w-full">{busy ? "Workers are gaming your plan… (~15s)" : result ? "Run the tournament again" : "Run the self-play tournament"}</button>
      </div>

      {result && <div className="mt-6"><IncentiveResult result={result} scenario={scenario} par={par} /></div>}
    </main>
  );
}
