"use client";

import { useMemo, useState } from "react";
import { DEFAULT_TOKEN_PRICE, costPerRun, type CostAssumption } from "@/lib/costs";

type Row = { slug: string; name: string; a: CostAssumption };

const money = (n: number) => "$" + n.toFixed(n < 1 ? 3 : 2);

export default function AdminCosts({
  rows,
  freeRuns,
  paidRuns,
  priceAll,
  priceCohort,
}: {
  rows: Row[];
  freeRuns: number;
  paidRuns: number;
  priceAll: number; // dollars ($29)
  priceCohort: number; // dollars ($19)
}) {
  const [inPer1M, setInPer1M] = useState(DEFAULT_TOKEN_PRICE.inPer1M);
  const [outPer1M, setOutPer1M] = useState(DEFAULT_TOKEN_PRICE.outPer1M);
  const [data, setData] = useState<Row[]>(rows);

  const price = useMemo(() => ({ inPer1M, outPer1M }), [inPer1M, outPer1M]);

  const setCell = (i: number, key: keyof CostAssumption, v: number) =>
    setData((d) => d.map((r, j) => (j === i ? { ...r, a: { ...r.a, [key]: v } } : r)));

  const perRun = (r: Row) => costPerRun(r.a, price);
  // If someone with all-access runs every module to its paid cap, what's the AI cost?
  const fullPaidExposure = data.reduce((s, r) => s + perRun(r) * paidRuns, 0);
  const avgFreeExposure = data.length ? (data.reduce((s, r) => s + perRun(r) * freeRuns, 0) / data.length) : 0;

  return (
    <div className="space-y-6">
      {/* Token price controls */}
      <div className="card p-5">
        <div className="text-sm font-bold text-ink">Token price (USD per 1M tokens)</div>
        <p className="mb-3 mt-1 text-xs text-slate-400">Set these to your actual model/provider. Everything below recomputes live.</p>
        <div className="flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="lbl">Input / 1M</span>
            <input type="number" step="0.05" className="field w-28" value={inPer1M} onChange={(e) => setInPer1M(+e.target.value || 0)} />
          </label>
          <label className="text-sm">
            <span className="lbl">Output / 1M</span>
            <input type="number" step="0.05" className="field w-28" value={outPer1M} onChange={(e) => setOutPer1M(+e.target.value || 0)} />
          </label>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label={`Worst-case AI cost, one all-access user`} value={money(fullPaidExposure)} sub={`all modules × ${paidRuns} runs`} />
        <Tile label="$29 gross margin (worst case)" value={money(priceAll - fullPaidExposure)} sub={`${money(priceAll)} − AI cost`} />
        <Tile label="$19 gross margin (worst case)" value={money(priceCohort - fullPaidExposure)} sub={`${money(priceCohort)} − AI cost`} />
      </div>
      <p className="text-xs text-slate-400">
        Worst case assumes a user exhausts every module&apos;s paid runs; real usage is far lower. Free-tier exposure ≈ {money(avgFreeExposure)} per free module (×{freeRuns} runs), unrecovered.
      </p>

      {/* Per-module table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Module</th>
              <th className="px-3 py-3">AI calls</th>
              <th className="px-3 py-3">In tok/call</th>
              <th className="px-3 py-3">Out tok/call</th>
              <th className="px-4 py-3 text-right">Cost / run</th>
              <th className="px-4 py-3 text-right">× {paidRuns} (paid cap)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.slug} className="border-b border-line/60">
                <td className="px-4 py-2.5 font-medium text-ink">{r.name}</td>
                <td className="px-3 py-2.5"><NumCell v={r.a.calls} step={1} onChange={(v) => setCell(i, "calls", v)} /></td>
                <td className="px-3 py-2.5"><NumCell v={r.a.inTok} step={100} onChange={(v) => setCell(i, "inTok", v)} /></td>
                <td className="px-3 py-2.5"><NumCell v={r.a.outTok} step={100} onChange={(v) => setCell(i, "outTok", v)} /></td>
                <td className="px-4 py-2.5 text-right font-semibold">{money(perRun(r))}</td>
                <td className="px-4 py-2.5 text-right text-slate2">{money(perRun(r) * paidRuns)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Estimates are seeds — tune the calls and token counts per module to match your real logs.</p>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-mist p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function NumCell({ v, step, onChange }: { v: number; step: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step={step}
      value={v}
      onChange={(e) => onChange(+e.target.value || 0)}
      className="w-24 rounded-lg border border-line bg-white px-2 py-1 text-sm"
    />
  );
}
