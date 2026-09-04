"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";
import ScienceRadarResult from "@/components/ScienceRadarResult";

export default function ScienceRadarRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};
  const result = state.result || null;

  const [byCompany, setByCompany] = useState<boolean>(saved.byCompany ?? true);
  const [company, setCompany] = useState<string>(saved.company || "");
  const [domain, setDomain] = useState<string>(saved.domain || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  async function run() {
    const payload = byCompany ? { company: company.trim() } : { domain: domain.trim() };
    if ((byCompany && !company.trim()) || (!byCompany && !domain.trim())) { setErr(byCompany ? "Enter a company name." : "Enter a technology domain."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/science-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't run the radar."); setBusy(false); return; }
      await persist({ ...state, input: { byCompany, company, domain }, result: { report: j.report, narrate: j.narrate } });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Science Radar</span>
      </div>
      <h1 className="text-2xl font-bold">Where&apos;s the science you could be using?</h1>
      <p className="mt-1 text-sm text-slate2">Name a company and we map the science its patents build on, the highest-potential researchers at the frontier of those fields, who else is building on the same science, and the work it isn&apos;t using yet. No patents? Describe the technology instead.</p>

      <div className="card mt-5 space-y-4 p-5">
        <div className="flex gap-1.5">
          <button onClick={() => setByCompany(true)} className={"rounded-full px-4 py-1.5 text-sm font-medium transition " + (byCompany ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>By company</button>
          <button onClick={() => setByCompany(false)} className={"rounded-full px-4 py-1.5 text-sm font-medium transition " + (!byCompany ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>By technology domain</button>
        </div>
        {byCompany ? (
          <div>
            <label className="lbl">Company</label>
            <input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Samsung Electronics" onKeyDown={(e) => { if (e.key === "Enter" && !busy) run(); }} />
            <p className="mt-1 text-xs text-slate-400">We look up its patents to derive its tech footprint automatically.</p>
          </div>
        ) : (
          <div>
            <label className="lbl">Technology domain</label>
            <input className="field" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. solid-state batteries · continuous ice-cream freezing · CRISPR delivery" onKeyDown={(e) => { if (e.key === "Enter" && !busy) run(); }} />
          </div>
        )}
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy} className="btn-primary w-full">{busy ? "Scanning the science… (~20s)" : result ? "Scan again" : "Run the radar"}</button>
      </div>

      {result && <div className="mt-6"><ScienceRadarResult report={result.report} narrate={result.narrate} /></div>}
    </main>
  );
}
