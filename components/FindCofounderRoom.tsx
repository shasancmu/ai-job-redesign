"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CollaboratorsReport from "@/components/CollaboratorsReport";
import { useT } from "@/components/I18nProvider";
import ScientifiqScopePicker, { type Scope } from "@/components/ScientifiqScopePicker";

const NEEDS = [
  "Deep in my core technology",
  "Has commercialized or patented work",
  "Covers a technical area I lack",
  "Senior enough to lead R&D",
  "Could be a scientific co-founder",
];

export default function FindCofounderRoom({ session, initialWorkspace }: { session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};

  const [focus, setFocus] = useState<string>(saved.focus || "");
  const [scope, setScope] = useState<Scope>(saved.scope || { kind: "org", orgIds: [], countryId: "", scopeLabel: "", orgQuery: "" });
  const [needs, setNeeds] = useState<string[]>(saved.needs || []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const report = state.report ? { report: state.report, scopeLabel: state.scopeLabel } : null;

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  const toggle = (k: string) => setNeeds((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  async function run() {
    const f = focus.trim();
    if (f.length < 40) { setErr("Describe your venture's technology in a sentence or two."); return; }
    if (scope.kind === "org" && scope.orgIds.length === 0) { setErr("Pick an institution."); return; }
    if (scope.kind === "country" && !scope.countryId) { setErr("Pick a country."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/find-cofounder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus: f, scopeKind: scope.kind, orgIds: scope.orgIds, countryId: scope.countryId, scopeLabel: scope.scopeLabel, needs }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't find candidates."); setBusy(false); return; }
      await persist({ ...state, input: { focus: f, scope, needs }, report: j.report, scopeLabel: j.scopeLabel });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Find a Technical Co-Founder</span>
        </div>
        {report && <Link href={`/cofounder/${session.code}`} className="btn-ghost text-sm">Open full list →</Link>}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Find a technical co-founder</h1>
        <p className="mt-1 text-sm text-slate2">Describe your venture&apos;s technology. We&apos;ll surface researchers who can actually <span className="font-medium text-ink">build</span> it, ranked for commercial orientation, not just publication record.</p>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="lbl">Your venture&apos;s technology</label>
          <div className="mb-1 text-xs text-slate-400">A short description of what you&apos;re building and the hard technical problem at its core.</div>
          <textarea className="field min-h-[130px]" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. A solid-state battery using a novel ceramic electrolyte to reach higher energy density and safety; the core challenge is scalable thin-film manufacturing." />
        </div>
        <div>
          <div className="lbl mb-1">Where to look</div>
          <ScientifiqScopePicker initial={saved.scope || { kind: "org" }} onChange={setScope} />
        </div>
        <div>
          <div className="lbl mb-1">What matters most? <span className="font-normal text-slate-400">(optional)</span></div>
          <div className="flex flex-wrap gap-1.5">
            {NEEDS.map((k) => (
              <button key={k} onClick={() => toggle(k)} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (needs.includes(k) ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{k}</button>
            ))}
          </div>
        </div>

        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy || focus.trim().length < 40} className="btn-primary w-full">
          {busy ? "Finding candidates… (~20s)" : report ? "Find again" : "Find candidates"}
        </button>
      </div>

      {report && <div className="mt-8"><CollaboratorsReport report={report.report} scopeLabel={report.scopeLabel} /></div>}
    </main>
  );
}
