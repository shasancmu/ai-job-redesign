"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ImpactOptimizerReport from "@/components/ImpactOptimizerReport";

const TARGETS: { key: string; label: string; director?: boolean }[] = [
  { key: "commercial", label: "Commercial" },
  { key: "scientific", label: "Scientific" },
  { key: "social", label: "Social" },
  { key: "complex_invention", label: "Complex-invention" },
  { key: "interdisciplinary", label: "Interdisciplinary" },
  { key: "defense", label: "Defense", director: true },
];

export default function ImpactOptimizerRoom({ session, initialWorkspace, canDefense = false }: { me?: string; session: any; initialWorkspace: any; canDefense?: boolean }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [abstract, setAbstract] = useState<string>(saved.abstract || "");
  const [target, setTarget] = useState<string>(saved.target || "commercial");
  const [targetLevel, setTargetLevel] = useState<number | null>(saved.targetLevel ?? null);
  const [rounds, setRounds] = useState<number>(saved.rounds ?? 3);
  const [bets, setBets] = useState<number>(saved.bets ?? 3);
  const [diversity, setDiversity] = useState<number>(saved.diversity ?? 0.55);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const report = state.result ? state.result : null;

  // Rough effort estimate (proposer calls ≈ 1 + (depth−1)·frontier width), to warn
  // that deeper/broader runs cost more time and tokens.
  const beamWide = Math.max(3, Math.min(6, bets + 1));
  const effort = 1 + (rounds - 1) * beamWide;
  const effortLabel = effort <= 9 ? "Light run" : effort <= 15 ? "Moderate run" : "Heavy run";
  const effortTone = effort <= 9 ? "bg-sage/10 text-sage" : effort <= 15 ? "bg-mist text-slate2" : "bg-clay-soft text-clay";
  const chipCls = (active: boolean) => "rounded-full border px-3 py-1.5 text-sm " + (active ? "border-ai bg-ai/10 font-semibold text-ink" : "border-line text-slate2 hover:bg-white");

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => stopTimer, []); // clear on unmount

  // The API is one long call, so we estimate progress from elapsed time against the
  // chosen effort, and label the phase by which band we're in. It maps to the real
  // pipeline (score → explore by depth → vet each bet); it completes when the
  // response lands. Honest about the work, not a fake crawl.
  function phaseLabel(pct: number): string {
    if (pct < 10) return "Scoring the abstract…";
    if (pct < 55) { const r = Math.min(rounds, Math.floor((pct - 10) / (45 / rounds)) + 1); return `Exploring the missing science — depth ${r} of ${rounds}…`; }
    if (pct < 93) { const b = Math.min(bets, Math.floor((pct - 55) / (38 / bets)) + 1); return `Vetting bet ${b} of ${bets} — literature & trade-offs…`; }
    return "Assembling the portfolio…";
  }

  async function run() {
    const a = abstract.trim();
    if (a.length < 80) { setErr("Paste the research as an abstract (a few sentences)."); return; }
    setBusy(true); setErr(null);
    setProgress(3); setPhase(phaseLabel(3));
    const started = Date.now();
    const estMs = (6 + rounds * 10 + bets * 8) * 1000; // rough, scales with the effort
    stopTimer();
    timerRef.current = setInterval(() => {
      const raw = ((Date.now() - started) / estMs) * 100;
      const p = Math.min(93, Math.max(3, raw));
      setProgress(p); setPhase(phaseLabel(p));
    }, 400);
    try {
      const res = await fetch("/api/scientifiq/optimize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract: a, target, targetLevel: targetLevel ?? undefined, rounds, bets, diversity }),
      });
      const j = await res.json().catch(() => ({}));
      stopTimer();
      if (!res.ok) { setProgress(0); setErr(j?.error || "Couldn't optimize it — try again, or lower the depth."); setBusy(false); return; }
      setProgress(100); setPhase("Done");
      await persist({ ...state, input: { abstract: a, target, targetLevel, rounds, bets, diversity }, result: j });
    } catch { stopTimer(); setProgress(0); setErr("Couldn't reach the service. Check your connection and try again."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Impact Optimizer</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          Paste an abstract, pick a target, and set the score to aim for. The AI proposes the <span className="font-medium text-ink">missing science</span> — concrete experiments, applications, and extensions — that would reach it, and returns a <span className="font-medium text-ink">portfolio of distinct research bets</span> (different paths to the goal), each scored on every potential — and <span className="font-medium text-ink">grounded in real matched papers</span> whose higher-outcome twins made the same moves.
        </div>

        <div>
          <label className="lbl">Raise which potential?</label>
          <div className="flex flex-wrap gap-2">
            {TARGETS.filter((t) => !t.director || canDefense).map((t) => (
              <button key={t.key} onClick={() => setTarget(t.key)} className={"rounded-full border px-3 py-1.5 text-sm " + (target === t.key ? "border-ai bg-ai/10 font-semibold text-ink" : "border-line text-slate2 hover:bg-white")}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3.5 rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">How the search runs</div>
            <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + effortTone}>{effortLabel}</span>
          </div>

          {/* Aim for — return-to-go target */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">Aim for <span className="font-normal text-slate-400">— the target score</span></div>
            <div className="flex flex-wrap gap-2">
              {([[null, "Auto stretch"], [75, "75"], [85, "85"], [92, "92"]] as [number | null, string][]).map(([lvl, lbl]) => (
                <button key={lbl} onClick={() => setTargetLevel(lvl)} className={chipCls(targetLevel === lvl)}>{lbl}{lvl == null ? "" : "/100"}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">Higher is more ambitious. The search works backward to find the science that reaches it, and stops as soon as a path gets there. <span className="text-slate2">Auto stretch</span> picks a bold-but-credible goal above the current score.</p>
          </div>

          {/* Depth — how many compounding steps */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">Depth <span className="font-normal text-slate-400">— how many steps to stack</span></div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => setRounds(n)} className={chipCls(rounds === n)}>{n} step{n === 1 ? "" : "s"}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">Each step builds on the one before, so gains compound. More depth = a longer research program, and a heavier run.</p>
          </div>

          {/* Bets — how many distinct paths to return */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">Bets <span className="font-normal text-slate-400">— how many routes to bring back</span></div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setBets(n)} className={chipCls(bets === n)}>{n}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">The report comes back as a portfolio of this many <em>different</em> research paths to the goal — more bets, a wider set to choose from.</p>
          </div>

          {/* Diversity — MMR lambda */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">Diversity <span className="font-normal text-slate-400">— one best route, or spread out</span></div>
            <div className="flex flex-wrap gap-2">
              {([[0.2, "Focused"], [0.55, "Balanced"], [0.85, "Diverse"]] as [number, string][]).map(([v, lbl]) => (
                <button key={lbl} onClick={() => setDiversity(v)} className={chipCls(Math.abs(diversity - v) < 0.01)}>{lbl}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400"><span className="text-slate2">Focused</span> hunts the single strongest route. <span className="text-slate2">Diverse</span> spreads across very different scientific directions — a guard against betting everything on one over-fit path.</p>
          </div>

          <p className="border-t border-line-soft pt-3 text-[11px] text-slate-400">The badge above estimates the load: deeper search and more bets explore harder but take longer and cost more tokens.</p>
        </div>
        <div>
          <label className="lbl">Abstract</label>
          <textarea className="field min-h-[160px]" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Paste the paper's abstract." />
        </div>

        {err && <p className="text-sm text-clay">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={busy || abstract.trim().length < 80} className="btn-primary disabled:opacity-40">{busy ? "Working…" : report ? "Re-run" : "Find the missing science →"}</button>
          {!busy && report && <Link href={`/optimize/${session.code}`} className="text-sm font-semibold text-ai hover:underline">Open full report →</Link>}
        </div>

        {/* Live progress — estimated from elapsed time against the chosen effort */}
        {busy && (
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{phase || "Working…"}</span>
              <span className="shrink-0 tabular-nums text-slate-400">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-ai transition-all duration-500 ease-out" style={{ width: `${Math.max(3, progress)}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">A {effortLabel.toLowerCase()} — this can take up to a couple of minutes. You can leave this open.</p>
          </div>
        )}

        {!busy && report && <div className="pt-2"><ImpactOptimizerReport result={report} /></div>}
      </div>
    </main>
  );
}
