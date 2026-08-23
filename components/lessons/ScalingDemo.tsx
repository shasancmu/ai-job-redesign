"use client";

import { useState } from "react";

// The scaling law, live: as you pour in more compute (and data and parameters),
// the model's error drops in a straight, predictable line on a log-log plot.
// True within the range we've measured — with real caveats shown below.
export default function ScalingDemo() {
  const [s, setS] = useState(30); // 0..100 → log10(compute) 0..8
  const logC = (s / 100) * 8;
  const loss = 3.4 - 0.3 * logC; // straight line on log-log

  const W = 420, H = 250, pad = 40;
  const px = (lc: number) => pad + (lc / 8) * (W - pad * 2);
  const py = (l: number) => pad + ((3.6 - l) / 3.0) * (H - pad * 2);

  const emerge = logC > 5.5;

  return (
    <div className="my-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try it — the scaling law</div>
      <p className="mt-1 text-sm text-slate-500">Slide up the compute. The error falls in a straight, predictable line.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1.5" />
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1.5" />
        <line x1={px(0)} y1={py(3.4)} x2={px(8)} y2={py(1.0)} stroke="#3F7A52" strokeWidth="2.5" />
        <circle cx={px(logC)} cy={py(loss)} r="6" fill="#CE8F2C" />
        <text x={px(logC)} y={py(loss) - 12} textAnchor="middle" fontSize="11" fontWeight="600" fill="#B07A1E">loss {loss.toFixed(2)}</text>
        <text x={(W) / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#93A2B0">compute (log scale) →</text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize="11" fill="#93A2B0" transform={`rotate(-90 12 ${H / 2})`}>error ↓</text>
      </svg>

      <input type="range" min={0} max={100} value={s} onChange={(e) => setS(parseInt(e.target.value, 10))} className="mt-2 w-full" aria-label="Compute" />
      <div className="mt-1 text-sm font-medium" style={{ color: emerge ? "#3F7A52" : "#6E7A70" }}>
        {emerge ? "At this scale, new abilities show up that weren't there at smaller sizes." : "More compute, lower error — smoothly and predictably."}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        This straight line holds remarkably well over many orders of magnitude — but it's an empirical pattern, not a guarantee. Lower loss is not the same as more capability, high-quality data is finite, returns diminish, and how far it goes is genuinely debated.
      </p>
    </div>
  );
}
