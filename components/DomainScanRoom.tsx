"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DomainInsightReport from "@/components/DomainInsightReport";
import { useT } from "@/components/I18nProvider";

import type { ScanVariant } from "@/lib/scanVariants";
import ScientifiqScopePicker, { type Scope } from "@/components/ScientifiqScopePicker";

export default function DomainScanRoom({ session, initialWorkspace, variant }: { session: any; initialWorkspace: any; variant: ScanVariant }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [domain, setDomain] = useState<string>(saved.domain || "");
  const [scope, setScope] = useState<Scope>(saved.scope || { kind: variant.needsOrg ? "org" : "global", orgIds: [], countryId: "", scopeLabel: variant.needsOrg ? "" : "Global (all institutions)", orgQuery: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.read ? { read: state.read, data: state.data } : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  async function run() {
    const dq = domain.trim();
    if (dq.length < 2) { setErr("Enter a technology or field."); return; }
    if (scope.kind === "org" && scope.orgIds.length === 0) { setErr("Pick an institution."); return; }
    if (scope.kind === "country" && !scope.countryId) { setErr("Pick a country."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/domain-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: variant.mode, domain: dq, scopeKind: scope.kind, orgIds: scope.orgIds, countryId: scope.countryId, scopeLabel: scope.scopeLabel }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't run the scan."); setBusy(false); return; }
      await persist({ ...state, input: { domain: dq, scope }, read: j.read, data: j.data, eyebrow: variant.title, title: dq });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{variant.title}</span>
        </div>
        {report && <Link href={`/scan/${session.code}`} className="btn-ghost text-sm">Open full report →</Link>}
      </div>

      <div className="card space-y-4 p-5">
        <div className="text-sm text-slate-600">{variant.blurb}</div>
        <div>
          <label className="lbl">{variant.inputLabel}</label>
          <input className="field" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={variant.placeholder} />
        </div>
        <div>
          <div className="lbl mb-1">Scope</div>
          <ScientifiqScopePicker initial={saved.scope || { kind: variant.needsOrg ? "org" : "global" }} onChange={setScope} />
        </div>

        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy || domain.trim().length < 2} className="btn-primary w-full">{busy ? "Scanning… (~20s)" : report ? "Scan again" : "Run the scan"}</button>
      </div>

      {report && <div className="mt-8"><DomainInsightReport read={report.read} data={report.data} /></div>}
    </main>
  );
}
