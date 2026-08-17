"use client";

// The Generality–Accuracy frontier (Hasan, Oettl & Samila, 2025). Each concave
// curve is a fixed level of COMPLEXITY behind the interface: to reach higher
// generality AND accuracy you must master a higher-complexity (outer) curve.
// A workflow's required (G, A) shows how much hidden complexity it demands.
const CURVE = "#94a3b8";
const AXIS = "#475569";
const GREEN = "#3F7A52";
const GOLD = "#CE8F2C";
const PLUM = "#7C5CBF";

export function complexityLevel(g: number, a: number): { key: string; label: string; color: string } {
  const r = Math.sqrt((g * g + a * a) / 2) / 100; // 0 → ~1
  if (r >= 0.66) return { key: "high", label: "Hidden complexity: high", color: PLUM };
  if (r >= 0.4) return { key: "med", label: "Hidden complexity: moderate", color: GOLD };
  return { key: "low", label: "Hidden complexity: low", color: GREEN };
}

export default function FrontierPlot({
  x,
  y,
  xLabel = "Generality →",
  yLabel = "Accuracy →",
}: {
  x?: number;
  y?: number;
  xLabel?: string;
  yLabel?: string;
}) {
  const ox = 58, oy = 246, W = 280, H = 222; // origin + axis lengths
  const gx = (v: number) => ox + (Math.max(0, Math.min(100, v)) / 100) * W;
  const ay = (v: number) => oy - (Math.max(0, Math.min(100, v)) / 100) * H;

  // Quarter-ellipse arc centered at the origin, bulging up-right (away from O).
  const arc = (f: number) => {
    const rx = f * W, ry = f * H;
    return `M ${ox} ${oy - ry} A ${rx} ${ry} 0 0 1 ${ox + rx} ${oy}`;
  };

  const placed = typeof x === "number" && typeof y === "number";
  const cx = placed ? complexityLevel(x!, y!) : null;

  return (
    <svg viewBox="0 0 360 300" className="w-full" role="img" aria-label="Generality–Accuracy frontier">
      {/* complexity curves (inner = low complexity, outer = high) */}
      {[0.44, 0.68, 0.92].map((f, i) => (
        <path key={i} d={arc(f)} fill="none" stroke={CURVE} strokeWidth="1.5" opacity={0.45 + i * 0.18} />
      ))}
      {/* "more complexity" cue along the diagonal */}
      <text x={gx(72)} y={ay(72)} fontSize="9" fill={CURVE} fontStyle="italic" transform={`rotate(-38 ${gx(72)} ${ay(72)})`}>
        more complexity →
      </text>

      {/* axes with arrowheads */}
      <line x1={ox} y1={oy} x2={ox} y2={ay(100) - 6} stroke={AXIS} strokeWidth="1.5" />
      <line x1={ox} y1={oy} x2={gx(100) + 6} y2={oy} stroke={AXIS} strokeWidth="1.5" />
      <polygon points={`${ox},${ay(100) - 12} ${ox - 4},${ay(100) - 4} ${ox + 4},${ay(100) - 4}`} fill={AXIS} />
      <polygon points={`${gx(100) + 12},${oy} ${gx(100) + 4},${oy - 4} ${gx(100) + 4},${oy + 4}`} fill={AXIS} />

      {/* the workflow point */}
      {placed && cx && (
        <g>
          <line x1={ox} y1={ay(y!)} x2={gx(x!)} y2={ay(y!)} stroke={cx.color} strokeWidth="1" strokeDasharray="2 3" opacity={0.45} />
          <line x1={gx(x!)} y1={oy} x2={gx(x!)} y2={ay(y!)} stroke={cx.color} strokeWidth="1" strokeDasharray="2 3" opacity={0.45} />
          <circle cx={gx(x!)} cy={ay(y!)} r="7" fill={cx.color} stroke="#fff" strokeWidth="2.5" />
          <text x={gx(x!) + 11} y={ay(y!) + 4} fontSize="11" fill="#52514e">your workflow</text>
        </g>
      )}

      {/* axis labels */}
      <text x={ox - 6} y={ay(100) - 2} textAnchor="end" fontSize="12" fill={AXIS} fontWeight="500">{yLabel}</text>
      <text x={gx(100) + 6} y={oy + 20} textAnchor="end" fontSize="12" fill={AXIS} fontWeight="500">{xLabel}</text>
      <text x={ox} y={oy + 20} fontSize="9" fill="#94a3b8">one context</text>
      <text x={gx(100) + 6} y={oy + 33} textAnchor="end" fontSize="9" fill="#94a3b8">many contexts</text>
    </svg>
  );
}

// A plain 2×2 quadrant map (e.g. technical × market uncertainty) — distinct from
// the complexity-curve frontier above. The subject dot sits at (x, y); each
// corner carries a label (often the implied next move / funder). Pure, no hooks,
// so it renders in both the room (client) and the artifact page.
export function QuadrantPlot({
  fr,
  x,
  y,
}: {
  fr: { xLabel: string; yLabel: string; quadrants?: { bl: string; br: string; tl: string; tr: string } };
  x: number;
  y: number;
}) {
  const q = fr.quadrants || { bl: "", br: "", tl: "", tr: "" };
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 340 }}>
      <div className="relative aspect-square rounded-lg border border-line bg-mist/40">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300" />
        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-300" />
        <span className="absolute left-2 top-2 max-w-[47%] text-[10px] leading-tight text-slate-500">{q.tl}</span>
        <span className="absolute right-2 top-2 max-w-[47%] text-right text-[10px] leading-tight text-slate-500">{q.tr}</span>
        <span className="absolute bottom-2 left-2 max-w-[47%] text-[10px] leading-tight text-slate-500">{q.bl}</span>
        <span className="absolute bottom-2 right-2 max-w-[47%] text-right text-[10px] leading-tight text-slate-500">{q.br}</span>
        <div
          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-white"
          style={{ left: `${clamp(x)}%`, top: `${100 - clamp(y)}%` }}
        />
      </div>
      <div className="mt-1.5 text-center text-[11px] text-slate-400">{fr.xLabel}</div>
      <div className="text-center text-[11px] text-slate-400">↑ {fr.yLabel.replace(/[→↑]/g, "").trim()}</div>
    </div>
  );
}
