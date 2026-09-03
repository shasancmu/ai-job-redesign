"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ExplainReport from "@/components/ExplainReport";

export default function ExplainRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [title, setTitle] = useState<string>(saved.title || "");
  const [abstract, setAbstract] = useState<string>(saved.abstract || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.read ? { read: state.read } : null;

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
      const res = await fetch("/api/scientifiq/explain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract: a, title: title.trim() }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't translate it."); setBusy(false); return; }
      await persist({ ...state, input: { title, abstract: a }, read: j.read, title: j.title });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">ExplainAI</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          Paste a paper&rsquo;s abstract and get it translated into <span className="font-medium text-ink">plain language</span>, framed for four audiences — a policymaker, an investor, a researcher in another field, and the public — plus a translation of the key jargon.
        </div>

        <div>
          <label className="lbl">Title (optional)</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short name for the work" />
        </div>
        <div>
          <label className="lbl">Abstract</label>
          <textarea className="field min-h-[160px]" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Paste the paper's abstract here." />
        </div>

        {err && <p className="text-sm text-clay">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={busy || abstract.trim().length < 80} className="btn-primary disabled:opacity-40">{busy ? "Translating…" : report ? "Re-translate" : "Explain it →"}</button>
          {report && <Link href={`/explain/${session.code}`} className="text-sm font-semibold text-ai hover:underline">Open full report →</Link>}
        </div>

        {report && <div className="pt-2"><ExplainReport read={report.read} /></div>}
      </div>
    </main>
  );
}
