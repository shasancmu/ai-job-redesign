"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";
import ScienceIntelResult from "@/components/ScienceIntelResult";

const MODES = [
  { key: "talent", label: "Talent Map", blurb: "The top experts in a field, where they are, and who they patent for.", input: "field" },
  { key: "national", label: "National Capability", blurb: "A country's research strengths by commercial potential, and who drives them.", input: "country" },
  { key: "competitors", label: "Emerging Competitors", blurb: "The firms quietly building on the same science your company cites.", input: "company" },
] as const;

export default function ScienceIntelRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};
  const result = state.result || null;

  const [mode, setMode] = useState<string>(saved.mode || "talent");
  const [field, setField] = useState<string>(saved.field || "");
  const [company, setCompany] = useState<string>(saved.company || "");
  const [countryId, setCountryId] = useState<string>(saved.countryId || "");
  const [countryName, setCountryName] = useState<string>(saved.countryName || "");
  const [cQuery, setCQuery] = useState<string>(saved.countryName || "");
  const [cOpts, setCOpts] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  useEffect(() => {
    if (mode !== "national") return;
    if (countryName && cQuery === countryName) { setCOpts([]); return; }
    if (cQuery.trim().length < 2) { setCOpts([]); return; }
    const id = setTimeout(async () => {
      try { const r = await fetch(`/api/scientifiq/lookup?type=country&q=${encodeURIComponent(cQuery)}`); const j = await r.json(); setCOpts(j.results || []); } catch { setCOpts([]); }
    }, 300);
    return () => clearTimeout(id);
  }, [cQuery, countryName, mode]);

  const active = MODES.find((m) => m.key === mode)!;

  async function run() {
    const payload: any = { mode };
    if (mode === "talent") { if (!field.trim()) { setErr("Enter a technology or field."); return; } payload.field = field.trim(); }
    if (mode === "competitors") { if (!company.trim()) { setErr("Enter a company name."); return; } payload.company = company.trim(); }
    if (mode === "national") { if (!countryId) { setErr("Pick a country."); return; } payload.countryId = countryId; payload.countryName = countryName; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/science-intel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't run the report."); setBusy(false); return; }
      await persist({ ...state, input: { mode, field, company, countryId, countryName }, result: { mode: j.mode, data: j.data, narrate: j.narrate } });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Science Intelligence</span>
      </div>
      <h1 className="text-2xl font-bold">Read the science frontier</h1>

      <div className="card mt-4 space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => <button key={m.key} onClick={() => { setMode(m.key); setErr(null); }} className={"rounded-full px-3 py-1.5 text-sm font-medium transition " + (mode === m.key ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{m.label}</button>)}
        </div>
        <p className="text-xs text-slate-400">{active.blurb}</p>

        {active.input === "field" && (
          <div><label className="lbl">Technology or field</label><input className="field" value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. solid-state batteries · mRNA delivery · perovskite solar" onKeyDown={(e) => { if (e.key === "Enter" && !busy) run(); }} /></div>
        )}
        {active.input === "company" && (
          <div><label className="lbl">Company</label><input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Samsung Electronics" onKeyDown={(e) => { if (e.key === "Enter" && !busy) run(); }} /></div>
        )}
        {active.input === "country" && (
          <div className="relative">
            <label className="lbl">Country</label>
            <input className="field" value={cQuery} onChange={(e) => { setCQuery(e.target.value); setCountryName(""); setCountryId(""); }} placeholder="e.g. India" />
            {cOpts.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-52 w-full space-y-0.5 overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-lg">
                {cOpts.map((c) => <button key={c.id} onClick={() => { setCountryId(c.id); setCountryName(c.name); setCQuery(c.name); setCOpts([]); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-mist">{c.name}</button>)}
              </div>
            )}
          </div>
        )}
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy} className="btn-primary w-full">{busy ? "Reading the frontier… (~20s)" : result ? "Run again" : "Run the report"}</button>
      </div>

      {result && <div className="mt-6"><ScienceIntelResult mode={result.mode} data={result.data} narrate={result.narrate} /></div>}
    </main>
  );
}
