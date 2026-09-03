"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DomainInsightReport from "@/components/DomainInsightReport";
import { useT } from "@/components/I18nProvider";

export type ScanVariant = {
  mode: "landscape" | "deal-sourcing" | "scorecard" | "trajectory";
  title: string;
  blurb: string;
  inputLabel: string;
  placeholder: string;
  needsOrg?: boolean; // scorecard scopes to one institution
};

export const SCAN_VARIANTS: Record<string, ScanVariant> = {
  "tech-landscape": { mode: "landscape", title: "Technology Landscape Scan", blurb: "Name a technology or field and see who leads it, who's commercializing it, and where the white space is.", inputLabel: "Technology or field", placeholder: "e.g. solid-state batteries" },
  "deal-sourcing": { mode: "deal-sourcing", title: "Deep-Tech Deal Sourcing", blurb: "Name your thesis and surface labs whose science is high-quality and commercializing, spin-out candidates before they raise.", inputLabel: "Your thesis or field", placeholder: "e.g. gene therapy delivery vectors" },
  "commercialization-scorecard": { mode: "scorecard", title: "University Commercialization Scorecard", blurb: "Pick an institution and a field to score how commercially oriented its research is, its strengths, and its gaps.", inputLabel: "Field to score", placeholder: "e.g. microbiome therapeutics", needsOrg: true },
  "field-trajectory": { mode: "trajectory", title: "Where Is My Field Going?", blurb: "Name a field and see which subfields are rising, where value is concentrating, and what to bet on.", inputLabel: "Field", placeholder: "e.g. computational materials discovery" },
};

const SCOPES = [
  { key: "global", label: "Worldwide", kind: "global", orgQuery: "" },
  { key: "duke", label: "Duke University", kind: "org", orgQuery: "Duke University" },
  { key: "nc", label: "NC universities", kind: "region", orgQuery: "" },
  { key: "other", label: "An institution", kind: "org", orgQuery: "" },
] as const;

export default function DomainScanRoom({ session, initialWorkspace, variant }: { session: any; initialWorkspace: any; variant: ScanVariant }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [domain, setDomain] = useState<string>(saved.domain || "");
  const [scopeKey, setScopeKey] = useState<string>(saved.scopeKey || (variant.needsOrg ? "duke" : "global"));
  const [orgQuery, setOrgQuery] = useState<string>(saved.orgQuery || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scope = SCOPES.find((s) => s.key === scopeKey) || SCOPES[0];
  const report = state.read ? { read: state.read, data: state.data } : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  const scopes = variant.needsOrg ? SCOPES.filter((s) => s.kind !== "global") : SCOPES;

  async function run() {
    const dq = domain.trim();
    if (dq.length < 2) { setErr("Enter a technology or field."); return; }
    if (scope.kind === "org" && scope.key === "other" && !orgQuery.trim()) { setErr("Name the institution."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/domain-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: variant.mode, domain: dq, scopeKind: scope.kind, orgQuery: scope.key === "other" ? orgQuery.trim() : scope.orgQuery }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't run the scan."); setBusy(false); return; }
      await persist({ ...state, input: { domain: dq, scopeKey, orgQuery }, read: j.read, data: j.data, eyebrow: variant.title, title: dq });
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
          <div className="flex flex-wrap gap-1.5">
            {scopes.map((s) => (
              <button key={s.key} onClick={() => setScopeKey(s.key)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (scopeKey === s.key ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{s.label}</button>
            ))}
          </div>
          {scope.key === "other" && <input className="field mt-2" value={orgQuery} onChange={(e) => setOrgQuery(e.target.value)} placeholder="Full institution name, e.g. Stanford University" />}
        </div>

        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy || domain.trim().length < 2} className="btn-primary w-full">{busy ? "Scanning… (~20s)" : report ? "Scan again" : "Run the scan"}</button>
      </div>

      {report && <div className="mt-8"><DomainInsightReport read={report.read} data={report.data} /></div>}
    </main>
  );
}
