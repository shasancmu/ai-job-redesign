"use client";

import type { ConsoleResult } from "@/lib/regsim/console";

const SAGE = "#3F7A52";
const SLATE = "#93A2B0";
const INK = "#14283A";

function fmt(x: number, d = 3): string {
  if (!isFinite(x)) return "—";
  const a = Math.abs(x);
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return x.toExponential(2);
  return x.toFixed(d).replace(/\.?0+$/, (m) => (m.includes(".") ? "" : m));
}
function pStars(p: number): string {
  if (!isFinite(p)) return "";
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  if (p < 0.1) return ".";
  return "";
}

export default function ResultView({ r }: { r: ConsoleResult }) {
  if (r.type === "text") return <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-ink">{r.lines.join("\n")}</pre>;
  if (r.type === "error") return <div className="rounded-lg bg-red-50 px-3 py-2 font-mono text-[13px] text-red-700">{r.message}</div>;

  if (r.type === "table") {
    return (
      <div className="overflow-x-auto">
        {r.title && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{r.title}</div>}
        <table className="min-w-full font-mono text-[12px] tabular-nums">
          <thead>
            <tr className="border-b border-line text-left text-slate2">
              {r.head.map((h) => <th key={h} className="px-2 py-1 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={i} className="border-b border-line/50">
                {row.map((c, j) => <td key={j} className="px-2 py-1">{typeof c === "number" ? fmt(c) : c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (r.type === "cormatrix") {
    const heat = (v: number) => {
      const a = Math.min(1, Math.abs(v));
      const c = v >= 0 ? [63, 122, 82] : [176, 78, 78];
      return `rgba(${c[0]},${c[1]},${c[2]},${(0.12 + 0.7 * a).toFixed(2)})`;
    };
    return (
      <div className="overflow-x-auto">
        <table className="font-mono text-[11px] tabular-nums">
          <thead>
            <tr>
              <th className="px-2 py-1"></th>
              {r.vars.map((v) => <th key={v} className="px-2 py-1 text-slate2" title={v}>{v.length > 8 ? v.slice(0, 7) + "…" : v}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.vars.map((rowVar, i) => (
              <tr key={rowVar}>
                <td className="px-2 py-1 font-semibold text-slate2" title={rowVar}>{rowVar.length > 12 ? rowVar.slice(0, 11) + "…" : rowVar}</td>
                {r.matrix[i].map((v, j) => (
                  <td key={j} className="px-2 py-1 text-center text-ink" style={{ background: i === j ? "transparent" : heat(v) }}>{i === j ? "1" : fmt(v, 2)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (r.type === "reg") {
    const o = r.ols;
    return (
      <div className="overflow-x-auto">
        <div className="mb-1 font-mono text-[12px] text-slate2">{r.formula}</div>
        <table className="min-w-full font-mono text-[12px] tabular-nums">
          <thead>
            <tr className="border-b border-line text-left text-slate2">
              <th className="px-2 py-1">term</th><th className="px-2 py-1">coef</th><th className="px-2 py-1">std err</th><th className="px-2 py-1">t</th><th className="px-2 py-1">p</th><th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {o.names.map((nm, i) => (
              <tr key={nm} className="border-b border-line/50">
                <td className="px-2 py-1 text-ink">{nm}</td>
                <td className="px-2 py-1">{fmt(o.coef[i])}</td>
                <td className="px-2 py-1 text-slate2">{fmt(o.se[i])}</td>
                <td className="px-2 py-1 text-slate2">{fmt(o.t[i], 2)}</td>
                <td className="px-2 py-1">{fmt(o.p[i], 3)}</td>
                <td className="px-2 py-1 font-bold text-sage">{pStars(o.p[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-1.5 font-mono text-[11px] text-slate-400">
          n = {o.n} · R² = {fmt(o.r2, 3)} · adj R² = {fmt(o.adjR2, 3)} · resid SE = {fmt(o.sigma, 3)} · F = {fmt(o.fstat, 1)} (p {fmt(o.fp, 3)})
        </div>
      </div>
    );
  }

  if (r.type === "hist") {
    const W = 460, H = 160, pad = 24;
    const maxC = Math.max(...r.bins.map((b) => b.count), 1);
    const bw = (W - 2 * pad) / r.bins.length;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={SLATE} strokeWidth="1" />
        {r.bins.map((b, i) => {
          const h = ((H - 2 * pad) * b.count) / maxC;
          return <rect key={i} x={pad + i * bw + 1} y={H - pad - h} width={Math.max(1, bw - 2)} height={h} fill={SAGE} opacity={0.85} />;
        })}
        <text x={pad} y={H - 6} fontSize="10" fill={SLATE}>{fmt(r.bins[0].x0, 2)}</text>
        <text x={W - pad} y={H - 6} fontSize="10" fill={SLATE} textAnchor="end">{fmt(r.bins[r.bins.length - 1].x1, 2)}</text>
        <text x={pad} y={14} fontSize="11" fill={INK} fontWeight="600">{r.varName}</text>
      </svg>
    );
  }

  if (r.type === "scatter" || r.type === "binscatter") {
    const W = 460, H = 300, pad = 34;
    const pts = r.type === "scatter" ? r.points : r.bins.map((b) => [b.x, b.y] as [number, number]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    const sx = (x: number) => pad + ((x - xmin) / (xmax - xmin || 1)) * (W - 2 * pad);
    const sy = (y: number) => H - pad - ((y - ymin) / (ymax - ymin || 1)) * (H - 2 * pad);
    const dot = r.type === "scatter" ? 1.6 : 3.4;
    const op = r.type === "scatter" ? 0.4 : 0.95;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={SLATE} strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke={SLATE} strokeWidth="1" />
        {pts.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={dot} fill={r.type === "scatter" ? SLATE : SAGE} opacity={op} />)}
        <line x1={sx(xmin)} y1={sy(r.fit.intercept + r.fit.slope * xmin)} x2={sx(xmax)} y2={sy(r.fit.intercept + r.fit.slope * xmax)} stroke={SAGE} strokeWidth="2" />
        <text x={pad} y={H - 8} fontSize="10" fill={SLATE}>{fmt(xmin, 2)}</text>
        <text x={W - pad} y={H - 8} fontSize="10" fill={SLATE} textAnchor="end">{fmt(xmax, 2)}</text>
        <text x={W / 2} y={H - 6} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600">{r.xName}</text>
        <text x={6} y={pad + 4} fontSize="10" fill={SLATE}>{fmt(ymax, 2)}</text>
        <text x={6} y={H - pad} fontSize="10" fill={SLATE}>{fmt(ymin, 2)}</text>
        <text x={12} y={16} fontSize="11" fill={INK} fontWeight="600">{r.yName}</text>
      </svg>
    );
  }

  return null;
}
