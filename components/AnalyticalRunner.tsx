"use client";

import { useState } from "react";
import Link from "next/link";
import { scoreColor } from "@/lib/canvases";

// Self-contained analytical instrument: paste/name a subject, the AI decomposes
// it into units and scores each against the author's levels; scoring is
// deterministic from the level values.
export default function AnalyticalRunner({ spec }: { spec: any }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");
  const levelLabel = (key: string) => spec.levels.find((l: any) => l.key === key)?.label || key;
  const levelValue = (key: string) => spec.levels.find((l: any) => l.key === key)?.value ?? 0;

  async function run() {
    if (!input.trim()) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const res = await fetch("/api/mechanics/analytical/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: spec.slug, input }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.units) throw new Error(d.error || "Couldn't analyze.");
      setResult(d);
    } catch (e: any) { setErr(e?.message || "Couldn't analyze."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {!result ? (
        <div>
          <div className="mb-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
            <label className="lbl">{spec.setupLabel || `Paste ${spec.subject}`}</label>
            <textarea className="field mt-1 text-sm" rows={8} value={input} onChange={(e) => setInput(e.target.value)} placeholder={spec.setupPlaceholder || ""} />
            <button onClick={run} disabled={busy || !input.trim()} className="btn-primary mt-3 text-sm disabled:opacity-50">{busy ? "Analyzing..." : "Analyze"}</button>
            {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
          </div>
          <div className="rounded-xl bg-mist p-3 text-xs text-slate-500">
            <span className="font-semibold">Levels:</span> {spec.levels.map((l: any) => `${l.label} (${l.value})`).join(" · ")}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5 text-center shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{result.aggregateLabel || "Overall"}</div>
            <div className="mt-1 text-5xl font-bold" style={{ color: scoreColor(result.aggregate) }}>{result.aggregate}</div>
            <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full" style={{ width: `${result.aggregate}%`, background: scoreColor(result.aggregate) }} /></div>
            {result.summary && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-600">{result.summary}</p>}
          </div>
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">By {spec.unitLabel}</div>
            <div className="mt-2 divide-y divide-line">
              {result.units.map((u: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm text-ink">{u.label}</div>
                    {u.note && <div className="text-xs text-slate-400">{u.note}</div>}
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: scoreColor(levelValue(u.level)) }}>{levelLabel(u.level)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center"><button onClick={() => { setResult(null); }} className="btn-ghost text-sm">Analyze another</button> <Link href="/studio/analytical" className="btn-ghost text-sm">Done</Link></div>
        </div>
      )}
    </div>
  );
}
