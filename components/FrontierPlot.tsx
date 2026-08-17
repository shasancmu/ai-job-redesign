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
