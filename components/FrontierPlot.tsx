"use client";

// Plots where a task sits on the Generality–Accuracy frontier (Dhar's map):
// x = how predictable / narrow the task is, y = cost per mistake. The three
// bands are the strategic play — automate, copilot (human curates), or adjunct.
const GREEN = "#3F7A52";
const GOLD = "#CE8F2C";
const PLUM = "#7C5CBF";

export function frontierZone(y: number): { key: string; label: string; color: string } {
  if (y >= 70) return { key: "adjunct", label: "Adjunct — AI advises, humans decide", color: PLUM };
  if (y >= 40) return { key: "copilot", label: "Copilot — AI drafts, you curate", color: GOLD };
  return { key: "automate", label: "Automate — let AI run it", color: GREEN };
}

export default function FrontierPlot({
  x,
  y,
  xLabel = "Predictable / narrow →",
  yLabel = "Cost per mistake →",
}: {
  x?: number;
  y?: number;
  xLabel?: string;
  yLabel?: string;
}) {
  const L = 52, R = 344, T = 16, B = 250; // plot box
  const W = R - L, H = B - T;
  const px = (v: number) => L + (Math.max(0, Math.min(100, v)) / 100) * W;
  const py = (v: number) => B - (Math.max(0, Math.min(100, v)) / 100) * H;

  const bands = [
    { lo: 70, hi: 100, color: PLUM, label: "Adjunct" },
    { lo: 40, hi: 70, color: GOLD, label: "Copilot" },
    { lo: 0, hi: 40, color: GREEN, label: "Automate" },
  ];

  const placed = typeof x === "number" && typeof y === "number";
  const zone = placed ? frontierZone(y!) : null;

  return (
    <svg viewBox="0 0 360 300" className="w-full" role="img" aria-label="Frontier plot">
      {/* zone bands */}
      {bands.map((b) => (
        <g key={b.label}>
          <rect x={L} y={py(b.hi)} width={W} height={py(b.lo) - py(b.hi)} fill={b.color} opacity={0.08} />
          <text x={L + 8} y={py(b.hi) + 16} fontSize="10" fontWeight="700" fill={b.color} opacity={0.85} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {b.label}
          </text>
        </g>
      ))}

      {/* frontier line (Dhar): more cost demands more predictability to still automate */}
      <line x1={px(0)} y1={py(0)} x2={px(100)} y2={py(100)} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />

      {/* axes */}
      <line x1={L} y1={T} x2={L} y2={B} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={L} y1={B} x2={R} y2={B} stroke="#cbd5e1" strokeWidth="1" />

      {/* the point */}
      {placed && (
        <g>
          <line x1={px(x!)} y1={B} x2={px(x!)} y2={py(y!)} stroke={zone!.color} strokeWidth="1" strokeDasharray="2 3" opacity={0.5} />
          <circle cx={px(x!)} cy={py(y!)} r="7" fill={zone!.color} stroke="#fff" strokeWidth="2.5" />
        </g>
      )}

      {/* axis labels */}
      <text x={(L + R) / 2} y={293} textAnchor="middle" fontSize="11" fill="#64748b">{xLabel}</text>
      <text x={16} y={(T + B) / 2} textAnchor="middle" fontSize="11" fill="#64748b" transform={`rotate(-90 16 ${(T + B) / 2})`}>{yLabel}</text>
      <text x={L} y={B + 15} fontSize="9" fill="#94a3b8">varied</text>
      <text x={R} y={B + 15} textAnchor="end" fontSize="9" fill="#94a3b8">predictable</text>
    </svg>
  );
}
