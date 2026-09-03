"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DefenseImpactReport from "@/components/DefenseImpactReport";

export default function DefenseImpactRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [title, setTitle] = useState<string>(saved.title || "");
  const [abstract, setAbstract] = useState<string>(saved.abstract || "");
  const [doi, setDoi] = useState<string>(saved.doi || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.read ? { read: state.read, scores: state.scores, evidence: state.evidence, engine: state.engine } : null;

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
      const res = await fetch("/api/scientifiq/defense-impact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract: a, title: title.trim(), doi: doi.trim() }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't estimate it."); setBusy(false); return; }
      await persist({ ...state, input: { title, abstract: a, doi }, read: j.read, scores: j.scores, evidence: j.evidence, engine: j.engine, title: j.title });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Defense Impact</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          Paste a paper or research idea as an abstract. It estimates the work&rsquo;s <span className="font-medium text-ink">defense / national-security relevance</span> and the domains it touches. Add the paper&rsquo;s <span className="font-medium text-ink">DOI</span> to ground the estimate in real evidence — the patents that cite it, and whether any are assigned to defense entities. A research-mapping score, not a targeting tool.
        </div>

        <div>
          <label className="lbl">Title (optional)</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short name for the work" />
        </div>
        <div>
          <label className="lbl">Abstract</label>
          <textarea className="field min-h-[160px]" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="A few sentences: what the research is, the method, and what's new about it." />
        </div>
        <div>
          <label className="lbl">DOI (optional — unlocks real patent evidence)</label>
          <input className="field" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="e.g. 10.1038/s41586-020-2649-2" />
        </div>

        {err && <p className="text-sm text-clay">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={busy || abstract.trim().length < 80} className="btn-primary disabled:opacity-40">{busy ? "Estimating…" : report ? "Re-estimate" : "Estimate defense impact →"}</button>
          {report && <Link href={`/defense/${session.code}`} className="text-sm font-semibold text-ai hover:underline">Open full report →</Link>}
        </div>

        {report && <div className="pt-2"><DefenseImpactReport read={report.read} scores={report.scores} evidence={report.evidence} engine={report.engine} /></div>}
      </div>
    </main>
  );
}
