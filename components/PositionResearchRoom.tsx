"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ScoreInventionReport from "@/components/ScoreInventionReport";

// Reuses the score-report shape; only the framing and endpoint differ.
export default function PositionResearchRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [title, setTitle] = useState<string>(saved.title || "");
  const [abstract, setAbstract] = useState<string>(saved.abstract || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.read ? { read: state.read, scores: state.scores } : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  async function run() {
    const a = abstract.trim();
    if (a.length < 80) { setErr("Paste your paper or idea as an abstract (a few sentences)."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/position-research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract: a, title: title.trim() }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't score it."); setBusy(false); return; }
      await persist({ ...state, input: { title, abstract: a }, read: j.read, scores: j.scores, title: j.title });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Position My Research</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          Paste a paper or research idea as an abstract. Scientifiq scores its <span className="font-medium text-ink">scientific, social, and commercial potential</span> against the field, and the AI advises how to frame it for impact, citations, and funding.
        </div>

        <div>
          <label className="lbl">Title (optional)</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short name for the work" />
        </div>
        <div>
          <label className="lbl">Abstract</label>
          <textarea className="field min-h-[160px]" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="A few sentences: the question, what you find, and why it matters." />
        </div>

        {err && <p className="text-sm text-clay">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={busy || abstract.trim().length < 80} className="btn-primary disabled:opacity-40">{busy ? "Scoring…" : report ? "Re-score" : "Score it →"}</button>
          {report && <Link href={`/position/${session.code}`} className="text-sm font-semibold text-ai hover:underline">Open full report →</Link>}
        </div>

        {report && <div className="pt-2"><ScoreInventionReport read={report.read} scores={report.scores} /></div>}
      </div>
    </main>
  );
}
