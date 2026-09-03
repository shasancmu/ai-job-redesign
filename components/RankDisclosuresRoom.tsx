"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RankDisclosuresReport from "@/components/RankDisclosuresReport";
import { useT } from "@/components/I18nProvider";

export default function RankDisclosuresRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const [text, setText] = useState<string>(state.input || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.ranked ? { ranked: state.ranked, read: state.read } : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/rank-disclosures", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't rank them."); setBusy(false); return; }
      await persist({ ...state, input: text, ranked: j.ranked, read: j.read });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Rank Our Disclosures</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          Paste several disclosures or abstracts, each <span className="font-medium text-ink">separated by a line of <span className="font-mono">---</span></span>. Scientifiq scores each, ranks them by commercial potential, and the AI says which to prioritize.
        </div>
        <div>
          <label className="lbl">Disclosures</label>
          <textarea className="field min-h-[220px] font-mono text-[13px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={"First disclosure title\nA few sentences of the abstract…\n\n---\n\nSecond disclosure title\nA few sentences…"} />
        </div>

        {err && <p className="text-sm text-clay">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={busy || text.trim().length < 120} className="btn-primary disabled:opacity-40">{busy ? "Scoring the batch…" : report ? "Re-rank" : "Rank them →"}</button>
          {report && <Link href={`/disclosures-rank/${session.code}`} className="text-sm font-semibold text-ai hover:underline">Open full report →</Link>}
        </div>

        {report && <div className="pt-2"><RankDisclosuresReport ranked={report.ranked} read={report.read} /></div>}
      </div>
    </main>
  );
}
