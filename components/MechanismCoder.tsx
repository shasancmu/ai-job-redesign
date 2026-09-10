"use client";

import { useState } from "react";

type Coded = {
  differences: { dimension: string; policy: string; holdout: string }[];
  mechanism: string;
  confidence: "low" | "medium" | "high";
};

export default function MechanismCoder({ flow }: { flow: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [coded, setCoded] = useState<Coded | null>(null);
  const [sampled, setSampled] = useState<{ policy: number; holdout: number } | null>(null);

  async function run() {
    setBusy(true); setErr(null); setCoded(null);
    try {
      const res = await fetch("/api/impact/mechanism", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow }) });
      const d = await res.json();
      if (d.coded) { setCoded(d.coded); setSampled(d.sampled || null); }
      else setErr(d.error || "Couldn't code the transcripts.");
    } catch { setErr("Request failed."); }
    setBusy(false);
  }

  const conf = coded?.confidence;
  const confClass = conf === "high" ? "bg-sage-soft text-sage" : conf === "medium" ? "bg-amber-soft text-amber" : "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-ink">Mechanism — read the transcripts</h2>
          <p className="mt-1 text-xs text-slate-400">Samples matched policy vs holdout conversations and names what concretely differs. Grounds the numeric mediation in the actual dialogue.</p>
        </div>
        <button onClick={run} disabled={busy} className="btn-primary text-sm shrink-0">{busy ? "Reading…" : "Code the transcripts"}</button>
      </div>

      {err && <p className="mt-3 text-sm text-clay">{err}</p>}

      {coded && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + confClass}>{conf} confidence</span>
            {sampled && <span className="text-[11px] text-slate-400">sampled {sampled.policy} policy · {sampled.holdout} holdout</span>}
          </div>
          <p className="mt-2 rounded-lg bg-sky-soft/40 px-3 py-2 text-sm text-slate-700"><b className="text-ink">Likely mechanism:</b> {coded.mechanism}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-semibold">Dimension</th>
                  <th className="px-3 py-2 font-semibold">Policy</th>
                  <th className="px-3 py-2 font-semibold">Holdout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(coded.differences || []).map((d, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-semibold text-ink">{d.dimension}</td>
                    <td className="px-3 py-2 text-slate-600">{d.policy}</td>
                    <td className="px-3 py-2 text-slate-500">{d.holdout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Qualitative, model-coded from a transcript sample — a hypothesis about the pathway, to be read alongside the mediation numbers, not as proof.</p>
        </div>
      )}
    </div>
  );
}
