"use client";

import { useCallback, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.result ? state.result : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  async function run() {
    const a = abstract.trim();
    if (a.length < 80) { setErr("Paste the research as an abstract (a few sentences)."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/optimize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract: a, target }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't optimize it."); setBusy(false); return; }
      await persist({ ...state, input: { abstract: a, target }, result: j });
    } catch { setErr("Couldn't reach the service."); }
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
          Paste an abstract and pick a target. The AI proposes the <span className="font-medium text-ink">missing science</span> — concrete experiments, applications, and extensions — that would raise that potential, and the models score each so you see which next steps matter most.
        </div>

        <div>
          <label className="lbl">Raise which potential?</label>
          <div className="flex flex-wrap gap-2">
            {TARGETS.filter((t) => !t.director || canDefense).map((t) => (
              <button key={t.key} onClick={() => setTarget(t.key)} className={"rounded-full border px-3 py-1.5 text-sm " + (target === t.key ? "border-ai bg-ai/10 font-semibold text-ink" : "border-line text-slate2 hover:bg-white")}>{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="lbl">Abstract</label>
          <textarea className="field min-h-[160px]" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Paste the paper's abstract." />
        </div>

        {err && <p className="text-sm text-clay">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={busy || abstract.trim().length < 80} className="btn-primary disabled:opacity-40">{busy ? "Working… (~1 min)" : report ? "Re-run" : "Find the missing science →"}</button>
          {report && <Link href={`/optimize/${session.code}`} className="text-sm font-semibold text-ai hover:underline">Open full report →</Link>}
        </div>

        {report && <div className="pt-2"><ImpactOptimizerReport result={report} /></div>}
      </div>
    </main>
  );
}
