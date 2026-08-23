"use client";

import { useState } from "react";

// Learning a function from examples. The machine isn't told the rule, it finds
// the line that best fits the data. With few points the line is shaky; with more,
// it locks in. That's statistical learning, and why data is the bottleneck.
const POINTS: [number, number][] = [
  [10, 16], [18, 14], [25, 24], [31, 22], [35, 20], [40, 31], [46, 28], [52, 40],
  [58, 37], [60, 48], [64, 46], [70, 44], [76, 55], [82, 52], [88, 63], [93, 58],
];

function ols(pts: [number, number][]) {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export default function FunctionFitDemo() {
  const [many, setMany] = useState(false);
  const pts = many ? POINTS : POINTS.filter((_, i) => i % 4 === 0);
  const { slope, intercept } = ols(pts);

  const W = 420, H = 260, pad = 30;
  const px = (x: number) => pad + (x / 100) * (W - pad * 2);
  const py = (y: number) => H - pad - (y / 80) * (H - pad * 2);

  return (
    <div className="my-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try it: learning the line from data</div>
      <p className="mt-1 text-sm text-slate-500">Nobody told the machine the rule. It just finds the line that best fits the dots.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1.5" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1.5" />
        <line x1={px(0)} y1={py(intercept)} x2={px(100)} y2={py(slope * 100 + intercept)} stroke="#3F7A52" strokeWidth="2.5" />
        {pts.map((p, i) => <circle key={i} cx={px(p[0])} cy={py(p[1])} r="4" fill="#14283A" />)}
        <text x={W - pad} y={H - 8} textAnchor="end" fontSize="11" fill="#93A2B0">input x →</text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button onClick={() => setMany((m) => !m)} className="btn-ghost text-sm">{many ? "Show fewer examples" : "Add more examples →"}</button>
        <span className="text-xs text-slate-400 tabular-nums">learned rule: y ≈ {slope.toFixed(2)}·x + {intercept.toFixed(0)} &nbsp;·&nbsp; {pts.length} examples</span>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        With four dots the line wobbles; with more it settles. The machine learned the rule <span className="italic">from the data</span>, so its ceiling is the data. A neural network does the same thing, just with a far more flexible curve than a straight line.
      </p>
    </div>
  );
}
