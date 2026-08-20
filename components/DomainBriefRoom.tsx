"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DomainBriefReport from "@/components/DomainBriefReport";

const SCOPES = [
  { key: "duke", label: "Duke University", kind: "org", orgQuery: "Duke University" },
  { key: "nc", label: "NC universities", kind: "region", orgQuery: "" },
  { key: "other", label: "Another institution", kind: "org", orgQuery: "" },
  { key: "global", label: "Global", kind: "global", orgQuery: "" },
] as const;

const PURPOSES = [
  { key: "assess", label: "Assess the strength" },
  { key: "fund", label: "Decide what to fund" },
  { key: "partner", label: "Find a partner" },
  { key: "recruit", label: "Recruit talent" },
  { key: "scout", label: "Scout for commercial fit" },
] as const;

export default function DomainBriefRoom({ session, initialWorkspace }: { session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const savedInput = state.input || {};

  const [domain, setDomain] = useState<string>(savedInput.domain || "");
  const [scopeKey, setScopeKey] = useState<string>(savedInput.scopeKey || "duke");
  const [orgQuery, setOrgQuery] = useState<string>(savedInput.orgQuery && savedInput.scopeKey === "other" ? savedInput.orgQuery : "");
  const [purpose, setPurpose] = useState<string>(savedInput.purpose || "assess");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pending = useRef<Record<string, any>>({});
  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  const scope = SCOPES.find((s) => s.key === scopeKey) || SCOPES[0];
  const report = state.data && state.brief ? { data: state.data, brief: state.brief } : null;

  async function run() {
    const d = domain.trim();
    if (!d) { setErr("Enter a technology domain."); return; }
    if (scope.key === "other" && !orgQuery.trim()) { setErr("Name the institution."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/domain-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: d,
          scopeKind: scope.kind,
          orgQuery: scope.key === "other" ? orgQuery.trim() : scope.orgQuery,
          purpose,
        }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't build the brief."); setBusy(false); return; }
      await persist({ ...state, input: { domain: d, scopeKey, orgQuery, purpose }, data: j.data, brief: j.brief });
    } catch {
      setErr("Couldn't reach the brief service.");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Domain Expertise Brief</span>
        </div>
        {report && <Link href={`/domain-brief/${session.code}`} className="btn-ghost text-sm">Open full brief →</Link>}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Map a field&apos;s expertise</h1>
        <p className="mt-1 text-sm text-slate2">Name a technology domain and a scope. You&apos;ll get the experts, the standout work, and where the strength is, scored for real potential by Scientifiq.</p>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="lbl">Technology domain</label>
          <input
            className="field"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. drones and unmanned aerial vehicles · microbiome · solid-state batteries"
            onKeyDown={(e) => { if (e.key === "Enter" && !busy) run(); }}
          />
        </div>

        <div>
          <div className="lbl mb-1">Scope</div>
          <div className="flex flex-wrap gap-1.5">
            {SCOPES.map((s) => (
              <button
                key={s.key}
                onClick={() => setScopeKey(s.key)}
                className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (scopeKey === s.key ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}
              >
                {s.label}
              </button>
            ))}
          </div>
          {scope.key === "other" && (
            <input
              className="field mt-2"
              value={orgQuery}
              onChange={(e) => setOrgQuery(e.target.value)}
              placeholder="Full institution name, e.g. Stanford University"
            />
          )}
          {scope.key === "nc" && <p className="mt-1.5 text-xs text-slate-400">Duke, UNC, NC State, Wake Forest, ECU, and other NC universities.</p>}
        </div>

        <div>
          <div className="lbl mb-1">This brief is for…</div>
          <div className="flex flex-wrap gap-1.5">
            {PURPOSES.map((p) => (
              <button
                key={p.key}
                onClick={() => setPurpose(p.key)}
                className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (purpose === p.key ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        <button onClick={run} disabled={busy || !domain.trim()} className="btn-primary w-full">
          {busy ? "Building the brief… (this takes ~20s)" : report ? "Rebuild the brief" : "Build the brief"}
        </button>
      </div>

      {report && (
        <div className="mt-8">
          <DomainBriefReport brief={report.brief} data={report.data} />
        </div>
      )}
    </main>
  );
}
