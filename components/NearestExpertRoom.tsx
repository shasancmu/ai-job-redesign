"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";
import NearestExpertResult from "@/components/NearestExpertResult";

export default function NearestExpertRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const t = useT();
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const saved = state.input || {};
  const result = state.result || null;

  const [problem, setProblem] = useState<string>(saved.problem || "");
  const [countryId, setCountryId] = useState<string>(saved.countryId || "");
  const [countryName, setCountryName] = useState<string>(saved.countryName || "");
  const [city, setCity] = useState<string>(saved.city || "");
  const [cQuery, setCQuery] = useState<string>(saved.countryName || "");
  const [cOpts, setCOpts] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const persist = useCallback(async (canvas: any) => {
    setWs((w: any) => ({ ...w, canvas }));
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
  }, [supabase, ws.id, session.id]);

  // country typeahead
  useEffect(() => {
    if (countryName && cQuery === countryName) { setCOpts([]); return; }
    if (cQuery.trim().length < 2) { setCOpts([]); return; }
    const id = setTimeout(async () => {
      try { const r = await fetch(`/api/scientifiq/lookup?type=country&q=${encodeURIComponent(cQuery)}`); const j = await r.json(); setCOpts(j.results || []); } catch { setCOpts([]); }
    }, 300);
    return () => clearTimeout(id);
  }, [cQuery, countryName]);

  async function run() {
    const p = problem.trim();
    if (p.length < 8) { setErr("Describe your problem in a sentence or two."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/scientifiq/nearest-expert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem: p, countryId, countryName, city }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't find experts."); setBusy(false); return; }
      await persist({ ...state, input: { problem: p, countryId, countryName, city }, result: { plan: j.plan, ladder: j.ladder } });
    } catch { setErr("Couldn't reach the service."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Nearest Expert</span>
      </div>
      <h1 className="text-2xl font-bold">Find the expert who can help</h1>
      <p className="mt-1 text-sm text-slate2">Describe your technical problem and where you are. You&apos;ll get the experts who work on it, nearest first: someone you could actually visit, then the best in your country, then the global leaders.</p>

      <div className="card mt-5 space-y-4 p-5">
        <div>
          <label className="lbl">Your problem</label>
          <textarea className="field min-h-[110px]" value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. Our ice-cream machines make grainy ice cream and the refrigeration wastes energy. We need help with ice-crystal control and the freezing cycle." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <label className="lbl">Country</label>
            <input className="field" value={cQuery} onChange={(e) => { setCQuery(e.target.value); setCountryName(""); setCountryId(""); }} placeholder="e.g. India" />
            {cOpts.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-52 w-full space-y-0.5 overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-lg">
                {cOpts.map((c) => <button key={c.id} onClick={() => { setCountryId(c.id); setCountryName(c.name); setCQuery(c.name); setCOpts([]); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-mist">{c.name}</button>)}
              </div>
            )}
          </div>
          <div>
            <label className="lbl">City <span className="font-normal text-slate-400">(for &ldquo;nearest&rdquo;)</span></label>
            <input className="field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Surat" />
          </div>
        </div>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <button onClick={run} disabled={busy || problem.trim().length < 8} className="btn-primary w-full">{busy ? "Finding experts… (~15s)" : result ? "Search again" : "Find experts"}</button>
      </div>

      {result && <div className="mt-6"><NearestExpertResult plan={result.plan} ladder={result.ladder} /></div>}
    </main>
  );
}
