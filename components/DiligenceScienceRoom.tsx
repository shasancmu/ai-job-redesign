"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DiligenceScienceReport from "@/components/DiligenceScienceReport";

export default function DiligenceScienceRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [title, setTitle] = useState<string>(saved.title || "");
  const [abstract, setAbstract] = useState<string>(saved.abstract || "");
  const [context, setContext] = useState<string>(saved.context || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.read ? { read: state.read, scores: state.scores, comparables: state.comparables, patents: state.patents } : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  async function run() {
    const a = abstract.trim();
    if (a.length < 80) { setErr("Paste the startup's claimed technology as an abstract (a few sentences)."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/diligence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract: a, context: context.trim(), title: title.trim() }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't run diligence."); setBusy(false); return; }
      await persist({ ...state, input: { title, abstract: a, context }, read: j.read, scores: j.scores, comparables: j.comparables, patents: j.patents, title: j.title });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Diligence the Science</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          Paste a startup&apos;s claimed technology. Scientifiq scores it and pulls the comparable science and patent landscape, and the AI reads whether the science is <span className="font-medium text-ink">real, strong, and commercializing</span>.
        </div>
        <div>
          <label className="lbl">Company / title (optional)</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The startup or technology name" />
        </div>
        <div>
          <label className="lbl">Claimed technology (abstract)</label>
          <textarea className="field min-h-[150px]" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="A few sentences on the core technology and what makes it work / novel." />
        </div>
        <div>
          <label className="lbl">Team / context (optional)</label>
          <input className="field" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Founders' names or backgrounds, stage, any claims to check." />
        </div>

        {err && <p className="text-sm text-clay">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={busy || abstract.trim().length < 80} className="btn-primary disabled:opacity-40">{busy ? "Running diligence…" : report ? "Re-run" : "Diligence it →"}</button>
          {report && <Link href={`/diligence/${session.code}`} className="text-sm font-semibold text-ai hover:underline">Open full report →</Link>}
        </div>

        {report && <div className="pt-2"><DiligenceScienceReport read={report.read} scores={report.scores} comparables={report.comparables} patents={report.patents} /></div>}
      </div>
    </main>
  );
}
