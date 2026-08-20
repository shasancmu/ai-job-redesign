"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LicensingBriefReport from "@/components/LicensingBriefReport";

const LICENSE_TYPES = ["Either", "Exclusive", "Non-exclusive"];
const STAGES = ["Either", "Early / concept", "Validated / data"];

export default function LicensingBriefRoom({ session, initialWorkspace }: { session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [title, setTitle] = useState<string>(saved.title || "");
  const [abstract, setAbstract] = useState<string>(saved.abstract || "");
  const [licenseType, setLicenseType] = useState<string>(saved.licenseType || "Either");
  const [sectors, setSectors] = useState<string>(saved.sectors || "");
  const [stage, setStage] = useState<string>(saved.stage || "Either");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.brief ? { brief: state.brief, scores: state.scores, comparables: state.comparables, patents: state.patents, title: state.title } : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  async function run() {
    const a = abstract.trim();
    if (a.length < 80) { setErr("Paste the invention's abstract or description (a few sentences)."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/licensing-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abstract: a, title: title.trim(), licenseType: licenseType === "Either" ? "" : licenseType, sectors: sectors.trim(), stage: stage === "Either" ? "" : stage }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't build the brief."); setBusy(false); return; }
      await persist({ ...state, input: { title, abstract: a, licenseType, sectors, stage }, brief: j.brief, scores: j.scores, comparables: j.comparables, patents: j.patents, title: j.title });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Licensing Brief</span>
        </div>
        {report && <Link href={`/licensing/${session.code}`} className="btn-ghost text-sm">Open full brief →</Link>}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Brief an invention</h1>
        <p className="mt-1 text-sm text-slate2">Paste a disclosure or abstract. You&apos;ll get its predicted potential, the nearby patent landscape, likely licensees, and an outreach plan.</p>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="lbl">Title <span className="font-normal text-slate-400">(optional)</span></label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short name for the invention" />
        </div>
        <div>
          <label className="lbl">Abstract or disclosure</label>
          <textarea className="field min-h-[150px]" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Paste the invention's abstract or a description of what it is and does…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="lbl mb-1">License type</div>
            <div className="flex flex-wrap gap-1.5">
              {LICENSE_TYPES.map((t) => (
                <button key={t} onClick={() => setLicenseType(t)} className={"rounded-full px-3 py-1.5 text-xs font-medium transition " + (licenseType === t ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="lbl mb-1">Stage</div>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((t) => (
                <button key={t} onClick={() => setStage(t)} className={"rounded-full px-3 py-1.5 text-xs font-medium transition " + (stage === t ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="lbl">Target sectors <span className="font-normal text-slate-400">(optional)</span></label>
          <input className="field" value={sectors} onChange={(e) => setSectors(e.target.value)} placeholder="e.g. diagnostics, medical devices, cardiology" />
        </div>

        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy || abstract.trim().length < 80} className="btn-primary w-full">
          {busy ? "Scoring and briefing… (~20s)" : report ? "Rebuild the brief" : "Build the licensing brief"}
        </button>
      </div>

      {report && (
        <div className="mt-8">
          <LicensingBriefReport brief={report.brief} scores={report.scores} comparables={report.comparables} patents={report.patents} title={report.title} />
        </div>
      )}
    </main>
  );
}
