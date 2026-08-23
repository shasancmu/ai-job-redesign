import { interactionLines, type Direction } from "@/lib/interaction";

// The shape of an idea: the effect of X on Y, drawn at low vs. high Z. The gap
// between the two slopes IS the interaction (b3). "Especially" = the high-Z line
// is steeper; "except" = it flattens.
export default function InteractionPlot({
  xLabel = "X",
  yLabel = "Y",
  zLabel = "Z",
  direction,
}: {
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
  direction: Direction;
}) {
  const W = 420, H = 300;
  const padL = 44, padR = 96, padT = 18, padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const px = (x: number) => padL + x * plotW;
  const py = (v: number) => padT + (1 - v) * plotH;

  const { low, high } = interactionLines(direction);
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const z = clip(zLabel || "Z", 14);

  const region = `${px(low.x0)},${py(low.y0)} ${px(low.x1)},${py(low.y1)} ${px(high.x1)},${py(high.y1)} ${px(high.x0)},${py(high.y0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Effect of ${xLabel} on ${yLabel}, at low vs high ${zLabel}`}>
      {/* interaction region (the gap = b3) */}
      <polygon points={region} fill="#3F7A52" opacity="0.08" />

      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#D2D8CD" strokeWidth="1.5" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#D2D8CD" strokeWidth="1.5" />

      {/* low-Z line (dashed) */}
      <line x1={px(low.x0)} y1={py(low.y0)} x2={px(low.x1)} y2={py(low.y1)} stroke="#93A2B0" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
      <text x={px(low.x1) + 6} y={py(low.y1) + 4} fontSize="11" fill="#6E7A70">Low {z}</text>

      {/* high-Z line (solid sage) */}
      <line x1={px(high.x0)} y1={py(high.y0)} x2={px(high.x1)} y2={py(high.y1)} stroke="#3F7A52" strokeWidth="3" strokeLinecap="round" />
      <text x={px(high.x1) + 6} y={py(high.y1) + 4} fontSize="11" fontWeight="600" fill="#3F7A52">High {z}</text>

      {/* axis labels */}
      <text x={padL + plotW / 2} y={H - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#14283A">{clip(xLabel || "X", 22)} →</text>
      <text x={14} y={padT + plotH / 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="#14283A" transform={`rotate(-90 14 ${padT + plotH / 2})`}>{clip(yLabel || "Y", 22)} →</text>
    </svg>
  );
}
